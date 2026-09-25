import { createVoiceBackup } from "../utils/voiceBackup";
import { remoteInterviewView } from "../utils/remoteInterview";
import { voiceInputCapabilities, recordingMimeType } from "../utils/speechCapabilities";
import { authorizedRequest } from "../services/authService";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Mic, Send, Square, Timer, Volume2, VolumeX } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePlacement } from "../context/PlacementContext";
import AnswerFeedback from "../components/AnswerFeedback";
import InterviewWhiteboard from "../components/InterviewWhiteboard";
import { addHistoryEntry } from "../services/history";
import { PASS_PERCENTAGE } from "../utils/assessmentRules";
import { buildInterviewQuestions } from "../data/interviewQuestions";
import { evaluateInterview } from "../services/interviewService";
import { hasAiSpeechSupport, synthesizeInterviewSpeech, transcribeInterviewAudio } from "../services/speechService";
import { markDailyQuestionActivity } from "../services/dailyActivity";
import { countAnswerWords, isInterviewAnswerComplete, MIN_INTERVIEW_WORDS } from "../utils/interviewAnswers";
import { createInterviewSession, INTERVIEW_SESSION_KEY, normalizeInterviewSession } from "../utils/interviewSession";
import { getAccountStorageKey } from "../utils/storage";
import { saveLocalInterviewResult } from "../utils/interviewResultStorage";
import { getRemainingInterviewSeconds } from "../utils/interviewTiming";
import { generateQuestionBatch } from "../services/questionService";
import { rememberInterviewQuestions } from "../services/interviewQuestionHistory";

const EMPTY_CONFIG = Object.freeze({});
const EMPTY_QUESTIONS = Object.freeze([]);

function transcriptionErrorMessage(error) {
  const message = typeof error?.message === "string" ? error.message.trim() : "";
  return message || "Your recording could not be transcribed. Please try again or type your answer.";
}

function Interview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { placementState, passInterview, applyServerPlacement } = usePlacement();
  const sessionKey = getAccountStorageKey(INTERVIEW_SESSION_KEY, user);
  const [session] = useState(() => {
    if (location.state?.config) {
      try {
        const saved = normalizeInterviewSession(JSON.parse(sessionStorage.getItem(sessionKey)));
        if (saved?.config.createdAt === location.state.config.createdAt) return saved;
      } catch { /* Use navigation state if tab storage is unavailable. */ }
      return createInterviewSession(location.state.config, location.state.generatedQuestions);
    }
    try {
      const restored = normalizeInterviewSession(JSON.parse(sessionStorage.getItem(sessionKey)));
      if (restored) return restored;
      const legacyConfig = JSON.parse(sessionStorage.getItem("interviewConfig"));
      return legacyConfig ? createInterviewSession(legacyConfig, buildInterviewQuestions(legacyConfig)) : null;
    } catch {
      return null;
    }
  });
  const [remoteSession, setRemoteSession] = useState(null);
  const [restoring, setRestoring] = useState(Boolean(session?.config.remoteSessionId));
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const config = useMemo(() => remoteSession ? { ...remoteSession.config, remoteSessionId: remoteSession.id, createdAt: remoteSession.startedAt } : session?.config || EMPTY_CONFIG, [remoteSession, session]);
  const [questions, setQuestions] = useState(() => session?.questions || EMPTY_QUESTIONS);
  const whiteboardStorageKey = getAccountStorageKey(`prepmentor_interview_whiteboard:${config.createdAt || "draft"}`, user);
  const [index, setIndex] = useState(() => session?.index || 0);
  const [answers, setAnswers] = useState(() => session?.answers || {});
  const [submitting, setSubmitting] = useState(false);
  const requestLock = useRef(false);
  const [answerFeedback, setAnswerFeedback] = useState(null);
  const [generatingNext, setGeneratingNext] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(() => getRemainingInterviewSeconds(config.createdAt, config.duration));
  const recognitionRef = useRef(null);
  const voiceBackupRef = useRef(null);
  const recognitionStopRef = useRef(null);
  const [microphoneSignal, setMicrophoneSignal] = useState(null);
  const recorderRef = useRef(null);
  const recorderStreamRef = useRef(null);
  const questionAudioRef = useRef(null);
  const speechCacheRef = useRef(null);
  const audioChunksRef = useRef([]);
  const activityMarkedRef = useRef(false);
  const [capabilities, setCapabilities] = useState({ llm: false, stt: false, tts: false });
  const [requestingPermission, setRequestingPermission] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([hasAiSpeechSupport("llm"), hasAiSpeechSupport("stt"), hasAiSpeechSupport("tts")]).then(([llm, stt, tts]) => { if (active) setCapabilities({ llm, stt, tts }); });
    return () => { active = false; };
  }, []);
  const recordingPendingRef = useRef(false);
  const backendVoiceUnavailableRef = useRef(false);
  const browserVoiceUnavailableRef = useRef(false);
  const answerSourcesRef = useRef({});
  const [recordingState, setRecordingState] = useState("idle");
  const mountedRef = useRef(true);
  useEffect(()=>{mountedRef.current=true;return()=>{mountedRef.current=false;};},[]);
  const playbackVersionRef = useRef(0);
  const [transcribing, setTranscribing] = useState(false);
  const voiceCapabilities = voiceInputCapabilities(capabilities);
  const speechSupported = voiceCapabilities.available;
  const remoteView = remoteSession ? remoteInterviewView(remoteSession, Boolean(answerFeedback)) : null;
  const currentQuestion = config.remoteSessionId ? remoteView?.question : questions[index];
  const answer = answers[index] || "";
  const remainingTime = `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;

  useEffect(() => {
    const startedAt = Date.parse(config.createdAt);
    if (!Number.isFinite(startedAt)) return undefined;
    const updateRemaining = () => setRemainingSeconds(getRemainingInterviewSeconds(config.createdAt, config.duration));
    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [config.createdAt, config.duration]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("prepmentor:interview-voice-state", {
      detail: { speaking, listening, transcribing },
    }));
  }, [listening, speaking, transcribing]);

  useEffect(() => {
    if (isInterviewAnswerComplete(answer) && !activityMarkedRef.current) {
      activityMarkedRef.current = true;
      markDailyQuestionActivity();
    }
  }, [answer]);

  useEffect(() => {
    if (!config.role) navigate("/interview/setup", { replace: true });
  }, [config.role, navigate]);

  useEffect(() => {
    if (!config.createdAt || (!config.remoteSessionId && !questions.length)) return;
    try {
      sessionStorage.setItem(sessionKey, JSON.stringify({
        config,
        questions,
        index,
        answers,
      }));
    } catch {
      // The active interview still works if tab storage is unavailable.
    }
  }, [answers, config, index, questions, sessionKey]);

  const finishRemote = useCallback((remote) => {
    saveLocalInterviewResult(remote.result, user);
    if (remote.config.mode === "placement") {
      authorizedRequest("/api/placement").then(({ placementState: progress }) => applyServerPlacement(progress)).catch(() => {});
    }
    try {
      sessionStorage.removeItem(sessionKey);
      sessionStorage.removeItem(`${sessionKey}:reviewed`);
      sessionStorage.removeItem(whiteboardStorageKey);
    } catch { /* Completion remains available without browser storage. */ }
    navigate(`/interview/result/${remote.result.id}`, { replace: true });
  }, [navigate, sessionKey, user, whiteboardStorageKey, applyServerPlacement]);


  useEffect(() => {
    if (!config.remoteSessionId) return;
    let active = true;
    authorizedRequest(`/api/interview-sessions/${config.remoteSessionId}`).then(({session:remote})=>{
      if(!active)return;
      let reviewed;
      try { reviewed = sessionStorage.getItem(`${sessionKey}:reviewed`); } catch { /* Show unreviewed feedback. */ }
      const view = remoteInterviewView(remote, reviewed !== String(remote.turns.length));
      if (view.completed) { finishRemote(remote); return; }
      setRemoteSession(remote);
      setAnswerFeedback(view.feedback);
      setIndex(view.index);
      setAnswers((current) => ({ ...current, ...view.answers }));
      setSubmitError("");
      setRestoring(false);
    }).catch((error)=>{if(active){setSubmitError(error.message);setRestoring(false);}});
    return ()=>{active=false;};
  },[config.remoteSessionId,sessionKey,restoreAttempt,finishRemote]);


  async function recoverRemote(error) {
    if (error.status === 409 || error.status === 0) {
      setRestoring(true);
      setRestoreAttempt((value) => value + 1);
    }
    setSubmitError(error.status === 0 ? "Connection lost. Your answer is preserved. Retry when connected." : error.message || "Unable to submit this response. Please retry.");
  }

  const speakWithBrowser = useCallback((text) => {
    if (!("speechSynthesis" in window)) {
      setSpeechError("Audio playback is unavailable in this browser. You can still read and answer the question.");
      return;
    }
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    window.speechSynthesis.cancel();
    const version = playbackVersionRef.current;
    try {
      const prompt = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      prompt.voice = voices.find((voice) => voice.lang === "en-IN") || voices.find((voice) => voice.lang.startsWith("en")) || null;
      prompt.lang = prompt.voice?.lang || "en-IN";
      prompt.rate = 0.95;
      prompt.onstart = () => { if (mountedRef.current && version === playbackVersionRef.current) setSpeaking(true); };
      prompt.onend = () => { if (mountedRef.current && version === playbackVersionRef.current) setSpeaking(false); };
      prompt.onerror = () => {
        if (!mountedRef.current || version !== playbackVersionRef.current) return;
        setSpeaking(false);
        setSpeechError("Audio could not play. Check this tab's sound permission, or read the text on screen.");
      };
      window.speechSynthesis.speak(prompt);
    } catch {
      setSpeaking(false);
      setSpeechError("Audio could not play. You can read the question and type your answer.");
    }
  }, []);

  const speakQuestion = useCallback(async () => {
    if (!currentQuestion || restoring) return;
    const version = ++playbackVersionRef.current;
    const text = answerFeedback
      ? [`Your answer scored ${answerFeedback.score} out of 100.`, answerFeedback.feedback, ...(answerFeedback.improvements || []).slice(0, 2).map((item) => `To improve: ${item}`)].filter(Boolean).join(" ").slice(0, 4000)
      : `Question ${index + 1}. ${currentQuestion.question}`;
    recognitionRef.current?.stop();
    questionAudioRef.current?.pause();
    window.speechSynthesis?.cancel();
    setSpeechError("");
    try {
      if (remoteSession?.fallbackUsed || !(await hasAiSpeechSupport("tts"))) {
        if(version !== playbackVersionRef.current)return;
        speakWithBrowser(text);
        return;
      }
      const response = answerFeedback && speechCacheRef.current?.text === text ? speechCacheRef.current.response : await synthesizeInterviewSpeech(text);
      if (answerFeedback && version === playbackVersionRef.current) speechCacheRef.current = { text, response };
      if (version !== playbackVersionRef.current) return;
      const audio = new Audio(`data:${response.mimeType || "audio/mpeg"};base64,${response.audio}`);
      questionAudioRef.current = audio;
      audio.onplay = () => setSpeaking(true);
      audio.onended = () => { setSpeaking(false); questionAudioRef.current = null; };
      audio.onerror = () => { if(version !== playbackVersionRef.current)return; setSpeaking(false); questionAudioRef.current = null; speakWithBrowser(text); };
      await audio.play();
    } catch {
      if (version !== playbackVersionRef.current || !mountedRef.current) return;
      speakWithBrowser(text);
    }
  }, [index, currentQuestion, restoring, speakWithBrowser, answerFeedback, remoteSession]);

  const stopSpeaking = () => {
    playbackVersionRef.current += 1;
    questionAudioRef.current?.pause();
    questionAudioRef.current = null;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  };

  useEffect(() => {
    if (generatingNext || submitting) return;
    const playbackTimer = window.setTimeout(speakQuestion, 0);
    return () => {
      window.clearTimeout(playbackTimer);
      playbackVersionRef.current += 1;
      questionAudioRef.current?.pause();
      questionAudioRef.current = null;
      window.speechSynthesis?.cancel();
    };
  }, [speakQuestion, answerFeedback, generatingNext, submitting]);

  useEffect(() => () => {
    clearTimeout(recognitionStopRef.current);
    voiceBackupRef.current?.cancel();
    recognitionRef.current?.abort();
    questionAudioRef.current?.pause();
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const stopListening = () => {
    if (recognitionRef.current) {
      setRecordingState("stopping");
      const recognition = recognitionRef.current;
      recognitionStopRef.current = window.setTimeout(() => {
        recognition.onend?.();
        try { recognition.abort(); } catch { /* Release the UI even if Chrome stalls. */ }
      }, 2000);
      try { recognition.stop(); } catch { recognition.onend?.(); }
      return;
    }
    if (recorderRef.current?.state === "recording") {
      setTranscribing(true);
      setRecordingState("stopping");
      recorderRef.current.stop();
    }
    setListening(false);
  };

  const startAiRecording = async () => {
    if (!(await hasAiSpeechSupport())) {

      backendVoiceUnavailableRef.current = true;
      await startBrowserRecognition(true);
      return;
    }
    if (!window.MediaRecorder || !navigator.mediaDevices?.getUserMedia) {
      setSpeechError("Audio recording is unavailable in this browser. Use current Chrome or Edge, or type your response.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if(!mountedRef.current){stream.getTracks().forEach((track)=>track.stop());return;}
      recorderStreamRef.current = stream;
      const mimeType = recordingMimeType(window.MediaRecorder);
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      audioChunksRef.current = [];
      const questionIndex = index;
      recorder.ondataavailable = (event) => { if (event.data.size) { audioChunksRef.current.push(event.data); if (audioChunksRef.current.reduce((size, chunk) => size + chunk.size, 0) > 6_000_000 && recorder.state === "recording") recorder.stop(); } };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        recorderStreamRef.current = null;
        if(!mountedRef.current)return;
        setListening(false);
        setTranscribing(true);
        setRecordingState("uploading");
        let needsBrowserFallback = false;
        try {
          const response = await transcribeInterviewAudio(new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" }), () => setRecordingState("transcribing"));
          if(!mountedRef.current)return;
          answerSourcesRef.current[questionIndex] = "voice";
          setRecordingState("ready");
          setAnswers((current) => ({ ...current, [questionIndex]: [current[questionIndex], response.transcript].filter(Boolean).join(" ") }));
          setSpeechError("");
        } catch (error) {
          // A quota, timeout, or temporary provider error must not disable voice
          // input for the rest of the interview. The next attempt may succeed.
          setSpeechError(transcriptionErrorMessage(error));
          needsBrowserFallback = true;
        } finally {
          if (mountedRef.current) setTranscribing(false);
          recorderRef.current = null;
          recorderStreamRef.current = null;
        }
        if (needsBrowserFallback && mountedRef.current) {
          recordingPendingRef.current = true;
          setRequestingPermission(true);
          try { await startBrowserRecognition(true); } finally {
            recordingPendingRef.current = false;
            if (mountedRef.current) setRequestingPermission(false);
          }
        }
      };
      recorder.onerror = () => {
        recorder.onstop = null;
        if (recorder.state === "recording") recorder.stop();
        stream.getTracks().forEach((track) => track.stop());
        recorderRef.current = null;
        recorderStreamRef.current = null;
        if (mountedRef.current) { setRecordingState("error"); setTranscribing(false); setListening(false); setSpeechError("Recording failed. Please retry or type your answer."); }
      };
      recorder.start(1000);
      setRecordingState("recording");
      setSpeechError("Recording your answer. Press Stop listening to transcribe it into the answer box.");
      setListening(true);
    } catch (error) {
      recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
      recorderRef.current = null;
      recorderStreamRef.current = null;
      setRecordingState("error");
      setSpeechError(error.name === "NotFoundError" ? "No working microphone was found." : "Microphone access is blocked. Allow microphone permission in the browser address bar, then try again.");
    }
  };

  const startListening = async () => {
    if(listening || transcribing || recorderRef.current || recordingPendingRef.current)return;
    recordingPendingRef.current=true;
    setRequestingPermission(true);
    setRecordingState("requesting-permission");
    setMicrophoneSignal(null);
    try {await startListeningInternal();}finally{recordingPendingRef.current=false;if(mountedRef.current)setRequestingPermission(false);}
  };

  const startListeningInternal = async () => {
    if (listening || transcribing) return;
    stopSpeaking();
    setSpeechError("");
    if (voiceCapabilities.recognition && !browserVoiceUnavailableRef.current) {
      await startBrowserRecognition();
      return;
    }
    if (voiceCapabilities.backend && !backendVoiceUnavailableRef.current) {
      await startAiRecording();
      return;
    }
    await startBrowserRecognition();
  };

  const startBrowserRecognition = async (recovering = false) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || browserVoiceUnavailableRef.current) {
      setRecordingState("error");
      setListening(false);
      setSpeechError("Voice transcription is unavailable. Type your answer instead.");
      return;
    }
    if (recovering) setSpeechError("Browser voice is active. Please repeat your answer.");
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!mountedRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
        voiceBackupRef.current = createVoiceBackup(stream, (heard) => { if (mountedRef.current) setMicrophoneSignal(heard); });
      }
    } catch (error) {
      recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
      recorderRef.current = null;
      recorderStreamRef.current = null;
      setRecordingState("error");
      setSpeechError(error.name === "NotFoundError" ? "No working microphone was found." : "Microphone access is blocked. Allow microphone permission in the browser address bar, then try again.");
      return;
    }
    if (!mountedRef.current) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = navigator.language || "en-IN";
    const questionIndex = index;
    let originalAnswer;
    let ended = false;
    let receivedText = false;
    let recognitionError = "";
    const backup = voiceBackupRef.current;
    recognition.onresult = (event) => {
      if (!mountedRef.current || ended) return;
      // Results include all final and interim segments for this recognition run.
      // Replace that run's text so revised partials never accumulate duplicates.
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();
      if (!transcript) return;
      receivedText = true;
      answerSourcesRef.current[questionIndex] = "voice";
      setSpeechError("");
      setAnswers((current) => {
        originalAnswer ??= current[questionIndex] || "";
        return { ...current, [questionIndex]: [originalAnswer, transcript].filter(Boolean).join(" ") };
      });
    };
    const finishRecognition = async () => {
      if (ended) return;
      ended = true;
      clearTimeout(recognitionStopRef.current);
      recognitionRef.current = null;
      if (!mountedRef.current) { backup?.cancel(); return; }
      setListening(false);
      setTranscribing(true);
      setRecordingState("transcribing");
      try {
        const audio = await backup?.finish();
        if (!mountedRef.current) return;
        if (receivedText) { setRecordingState("ready"); return; }
        if (audio?.size && backup?.heardAudio !== false && capabilities.stt && !backendVoiceUnavailableRef.current) {
          setSpeechError("Converting your recording to text...");
          const response = await transcribeInterviewAudio(audio);
          if (!mountedRef.current) return;
          if (!response.transcript?.trim()) throw new Error("Empty transcript");
          answerSourcesRef.current[questionIndex] = "voice";
          setAnswers((current) => ({ ...current, [questionIndex]: [current[questionIndex], response.transcript].filter(Boolean).join(" ") }));
          setSpeechError("");
          setRecordingState("ready");
          return;
        }
        setRecordingState("error");
        setSpeechError(backup?.heardAudio === false
          ? "No microphone sound was detected. Check Chrome's selected microphone and your microphone mute switch, then try again."
          : recognitionError || "Chrome returned no speech text. Check the selected microphone in Chrome, then try again or type your answer.");
      } catch (error) {
        if (!mountedRef.current) return;
        setRecordingState("error");
        setSpeechError(backup?.heardAudio === false
          ? "No microphone sound was detected. Check Chrome's selected microphone and your microphone mute switch, then try again."
          : transcriptionErrorMessage(error));
      } finally {
        if (voiceBackupRef.current === backup) voiceBackupRef.current = null;
        if (mountedRef.current) setTranscribing(false);
      }
    };
    recognition.onerror = (event) => {
      if (!mountedRef.current || ended) return;
      const messages = {
        "not-allowed": "Microphone permission was denied. Allow microphone access in Chrome or type your answer.",
        "audio-capture": "No working microphone was found. Check Chrome's microphone settings.",
        "no-speech": "Chrome did not detect speech. Check the selected microphone, then try again.",
        network: "Chrome's speech service could not connect. Check your connection or type your answer.",
      };
      if (["network", "service-not-allowed", "language-not-supported"].includes(event.error)) browserVoiceUnavailableRef.current = true;
      recognitionError = messages[event.error] || "Voice input stopped unexpectedly. You can continue typing.";
      if (receivedText) setSpeechError(recognitionError);
      void finishRecognition();
    };
    recognition.onend = () => { void finishRecognition(); };
    recognitionRef.current = recognition;
    try {
      setRecordingState("recording");
      setListening(true);
      recognition.start();
    } catch {
      recognitionError = "Voice input could not start. Check microphone access in Chrome.";
      void finishRecognition();
    }
  };

  const advanceInterview = async () => {
    if (requestLock.current || answerFeedback || generatingNext || submitting || transcribing || listening || requestingPermission || restoring) return;
    if (!currentAnswerComplete) {
      setSubmitError(`Give a complete response of at least ${MIN_INTERVIEW_WORDS} words before continuing.`);
      return;
    }
    if (listening) stopListening();
    setSpeechError("");
    setSubmitError("");
    requestLock.current = true;
    stopSpeaking();
    setGeneratingNext(true);
    try {
      if (config.remoteSessionId) {
        const {session:remote}=await authorizedRequest(`/api/interview-sessions/${config.remoteSessionId}/answer`, {method:"POST",timeoutMs:120000,body:JSON.stringify({version: remoteSession.version, answerSource: answerSourcesRef.current[index] || "typed", turnIndex:remoteSession.turns.length,transcript:answer})});
        if(remote.result){finishRemote(remote);return;}
        remoteInterviewView(remote);
        setRemoteSession(remote);
        if (config.mode !== "placement" && remote.turns.at(-1)?.answerEvaluation) setAnswerFeedback(remote.turns.at(-1).answerEvaluation);
        else setIndex((current)=>current+1);
        return;
      }
      const response = await generateQuestionBatch({
        kind: "interview",
        count: 1,
        difficulty: String(config.difficulty || "medium").toLowerCase(),
        role: config.role,
        category: `${config.interviewType}: ${(config.focusAreas || []).join(", ")}`,
        previousQuestion: currentQuestion.question,
        previousAnswer: answer,
        excludedQuestions: questions.map((item) => item.question),
      });
      const nextQuestion = response.questions[0];
      setQuestions((current) => current.map((item, questionIndex) => questionIndex === index + 1 ? nextQuestion : item));
      rememberInterviewQuestions([nextQuestion]);
    } catch (error) {
      if (config.remoteSessionId) { await recoverRemote(error); return; }
      // Keep the unseen offline question so interviews continue without an LLM connection.
    } finally {
      requestLock.current = false;
      setGeneratingNext(false);
    }
    if (config.mode !== "placement") setAnswerFeedback({ score: currentAnswerComplete ? 100 : 0, strengths: [], improvements: ["Support your explanation with an example and clear reasoning."], feedback: "Offline response-completeness rubric only. Correctness and relevance have not been assessed.", source: "Offline response-completeness rubric", idealAnswer: null });
    else setIndex((current) => Math.min(current + 1, questions.length - 1));
  };

  const currentAnswerComplete = config.remoteSessionId ? Boolean(answer.trim()) && answer.length <= 10000 : isInterviewAnswerComplete(answer);
  const interviewShouldEnd = remainingSeconds === 0 || (!config.remoteSessionId && index === questions.length - 1);

  const submit = async () => {
    if (requestLock.current || answerFeedback || submitting || generatingNext || transcribing || listening || requestingPermission || restoring) return;
    if (!currentAnswerComplete) {
      setSubmitError(`Complete your current response before finishing the interview.`);
      return;
    }
    if (listening) stopListening();
    requestLock.current = true;
    stopSpeaking();
    setSubmitting(true);
    setSubmitError("");
    try {
    if (config.remoteSessionId) {
      const { session: remote } = await authorizedRequest(`/api/interview-sessions/${config.remoteSessionId}/answer`, { method: "POST", timeoutMs: 120000, body: JSON.stringify({ version: remoteSession.version, answerSource: answerSourcesRef.current[index] || "typed", turnIndex: remoteSession.turns.length, transcript: answer, finish: true }) });
      remoteInterviewView(remote);
      if (remote.result) finishRemote(remote);
      return;
    }
    const askedQuestions = questions.slice(0, index + 1);
    const evaluation = config.remoteSessionId ? (await authorizedRequest(`/api/interview-sessions/${config.remoteSessionId}/answer`,{method:"POST",timeoutMs:120000,body:JSON.stringify({version: remoteSession.version, answerSource: answerSourcesRef.current[index] || "typed", turnIndex:remoteSession.turns.length,transcript:answer,finish:true})})).session.result : await evaluateInterview({ config, questions: askedQuestions, answers });
    const score = evaluation.score;
    const id = evaluation.id || `local-${config.createdAt}`;
    const result = { ...evaluation, id, createdAt: evaluation.createdAt || config.createdAt };
    saveLocalInterviewResult(result, user);
    const topicPerformance = Object.entries(result.metrics || {}).flatMap(([topic, value]) => Number.isFinite(Number(value)) ? [{ topic: topic.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (letter) => letter.toUpperCase()), percentage: Math.max(0, Math.min(100, Math.round(Number(value)))) }] : []);
    addHistoryEntry({ id, title: `${result.role} Interview`, type: "Interview", mode: config.mode || "practice", score, duration: `${config.duration || 30} min`, role: result.role, createdAt: result.createdAt, evaluationMode: result.evaluationMode, evidenceType: evaluation.id ? "server-assessment" : "self-reported", topicPerformance }, { sync: !evaluation.id });
    if (config.mode === "placement" && placementState.interview.status === "available" && score >= PASS_PERCENTAGE && (evaluation.evaluationMode?.startsWith("AI semantic") || evaluation.evaluationMode === "Local deterministic interview rubric")) passInterview();
    try {
      sessionStorage.removeItem(sessionKey);
      sessionStorage.removeItem(whiteboardStorageKey);
    } catch {
      // Completion should not fail when tab storage is unavailable.
    }
    navigate(`/interview/result/${id}`);
    } catch (error) {
      await recoverRemote(error);
      requestLock.current = false;
      setSubmitting(false);
    }
  };

  if (!config.role) return null;
  if (restoring || !currentQuestion) return <section className="surface-card rounded-3xl p-8"><p role="status">{restoring ? "Restoring your interview..." : "Unable to load the interview."}</p>{submitError && <p role="alert">{submitError}</p>}<button type="button" disabled={restoring} onClick={() => { setRestoring(true); setRestoreAttempt((value) => value + 1); }}>Retry loading session</button></section>;

  return <div className="mx-auto max-w-5xl space-y-6"><header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-500"/><p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Live · {config.role} · {currentQuestion?.focus || "General"}</p></div><h1 className="mt-1 text-3xl font-extrabold tracking-tight">Interview in progress</h1></div><div className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-2.5 dark:bg-gray-900 ${remainingSeconds<=60?"border-rose-300 text-rose-600 dark:border-rose-900":"border-gray-200 dark:border-gray-700"}`}><Timer size={18} className={remainingSeconds<=60?"text-rose-500":"text-indigo-500"} /><div><p className="font-mono text-sm font-black tabular-nums">{remainingTime}</p><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Time remaining</p></div></div></header>
    <div><div className="mb-2 flex items-center justify-between text-xs font-bold text-gray-500"><span>Interview time</span><span>{remainingSeconds===0?"Complete this response to finish":`${config.duration} minute session`}</span></div><div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800" role="progressbar" aria-label="Interview time remaining" aria-valuemin="0" aria-valuemax={config.duration*60} aria-valuenow={remainingSeconds}><div className={`h-full rounded-full transition-all duration-1000 ${remainingSeconds<=60?"bg-rose-500":"bg-gradient-to-r from-indigo-600 to-violet-500"}`} style={{width:`${(remainingSeconds/(config.duration*60))*100}%`}}/></div><div className="mt-4 inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-500 dark:bg-gray-800"><span className="h-2 w-2 rounded-full bg-indigo-500"/>Question {index+1}</div><p className="mt-3 text-xs font-semibold text-gray-400">The number of questions adapts to your response speed and remains hidden.</p></div>
    {remoteSession && <p role="status" className="text-sm font-bold text-indigo-600 dark:text-indigo-300">Evaluation source: {remoteSession.fallbackUsed ? "Local Backup ? deterministic demo scoring" : remoteSession.providerUsed === "gemini" ? "Gemini" : "AI provider"}</p>}
    {answerFeedback ? <AnswerFeedback evaluation={answerFeedback} speaking={speaking} speechError={speechError} onReplay={speakQuestion} onStop={stopSpeaking} onNext={()=>{stopSpeaking();try{sessionStorage.setItem(`${sessionKey}:reviewed`,String(index+1));}catch{/* Feedback still advances. */}setAnswerFeedback(null);setIndex((current)=>current+1);}}/> : <section className="surface-card rounded-3xl p-6 sm:p-9"><div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><Mic size={23}/></div><div><p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">Question {index+1}</p><h2 className="mt-3 text-xl font-bold leading-8 sm:text-2xl">{currentQuestion.question}</h2></div></div><InterviewWhiteboard storageKey={whiteboardStorageKey}/><label className="mt-8 block"><span className="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300">Your response</span><textarea id="interview-answer" readOnly={listening || requestingPermission} disabled={generatingNext||submitting} value={answer} onChange={(e)=>setAnswers((old)=>({...old,[index]:e.target.value}))} rows="9" placeholder="Structure your answer clearly. Use a specific example when possible…" className="w-full resize-none rounded-2xl border border-gray-200 bg-white p-5 leading-7 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-900"/></label><div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div>{speechSupported?<button type="button" disabled={generatingNext||submitting||transcribing||requestingPermission} onClick={listening?stopListening:startListening} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${listening?"bg-rose-600 text-white shadow-lg shadow-rose-600/20":"border border-gray-200 text-gray-700 hover:border-indigo-300 hover:text-indigo-600 dark:border-gray-700 dark:text-gray-200"}`}>{listening?<><Square size={15} fill="currentColor"/> Stop listening</>:<><Mic size={16}/> Answer with voice</>}</button>:<p className="text-xs text-gray-400">Voice input is unavailable in this browser; typing remains available.</p>}{listening && microphoneSignal !== null && <span className="ml-3 text-xs text-gray-500">{microphoneSignal ? "Microphone is detecting sound" : "No microphone sound detected yet"}</span>}{listening&&<span role="status" className="ml-3 inline-flex items-center gap-2 text-xs font-bold text-rose-600"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-500"/>Recording...</span>}</div><div className="flex items-center justify-between gap-4 text-xs text-gray-400"><span>{config.remoteSessionId ? "You can edit your transcript before submitting." : `${MIN_INTERVIEW_WORDS}+ words counts as complete.`}</span><span className={isInterviewAnswerComplete(answer)?"font-bold text-emerald-600":""}>{countAnswerWords(answer)} words</span></div></div>
      {(transcribing || requestingPermission) && <p role="status" data-recording-state={recordingState}>{recordingState === "uploading" ? "Uploading audio..." : transcribing ? "Transcribing..." : "Requesting microphone permission..."}</p>}{speechError&&<div className="mt-4 text-sm text-gray-500"><p role="status">{speechError}</p><button type="button" className="mt-2 font-semibold text-indigo-600" onClick={()=>{stopListening();setSpeechError("");document.getElementById("interview-answer")?.focus();}}>Type answer instead</button></div>}{submitError&&<p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{submitError}</p>}<div className="mt-6 flex flex-col items-end gap-3"><p className={`text-xs font-bold ${currentAnswerComplete?"text-emerald-600":"text-amber-600"}`}>{currentAnswerComplete?interviewShouldEnd?"Response complete — ready to finish.":"Response complete — ready for the next question.":config.remoteSessionId ? "Enter your answer to continue." : `${Math.max(0,MIN_INTERVIEW_WORDS-countAnswerWords(answer))} more words required to continue.`}</p>{interviewShouldEnd?<button type="button" disabled={submitting||!currentAnswerComplete||listening||transcribing} onClick={submit} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"><Send size={17}/> {submitting?"Evaluating…":"Finish live interview"}</button>:<button type="button" disabled={!currentAnswerComplete||listening||transcribing||generatingNext} onClick={advanceInterview} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">{generatingNext?"Evaluating answer and preparing follow-up...":config.remoteSessionId?"Submit Answer":"Continue"} <ArrowRight size={17}/></button>}</div>
      {config.remoteSessionId && !interviewShouldEnd && <button type="button" disabled={!currentAnswerComplete || generatingNext || submitting || listening || transcribing || requestingPermission} onClick={submit} className="mt-5 rounded-xl border px-3 py-2 text-sm font-bold">Finish interview after this answer</button>}
      <p className="mt-4 text-xs text-gray-500">Question audio may use an AI-generated voice.</p>
      <button type="button" disabled={listening || transcribing || requestingPermission} onClick={speaking?stopSpeaking:speakQuestion} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-indigo-600 dark:border-gray-700 dark:text-indigo-300">{speaking?<><VolumeX size={16}/> Stop spoken question</>:<><Volume2 size={16}/> Replay spoken question</>}</button>
    </section>}</div>;
}

export default Interview;

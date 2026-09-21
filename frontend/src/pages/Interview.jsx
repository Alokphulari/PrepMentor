import { authorizedRequest } from "../services/authService";
import { useCallback, useEffect, useRef, useState } from "react";
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

function Interview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { placementState, passInterview } = usePlacement();
  const sessionKey = getAccountStorageKey(INTERVIEW_SESSION_KEY, user);
  const [session] = useState(() => {
    if (location.state?.config) return createInterviewSession(location.state.config, location.state.generatedQuestions);
    try {
      const restored = normalizeInterviewSession(JSON.parse(sessionStorage.getItem(sessionKey)));
      if (restored) return restored;
      const legacyConfig = JSON.parse(sessionStorage.getItem("interviewConfig"));
      return legacyConfig ? createInterviewSession(legacyConfig, buildInterviewQuestions(legacyConfig)) : null;
    } catch {
      return null;
    }
  });
  const config = session?.config || EMPTY_CONFIG;
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
  const recorderRef = useRef(null);
  const recorderStreamRef = useRef(null);
  const questionAudioRef = useRef(null);
  const audioChunksRef = useRef([]);
  const activityMarkedRef = useRef(false);
  const [useAiTranscription, setUseAiTranscription] = useState(false);
  const recordingPendingRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(()=>{mountedRef.current=true;return()=>{mountedRef.current=false;};},[]);
  const playbackVersionRef = useRef(0);
  const [transcribing, setTranscribing] = useState(false);
  const speechSupported = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition || window.MediaRecorder);
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
    if (!config.createdAt || !questions.length) return;
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

  useEffect(() => {
    if (!config.remoteSessionId) return;
    let active = true;
    authorizedRequest(`/api/interview-sessions/${config.remoteSessionId}`).then(({session:remote})=>{
      if(!active)return;
      if(remote.result){saveLocalInterviewResult(remote.result,user);navigate(`/interview/result/${remote.result.id}`,{replace:true});return;}
      const previous = remote.turns.at(-1)?.answerEvaluation;
      const showFeedback = remote.config.mode !== "placement" && previous && sessionStorage.getItem(`${sessionKey}:reviewed`) !== String(remote.turns.length);
      setAnswerFeedback(showFeedback ? previous : null);
      setIndex(showFeedback ? remote.turns.length - 1 : remote.turns.length);
      setQuestions((current)=>current.map((item,i)=>i<remote.turns.length?remote.turns[i]:i===remote.turns.length?remote.currentQuestion:item));
      setAnswers((current)=>({...current,...Object.fromEntries(remote.turns.map((turn,i)=>[i,turn.transcript]))}));
    }).catch((error)=>{if(active)setSubmitError(error.message);});
    return ()=>{active=false;};
  },[config.remoteSessionId,navigate,user,sessionKey]);

  const speakWithBrowser = useCallback((text) => {
    if (!("speechSynthesis" in window)) {
      setSpeechError("Audio playback is unavailable in this browser. You can still read and answer the question.");
      return;
    }
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    window.speechSynthesis.cancel();
    const prompt = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    prompt.voice = voices.find((voice) => voice.lang === "en-IN") || voices.find((voice) => voice.lang.startsWith("en")) || null;
    prompt.lang = prompt.voice?.lang || "en-IN";
    prompt.rate = 0.95;
    prompt.onstart = () => setSpeaking(true);
    prompt.onend = () => setSpeaking(false);
    prompt.onerror = () => {
      setSpeaking(false);
      setSpeechError("Question audio could not play. Check this tab's sound permission, or read the question on screen.");
    };
    window.speechSynthesis.speak(prompt);
  }, []);

  const speakQuestion = useCallback(async () => {
    if (!questions[index]) return;
    const version = ++playbackVersionRef.current;
    const text = `Question ${index + 1}. ${questions[index].question}`;
    recognitionRef.current?.stop();
    questionAudioRef.current?.pause();
    window.speechSynthesis?.cancel();
    setSpeechError("");
    try {
      if (!(await hasAiSpeechSupport("tts"))) {
        if(version !== playbackVersionRef.current)return;
        speakWithBrowser(text);
        return;
      }
      const response = await synthesizeInterviewSpeech(text);
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
  }, [index, questions, speakWithBrowser]);

  const stopSpeaking = () => {
    playbackVersionRef.current += 1;
    questionAudioRef.current?.pause();
    questionAudioRef.current = null;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  };

  useEffect(() => {
    if (answerFeedback || generatingNext || submitting) return;
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
    recognitionRef.current?.abort();
    questionAudioRef.current?.pause();
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const stopListening = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setListening(false);
  };

  const startAiRecording = async () => {
    if (!(await hasAiSpeechSupport())) {
      setUseAiTranscription(false);
      setListening(false);
      setSpeechError("Voice transcription is unavailable. You can type and edit your answer below.");
      return;
    }
    if (!window.MediaRecorder || !navigator.mediaDevices?.getUserMedia) {
      setSpeechError("Audio recording is unavailable in this browser. Use current Chrome or Edge, or type your response.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if(!mountedRef.current){stream.getTracks().forEach((track)=>track.stop());return;}
      const recorder = new MediaRecorder(stream);
      recorderStreamRef.current = stream;
      recorderRef.current = recorder;
      audioChunksRef.current = [];
      const questionIndex = index;
      recorder.ondataavailable = (event) => { if (event.data.size) audioChunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if(!mountedRef.current)return;
        setListening(false);
        setTranscribing(true);
        try {
          const response = await transcribeInterviewAudio(new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" }));
          if(!mountedRef.current)return;
          setAnswers((current) => ({ ...current, [questionIndex]: [current[questionIndex], response.transcript].filter(Boolean).join(" ") }));
          setSpeechError("");
        } catch (error) {
          setSpeechError(error.message || "AI transcription failed. You can continue typing your response.");
        } finally {
          setTranscribing(false);
          recorderRef.current = null;
          recorderStreamRef.current = null;
        }
      };
      recorder.start();
      setSpeechError("Recording your answer. Speak clearly, then press Stop listening.");
      setListening(true);
    } catch {
      setSpeechError("Microphone access is blocked. Allow microphone permission in the browser address bar, then try again.");
    }
  };

  const startListening = async () => {
    if(listening || transcribing || recordingPendingRef.current)return;
    recordingPendingRef.current=true;
    try {await startListeningInternal();}finally{recordingPendingRef.current=false;}
  };

  const startListeningInternal = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (listening || transcribing) return;
    stopSpeaking();
    setSpeechError("");
    if (useAiTranscription || !SpeechRecognition || await hasAiSpeechSupport()) {
      await startAiRecording();
      return;
    }
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch {
      setSpeechError("Microphone access is blocked. Allow microphone permission in the browser address bar, then try again.");
      return;
    }
    const recognition = new SpeechRecognition();
    let fallbackToAi = false;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.lang = navigator.language || "en-IN";
    const questionIndex = index;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .filter((result) => result.isFinal)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();
      if (!transcript) return;
      setAnswers((current) => ({
        ...current,
        [questionIndex]: [current[questionIndex], transcript].filter(Boolean).join(" "),
      }));
    };
    recognition.onerror = (event) => {
      const messages = {
        "not-allowed": "Microphone permission was denied. You can continue typing your response.",
        "audio-capture": "No working microphone was found.",
        network: "The browser speech service could not connect. PrepMentor is checking secure AI transcription now.",
      };
      setSpeechError(messages[event.error] || "Voice input stopped unexpectedly. You can continue typing.");
      if (event.error === "network") {
        fallbackToAi = true;
        setUseAiTranscription(true);
      }
      recognitionRef.current = null;
      setListening(false);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      if (fallbackToAi) {
        setSpeechError("Checking secure voice transcription…");
        window.setTimeout(() => { startAiRecording(); }, 0);
      }
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setSpeechError("Voice input could not start. You can continue typing your response.");
    }
  };

  const advanceInterview = async () => {
    if (requestLock.current || answerFeedback || generatingNext || submitting || transcribing || listening) return;
    if (!isInterviewAnswerComplete(answer)) {
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
        const {session:remote}=await authorizedRequest(`/api/interview-sessions/${config.remoteSessionId}/answer`, {method:"POST",timeoutMs:120000,body:JSON.stringify({turnIndex:index,transcript:answer})});
        if(remote.result){saveLocalInterviewResult(remote.result,user);navigate(`/interview/result/${remote.result.id}`);return;}
        setQuestions((current)=>current.map((item,i)=>i===index+1?remote.currentQuestion:item));
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
        previousQuestion: questions[index].question,
        previousAnswer: answer,
        excludedQuestions: questions.map((item) => item.question),
      });
      const nextQuestion = response.questions[0];
      setQuestions((current) => current.map((item, questionIndex) => questionIndex === index + 1 ? nextQuestion : item));
      rememberInterviewQuestions([nextQuestion]);
    } catch {
      // Keep the unseen offline question so interviews continue without an LLM connection.
    } finally {
      requestLock.current = false;
      setGeneratingNext(false);
    }
    if (config.mode !== "placement") setAnswerFeedback({ score: currentAnswerComplete ? 100 : 0, strengths: [], improvements: ["Support your explanation with an example and clear reasoning."], feedback: "Offline response-completeness rubric only. Correctness and relevance have not been assessed.", source: "Offline response-completeness rubric", idealAnswer: null });
    else setIndex((current) => Math.min(current + 1, questions.length - 1));
  };

  const currentAnswerComplete = isInterviewAnswerComplete(answer);
  const interviewShouldEnd = remainingSeconds === 0 || index === questions.length - 1;

  const submit = async () => {
    if (requestLock.current || answerFeedback || submitting || generatingNext || transcribing || listening) return;
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
    const askedQuestions = questions.slice(0, index + 1);
    const evaluation = config.remoteSessionId ? (await authorizedRequest(`/api/interview-sessions/${config.remoteSessionId}/answer`,{method:"POST",timeoutMs:120000,body:JSON.stringify({turnIndex:index,transcript:answer,finish:true})})).session.result : await evaluateInterview({ config, questions: askedQuestions, answers });
    const score = evaluation.score;
    const id = evaluation.id || `local-${config.createdAt}`;
    const result = { ...evaluation, id, createdAt: evaluation.createdAt || config.createdAt };
    saveLocalInterviewResult(result, user);
    const topicPerformance = Object.entries(result.metrics || {}).flatMap(([topic, value]) => Number.isFinite(Number(value)) ? [{ topic: topic.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (letter) => letter.toUpperCase()), percentage: Math.max(0, Math.min(100, Math.round(Number(value)))) }] : []);
    addHistoryEntry({ id, title: `${result.role} Interview`, type: "Interview", score, duration: `${config.duration || 30} min`, role: result.role, createdAt: result.createdAt, evaluationMode: result.evaluationMode, evidenceType: evaluation.id ? "server-assessment" : "self-reported", topicPerformance }, { sync: !evaluation.id });
    if (config.mode === "placement" && placementState.interview.status === "available" && score >= PASS_PERCENTAGE && evaluation.evaluationMode?.startsWith("AI semantic")) passInterview();
    try {
      sessionStorage.removeItem(sessionKey);
      sessionStorage.removeItem(whiteboardStorageKey);
    } catch {
      // Completion should not fail when tab storage is unavailable.
    }
    navigate(`/interview/result/${id}`);
    } catch (error) {
      setSubmitError(error.message || "Unable to evaluate this interview.");
      requestLock.current = false;
      setSubmitting(false);
    }
  };

  if (!config.role) return null;

  return <div className="mx-auto max-w-5xl space-y-6"><header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-500"/><p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Live · {config.role} · {questions[index].focus}</p></div><h1 className="mt-1 text-3xl font-extrabold tracking-tight">Interview in progress</h1></div><div className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-2.5 dark:bg-gray-900 ${remainingSeconds<=60?"border-rose-300 text-rose-600 dark:border-rose-900":"border-gray-200 dark:border-gray-700"}`}><Timer size={18} className={remainingSeconds<=60?"text-rose-500":"text-indigo-500"} /><div><p className="font-mono text-sm font-black tabular-nums">{remainingTime}</p><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Time remaining</p></div></div></header>
    <div><div className="mb-2 flex items-center justify-between text-xs font-bold text-gray-500"><span>Interview time</span><span>{remainingSeconds===0?"Complete this response to finish":`${config.duration} minute session`}</span></div><div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800" role="progressbar" aria-label="Interview time remaining" aria-valuemin="0" aria-valuemax={config.duration*60} aria-valuenow={remainingSeconds}><div className={`h-full rounded-full transition-all duration-1000 ${remainingSeconds<=60?"bg-rose-500":"bg-gradient-to-r from-indigo-600 to-violet-500"}`} style={{width:`${(remainingSeconds/(config.duration*60))*100}%`}}/></div><div className="mt-4 inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-500 dark:bg-gray-800"><span className="h-2 w-2 rounded-full bg-indigo-500"/>Question {index+1}</div><p className="mt-3 text-xs font-semibold text-gray-400">The number of questions adapts to your response speed and remains hidden.</p></div>
    {answerFeedback ? <AnswerFeedback evaluation={answerFeedback} onNext={()=>{sessionStorage.setItem(`${sessionKey}:reviewed`,String(index+1));setAnswerFeedback(null);setIndex((current)=>current+1);}}/> : <section className="surface-card rounded-3xl p-6 sm:p-9"><div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><Mic size={23}/></div><div><p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">Question {index+1}</p><h2 className="mt-3 text-xl font-bold leading-8 sm:text-2xl">{questions[index].question}</h2></div></div><InterviewWhiteboard storageKey={whiteboardStorageKey}/><label className="mt-8 block"><span className="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300">Your response</span><textarea disabled={generatingNext||submitting} value={answer} onChange={(e)=>setAnswers((old)=>({...old,[index]:e.target.value}))} rows="9" placeholder="Structure your answer clearly. Use a specific example when possible…" className="w-full resize-none rounded-2xl border border-gray-200 bg-white p-5 leading-7 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-900"/></label><div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div>{speechSupported?<button type="button" disabled={generatingNext||submitting||transcribing} onClick={listening?stopListening:startListening} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${listening?"bg-rose-600 text-white shadow-lg shadow-rose-600/20":"border border-gray-200 text-gray-700 hover:border-indigo-300 hover:text-indigo-600 dark:border-gray-700 dark:text-gray-200"}`}>{listening?<><Square size={15} fill="currentColor"/> Stop listening</>:<><Mic size={16}/> Answer with voice</>}</button>:<p className="text-xs text-gray-400">Voice input is unavailable in this browser; typing remains available.</p>}{listening&&<span role="status" className="ml-3 inline-flex items-center gap-2 text-xs font-bold text-rose-600"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-500"/>Listening</span>}</div><div className="flex items-center justify-between gap-4 text-xs text-gray-400"><span>{MIN_INTERVIEW_WORDS}+ words counts as complete.</span><span className={isInterviewAnswerComplete(answer)?"font-bold text-emerald-600":""}>{countAnswerWords(answer)} words</span></div></div>
      {speechError&&<p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">{speechError}</p>}{submitError&&<p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{submitError}</p>}<div className="mt-6 flex flex-col items-end gap-3"><p className={`text-xs font-bold ${currentAnswerComplete?"text-emerald-600":"text-amber-600"}`}>{currentAnswerComplete?interviewShouldEnd?"Response complete — ready to finish.":"Response complete — ready for the next question.":`${Math.max(0,MIN_INTERVIEW_WORDS-countAnswerWords(answer))} more words required to continue.`}</p>{interviewShouldEnd?<button type="button" disabled={submitting||!currentAnswerComplete||listening||transcribing} onClick={submit} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"><Send size={17}/> {submitting?"Evaluating…":"Finish live interview"}</button>:<button type="button" disabled={!currentAnswerComplete||listening||transcribing||generatingNext} onClick={advanceInterview} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">{generatingNext?"Evaluating answer and preparing follow-up...":config.remoteSessionId?"Submit Answer":"Continue"} <ArrowRight size={17}/></button>}</div>
      <button type="button" onClick={speaking?stopSpeaking:speakQuestion} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-indigo-600 dark:border-gray-700 dark:text-indigo-300">{speaking?<><VolumeX size={16}/> Stop spoken question</>:<><Volume2 size={16}/> Replay spoken question</>}</button>
    </section>}</div>;
}

export default Interview;

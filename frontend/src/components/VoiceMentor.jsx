import { useEffect, useRef, useState } from "react";
import { Bot, MessageCircle, Mic, Send, Volume2, VolumeX, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { askVoiceMentor } from "../services/voiceMentorService";
import { detectVoiceIntent, localVoiceReply, voiceHelpReply, VOICE_INTENT_ROUTES } from "../utils/voiceMentor";

const PROCTORED_PATHS = ["/interview", "/placement/aptitude", "/placement/coding", "/practice/aptitude/quiz", "/coding-interview"];

function getRecognition() {
  if (typeof window === "undefined") return null;
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  return Recognition ? new Recognition() : null;
}

function VoiceMentor() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const recognitionRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const recognitionAvailable = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const hidden = PROCTORED_PATHS.some((path) => location.pathname === path || (path !== "/interview" && location.pathname.startsWith(path)));

  useEffect(() => {
    if (!hidden) return undefined;
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
    const resetTimer = window.setTimeout(() => {
      setListening(false);
      setSpeaking(false);
      setOpen(false);
    }, 0);
    return () => window.clearTimeout(resetTimer);
  }, [hidden]);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
  }, []);

  const speak = (text) => {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.98;
    utterance.pitch = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const addAssistantMessage = (text) => {
    setMessages((current) => [...current, { role: "assistant", text }]);
    speak(text);
  };

  const actOnIntent = (intent, message) => {
    if (intent === "help" || /what can you do|options|help me/i.test(message)) {
      const reply = voiceHelpReply();
      addAssistantMessage(reply);
      return;
    }
    const route = VOICE_INTENT_ROUTES[intent];
    if (!route) return false;
    addAssistantMessage(localVoiceReply(intent, user?.name));
    window.setTimeout(() => navigate(route), 450);
    return true;
  };

  const sendMessage = async (value = draft) => {
    const message = String(value || "").trim().slice(0, 600);
    if (!message || busy) return;
    setDraft("");
    setError("");
    setMessages((current) => [...current, { role: "user", text: message }]);
    const local = detectVoiceIntent(message);
    if (local.intent !== "unknown" && local.intent !== "empty") {
      actOnIntent(local.intent, message);
      return;
    }
    if (/what can you do|options|help me/i.test(message)) {
      actOnIntent("help", message);
      return;
    }
    setBusy(true);
    try {
      const response = await askVoiceMentor(message, { path: location.pathname, role: user?.targetRole || "", name: user?.name || "" });
      const intent = response.intent && VOICE_INTENT_ROUTES[response.intent] ? response.intent : "";
      addAssistantMessage(response.reply || "I’m here to help. Try asking for aptitude, coding, interviews, your resume, or performance.");
      if (intent) window.setTimeout(() => navigate(VOICE_INTENT_ROUTES[intent]), 450);
    } catch {
      const fallback = "I didn’t catch a supported PrepMentor action. Try saying: start aptitude practice, continue Placement, practice coding, or show my performance.";
      addAssistantMessage(fallback);
      setError("AI mentor unavailable; local voice commands are still available.");
    } finally {
      setBusy(false);
    }
  };

  const startListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = getRecognition();
    if (!recognition) {
      setError("Voice input is not supported here. You can type your request instead.");
      return;
    }
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => { setError(""); setListening(true); };
    recognition.onresult = (event) => sendMessage(event.results[0][0].transcript);
    recognition.onerror = (event) => { setListening(false); setError(event.error === "not-allowed" ? "Microphone access was denied. You can type your request instead." : "I couldn’t hear that. Please try again."); };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    try { recognition.start(); } catch { setListening(false); }
  };

  const openMentor = () => {
    setOpen(true);
    if (!messages.length) {
      const greeting = `Hi ${user?.name?.split(" ")[0] || "there"}. I’m your PrepMentor voice guide. What would you like to do today?`;
      setMessages([{ role: "assistant", text: greeting }]);
      speak(greeting);
    }
  };

  if (hidden) return null;
  return (
    <>
      {open && <section className="fixed bottom-24 right-4 z-[110] flex w-[min(25rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-indigo-200 bg-white shadow-2xl shadow-indigo-950/20 dark:border-indigo-900 dark:bg-gray-900" aria-label="PrepMentor voice guide">
        <header className="flex items-center justify-between gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 text-white"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15"><Bot size={22} /></span><div><p className="font-black">PrepMentor voice guide</p><p className="text-xs text-indigo-100">Ask what you want to do</p></div></div><button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-white/15" aria-label="Close voice guide"><X size={18} /></button></header>
        <div className="max-h-80 space-y-3 overflow-y-auto p-4" aria-live="polite">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><p className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${message.role === "user" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"}`}>{message.text}</p></div>)}{busy && <p className="text-xs font-semibold text-gray-500">Thinking…</p>}</div>
        {error && <p role="alert" className="px-4 text-xs font-semibold text-amber-700 dark:text-amber-300">{error}</p>}
        <div className="border-t border-gray-100 p-3 dark:border-gray-800"><div className="flex items-end gap-2"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} rows={2} placeholder="Try: start aptitude practice" aria-label="Message PrepMentor voice guide" className="min-h-11 flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-950"/><button type="button" onClick={() => sendMessage()} disabled={!draft.trim() || busy} className="rounded-xl bg-indigo-600 p-3 text-white disabled:opacity-40" aria-label="Send message"><Send size={17} /></button></div><div className="mt-2 flex items-center justify-between gap-2"><button type="button" onClick={startListening} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${listening ? "bg-rose-600 text-white" : "border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"}`}><Mic size={15} />{listening ? "Listening…" : recognitionAvailable ? "Speak" : "Voice unavailable"}</button><button type="button" onClick={() => { if (speaking) { window.speechSynthesis?.cancel(); setSpeaking(false); } else if (messages.at(-1)?.role === "assistant") speak(messages.at(-1).text); }} className="inline-flex items-center gap-2 px-2 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-300">{speaking ? <><VolumeX size={15} /> Stop voice</> : <><Volume2 size={15} /> Replay</>}</button></div></div>
      </section>}
      <button type="button" onClick={openMentor} className="fixed bottom-5 right-4 z-[109] flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-xl shadow-indigo-600/30 transition hover:-translate-y-0.5 hover:bg-indigo-700" aria-label="Open PrepMentor voice guide"><MessageCircle size={18} /> <span className="hidden sm:inline">Ask PrepMentor</span></button>
    </>
  );
}

export default VoiceMentor;

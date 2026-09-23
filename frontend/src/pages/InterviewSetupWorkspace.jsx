import { authorizedRequest } from "../services/authService";
import { apiRequest, hasRemoteApi } from "../services/api";
import { useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BriefcaseBusiness, Check, Gauge, ListChecks, Mic2, SlidersHorizontal, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { interviewFocusAreas } from "../data/interviewQuestions";
import { generateQuestionBatch } from "../services/questionService";
import { getRecentInterviewQuestions, rememberInterviewQuestions } from "../services/interviewQuestionHistory";
import { createInterviewSession, INTERVIEW_SESSION_KEY } from "../utils/interviewSession";
import { getAccountStorageKey } from "../utils/storage";
import { getAdaptiveInterviewQuestionCount, INTERVIEW_DURATIONS } from "../utils/interviewTiming";

const roles = ["Frontend Developer", "Backend Developer", "Full Stack Developer", "Software Engineer", "Data Analyst", "DevOps Engineer"];
const types = [
  { name: "Technical", description: "Architecture, code, and problem solving" },
  { name: "Behavioral", description: "Communication, ownership, and teamwork" },
  { name: "Mixed", description: "A balanced, realistic interview loop" },
];

function InterviewSetupWorkspace() {
  const navigate=useNavigate();
  const location=useLocation();
  const [startError,setStartError]=useState("");
  const [capabilities, setCapabilities] = useState(null);
  useEffect(() => {
    if (!hasRemoteApi) return;
    let active = true;
    apiRequest("/api/health").then((health) => { if (active) setCapabilities(health.interview || health); }).catch(() => { if (active) setCapabilities({}); });
    return () => { active = false; };
  }, []);
  const {user}=useAuth();
  const [config,setConfig]=useState({role:"Frontend Developer",experience:"Fresher / entry level",interviewType:"Mixed",difficulty:"Medium",duration:20,focusAreas:["JavaScript","React","Communication"]});
  const update=(name,value)=>setConfig((current)=>({...current,[name]:value}));
  const toggleFocus=(focus)=>setConfig((current)=>({...current,focusAreas:current.focusAreas.includes(focus)?current.focusAreas.filter((item)=>item!==focus):[...current.focusAreas,focus].slice(-4)}));
  const startLock = useRef(false);
  const [starting,setStarting]=useState(false);
  const [slowStart, setSlowStart] = useState(false);
  useEffect(() => {
    if (!starting) return;
    const timer = window.setTimeout(() => setSlowStart(true), 8000);
    return () => window.clearTimeout(timer);
  }, [starting]);
  const start = async () => {
    if (startLock.current) return;
    startLock.current = true;
    setStarting(true);
    setSlowStart(false);
    setStartError("");
    try {
      if (hasRemoteApi) {
        const { session } = await authorizedRequest("/api/interview-sessions", {
          method: "POST", timeoutMs: 25000,
          body: JSON.stringify({ ...config, mode: location.state?.mode || "practice" }),
        });
        if (!session?.id || !session.currentQuestion?.question) throw new Error("The first question was not returned. Please retry.");
        const sessionConfig = { ...session.config, remoteSessionId: session.id, createdAt: session.startedAt };
        try { sessionStorage.setItem(getAccountStorageKey(INTERVIEW_SESSION_KEY, user), JSON.stringify({ config: sessionConfig })); }
        catch { /* Navigation state preserves the session when storage is unavailable. */ }
        navigate("/interview", { state: { config: sessionConfig, remoteSession: session } });
        return;
      }
      const excludedQuestions = getRecentInterviewQuestions();
      const questionCount = getAdaptiveInterviewQuestionCount(config.duration);
      const sessionConfig = { ...config, questionCount, createdAt: new Date().toISOString(), excludedQuestions };
      let generatedQuestions = null;
      try {
        const response = await generateQuestionBatch({ kind: "interview", count: questionCount, difficulty: config.difficulty.toLowerCase(), role: config.role, category: `${config.interviewType}: ${config.focusAreas.join(", ")}`, excludedQuestions });
        generatedQuestions = response.questions;
      } catch { /* Explicit local practice retains its curated question bank. */ }
      const session = createInterviewSession(sessionConfig, generatedQuestions);
      rememberInterviewQuestions(session.questions);
      try { sessionStorage.setItem(getAccountStorageKey(INTERVIEW_SESSION_KEY, user), JSON.stringify(session)); }
      catch { /* Navigation state remains available. */ }
      navigate("/interview", { state: { config: session.config, generatedQuestions: session.questions } });
    } catch (error) {
      setStartError(error.status === 0 ? "The interview service did not respond in time. Your settings are preserved. Please retry." : error.message || "Unable to start the interview. Please retry.");
    } finally {
      startLock.current = false;
      setStarting(false);
      setSlowStart(false);
    }
  };

  return <div className="mx-auto max-w-5xl space-y-8"><header className="text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><Mic2 size={27}/></div><p className="mt-5 text-sm font-bold text-indigo-600 dark:text-indigo-400">Mock interview setup</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Shape the session around your goal.</h1><p className="mx-auto mt-3 max-w-2xl text-gray-500 dark:text-gray-400">Choose the role and focus. A configured LLM creates a fresh session; the curated bank remains available offline.</p></header>
    {capabilities && <p role="status" className="text-center text-xs text-gray-500">AI Interview: {capabilities.llm && !capabilities.demoMode ? "Configured" : "Backup interview engine ready"} ? Voice transcription: {capabilities.stt ? "Configured" : "Unavailable"} ? Voice output: {capabilities.tts ? "Configured" : "Browser fallback"}</p>}
    <section className="surface-card space-y-8 rounded-3xl p-6 sm:p-8"><SetupSection icon={BriefcaseBusiness} title="Role and experience"><div className="grid gap-4 sm:grid-cols-2"><Select label="Target role" value={config.role} onChange={(value)=>update("role",value)} options={roles}/><Select label="Experience level" value={config.experience} onChange={(value)=>update("experience",value)} options={["Fresher / entry level","1–3 years","3–5 years","5+ years"]}/></div></SetupSection>
      <SetupSection icon={SlidersHorizontal} title="Interview format"><div className="grid gap-3 md:grid-cols-3">{types.map((type)=><button key={type.name} type="button" onClick={()=>update("interviewType",type.name)} className={`rounded-2xl border p-4 text-left transition ${config.interviewType===type.name?"border-indigo-500 bg-indigo-50 ring-4 ring-indigo-500/10 dark:bg-indigo-950/35":"border-gray-200 hover:border-gray-300 dark:border-gray-700"}`}><p className="font-bold">{type.name}</p><p className="mt-1 text-xs leading-5 text-gray-500">{type.description}</p></button>)}</div></SetupSection>
      <SetupSection icon={Gauge} title="Challenge level"><div className="grid gap-3 sm:grid-cols-3">{["Easy","Medium","Hard"].map((level)=><button key={level} type="button" onClick={()=>update("difficulty",level)} className={`rounded-xl border px-4 py-3 text-sm font-bold ${config.difficulty===level?"border-teal-500 bg-teal-50 text-teal-800 dark:bg-teal-950/35 dark:text-teal-200":"border-gray-200 dark:border-gray-700"}`}>{level}</button>)}</div></SetupSection>
      <SetupSection icon={Sparkles} title="Focus areas"><p className="mb-4 text-sm text-gray-500">Choose up to four priorities. Matching questions appear earlier.</p><div className="flex flex-wrap gap-2">{interviewFocusAreas.map((focus)=>{const active=config.focusAreas.includes(focus);return <button key={focus} type="button" onClick={()=>toggleFocus(focus)} className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition ${active?"border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300":"border-gray-200 text-gray-500 dark:border-gray-700"}`}>{active&&<Check size={13}/>} {focus}</button>})}</div></SetupSection>
      <SetupSection icon={ListChecks} title="Interview duration"><p className="mb-4 text-sm text-gray-500">Question count adapts privately to your answering speed. You will only see the remaining time.</p><div className="grid gap-3 sm:grid-cols-3">{INTERVIEW_DURATIONS.map((duration)=><button key={duration} type="button" onClick={()=>update("duration",duration)} className={`rounded-xl border p-4 text-left ${config.duration===duration?"border-indigo-500 bg-indigo-50 ring-4 ring-indigo-500/10 dark:bg-indigo-950/35":"border-gray-200 dark:border-gray-700"}`}><p className="text-lg font-black">{duration} minutes</p><p className="mt-1 text-xs text-gray-500">Adaptive live interview</p></button>)}</div></SetupSection>
      <div className="flex flex-col justify-between gap-4 border-t border-gray-200 pt-6 dark:border-gray-800 sm:flex-row sm:items-center"><div><p className="text-sm font-bold">{config.role} · {config.interviewType}</p><p className="mt-1 text-xs text-gray-500">{config.duration} minutes · Adaptive questions · {config.difficulty} · {config.focusAreas.length} focus areas</p></div><button type="button" disabled={starting} onClick={start} className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:bg-indigo-700">{starting?"Preparing interview...":"Start interview"} <ArrowRight size={17}/></button></div>
      {starting && <p role="status" className="text-sm text-indigo-600">{slowStart ? "Gemini is taking longer than usual. This attempt will stop shortly if it cannot generate a question." : "Asking Gemini for your first question..."}</p>}
      {startError && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{startError}</p>}
    </section></div>;
}

function SetupSection({icon:Icon,title,children}){return <section><div className="mb-4 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"><Icon size={19}/></div><h2 className="font-bold">{title}</h2></div>{children}</section>}
function Select({label,value,onChange,options}){return <label className="text-sm font-bold text-gray-600 dark:text-gray-300"><span>{label}</span><select value={value} onChange={(event)=>onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-medium text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white">{options.map((option)=><option key={option}>{option}</option>)}</select></label>}

export default InterviewSetupWorkspace;

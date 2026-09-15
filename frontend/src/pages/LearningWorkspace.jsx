import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpenCheck, Check, CheckCircle2, ExternalLink, Lightbulb, LockKeyhole, PlayCircle, Target, TrendingUp } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePlacement } from "../context/PlacementContext";
import { useAuth } from "../context/AuthContext";
import { getAccountStorageKey, readStorage, writeStorage } from "../utils/storage";
import { getLearningReferences, getWeakLearningTopics, normalizeCompletedTopics, normalizeVisitedReferences } from "../utils/learningPlan";
import { addHistoryEntry } from "../services/history";
import LearningAssignment from "../components/LearningAssignment";
import { countLearningWords, normalizeLearningReflections } from "../utils/learningPlan";

const SESSION_KEY = "prepmentor_learning_session";
const defaultTopics = [
  { topic: "JavaScript Foundations", percentage: 45 },
  { topic: "Data Structures", percentage: 60 },
  { topic: "Logical Reasoning", percentage: 82 },
];

function buildLesson(topic) {
  const name = topic.toLowerCase();
  if (name.includes("graph") || name.includes("tree") || name.includes("data structure")) return ["Choose a structure from the operations you need", "Trace insertion and lookup on a small example", "Compare time and space complexity before coding"];
  if (name.includes("javascript") || name.includes("programming")) return ["Predict values and types before running code", "Use small pure functions to isolate each step", "Test normal input, empty input, and one edge case"];
  if (name.includes("sorting") || name.includes("complexity")) return ["Identify the input size and dominant operation", "Separate best, average, and worst cases", "Explain the trade-off in plain language"];
  if (name.includes("aptitude") || name.includes("percentage")) return ["Write down the known values and required value", "Convert percentages and ratios before calculating", "Estimate first, then check the exact result"];
  return ["Restate the concept in your own words", "Work through one concrete example", "Explain the result and one common mistake"];
}

function LearningWorkspace() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { placementState, retryAptitude, retryCoding } = usePlacement();
  const storageKey = getAccountStorageKey(SESSION_KEY, user);
  const [session] = useState(() => {
    const incoming = location.state;
    if (incoming?.topicPerformance) return incoming;
    return readStorage(storageKey, {});
  });
  const weakTopics = useMemo(() => {
    return getWeakLearningTopics(session.topicPerformance, defaultTopics).map((item) => ({ ...item, lesson: buildLesson(item.topic) }));
  }, [session.topicPerformance]);
  const [selectedTopic, setSelectedTopic] = useState(() => weakTopics[0]?.topic || "");
  const [completed, setCompleted] = useState(() => new Set(normalizeCompletedTopics(session.completedTopics, weakTopics)));
  const [visitedReferences, setVisitedReferences] = useState(() => new Set(normalizeVisitedReferences(session.visitedReferences, weakTopics)));
  const [reflections, setReflections] = useState(() => normalizeLearningReflections(session.reflections, weakTopics));
  const selected = weakTopics.find((item) => item.topic === selectedTopic);
  const progress = weakTopics.length ? Math.round((completed.size / weakTopics.length) * 100) : 100;
  const validPlacementModule = ["aptitude", "coding"].includes(session.module);
  const validPlacementLevel = ["easy", "medium", "hard"].includes(session.placementLevel);
  const placementMode = Boolean(
    session.placementMode
    && validPlacementModule
    && validPlacementLevel
    && placementState[session.module]?.[session.placementLevel] === "failed"
  );
  const readyToRetry = weakTopics.length === 0 || completed.size === weakTopics.length;

  useEffect(() => {
    if (session.topicPerformance) writeStorage(storageKey, { ...session, completedTopics: [...completed], visitedReferences: [...visitedReferences], reflections });
  }, [completed, reflections, session, storageKey, visitedReferences]);

  const completeTopic = () => {
    if (!selected || completed.has(selected.topic) || !visitedReferences.has(selected.topic) || countLearningWords(reflections[selected.topic]) < 20) return;
    setCompleted((current) => new Set([...current, selected.topic]));
    addHistoryEntry({
      type: "Learning assignment",
      title: selected.topic,
      score: selected.percentage,
      topicPerformance: [{ topic: selected.topic, percentage: selected.percentage }],
      detail: "Completed the lesson, reference, and reflection assignment.",
    });
  };
  const openReference = (topic) => setVisitedReferences((current) => new Set([...current, topic]));
  const handleContinue = () => {
    if (placementMode) {
      if (session.module === "coding") retryCoding(session.placementLevel);
      else retryAptitude(session.placementLevel);
      localStorage.removeItem(storageKey);
      navigate(session.module === "coding" ? "/placement/coding" : "/placement/aptitude");
      return;
    }
    navigate("/practice/aptitude");
  };

  return <div className="space-y-7"><header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="text-sm font-bold text-teal-600 dark:text-teal-400">Learning Hub</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Turn weak spots into a plan.</h1><p className="mt-2 max-w-2xl text-gray-500 dark:text-gray-400">Review the ideas behind missed questions, complete each focus topic, and return when you are ready.</p></div>{placementMode&&<div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm dark:border-indigo-900 dark:bg-indigo-950/40"><p className="font-bold text-indigo-800 dark:text-indigo-200">Placement remediation</p><p className="mt-1 capitalize text-indigo-600 dark:text-indigo-300">{session.module} · {session.placementLevel} level</p></div>}</header>
    <section className="surface-card rounded-3xl p-6"><div className="flex items-center justify-between gap-5"><div><p className="text-sm font-bold">Learning progress</p><p className="mt-1 text-xs text-gray-500">{completed.size} of {weakTopics.length} focus topics complete</p></div><span className="text-2xl font-black text-teal-600 dark:text-teal-300">{progress}%</span></div><div className="mt-4 h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-full rounded-full bg-teal-500 transition-all duration-500" style={{width:`${progress}%`}}/></div></section>
    <div className="grid items-start gap-6 lg:grid-cols-[0.72fr_1.28fr]"><aside className="surface-card rounded-3xl p-4"><p className="px-2 pb-3 text-xs font-black uppercase tracking-[0.18em] text-gray-400">Focus topics</p><div className="space-y-2">{weakTopics.map((item)=><button key={item.topic} type="button" onClick={()=>setSelectedTopic(item.topic)} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${selectedTopic===item.topic ? "bg-indigo-50 dark:bg-indigo-950/45" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}`}><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${completed.has(item.topic) ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950" : "bg-rose-50 text-rose-500 dark:bg-rose-950/40"}`}>{completed.has(item.topic)?<Check size={19}/>:<Target size={19}/>}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{item.topic}</p><p className="mt-0.5 text-xs text-gray-400">Previous score: {item.percentage}%</p></div><ArrowRight size={15} className="text-gray-300"/></button>)}</div>{weakTopics.length===0&&<div className="rounded-2xl bg-emerald-50 p-5 text-center dark:bg-emerald-950/30"><CheckCircle2 className="mx-auto text-emerald-600"/><p className="mt-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">No weak topics detected</p></div>}</aside>
      {selected ? <main className="surface-card rounded-3xl p-6 sm:p-8"><div className="flex items-start justify-between gap-5"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><BookOpenCheck size={24}/></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${completed.has(selected.topic)?"bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300":"bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"}`}>{completed.has(selected.topic)?"Completed":"In progress"}</span></div><p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">Focused lesson</p><h2 className="mt-2 text-2xl font-extrabold">{selected.topic}</h2><p className="mt-3 leading-7 text-gray-500 dark:text-gray-400">Use this short framework to approach the topic deliberately. Say each step aloud as if explaining it to an interviewer.</p><div className="mt-7 space-y-3">{selected.lesson.map((point,index)=><div key={point} className="flex gap-4 rounded-2xl border border-gray-200 p-4 dark:border-gray-700"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-black text-gray-600 dark:bg-gray-800 dark:text-gray-300">{index+1}</span><p className="pt-1 text-sm font-medium leading-6">{point}</p></div>)}</div><div className="mt-7"><p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">Required references</p><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Open at least one reference for this topic before marking it complete.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{getLearningReferences(selected.topic).map((reference)=><a key={reference.url} href={reference.url} target="_blank" rel="noreferrer" onClick={()=>openReference(selected.topic)} className="flex items-center justify-between gap-3 rounded-2xl border border-indigo-200 p-4 text-sm font-bold text-indigo-700 transition hover:-translate-y-0.5 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950/30"><span>{reference.title}</span><ExternalLink size={16}/></a>)}</div>{visitedReferences.has(selected.topic)&&<p className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-600"><Check size={15}/> Reference opened. Completion is now available.</p>}</div><div className="mt-7 rounded-2xl bg-amber-50 p-5 dark:bg-amber-950/30"><p className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-200"><Lightbulb size={18}/> Quick reflection</p><p className="mt-2 text-sm leading-6 text-amber-700 dark:text-amber-300">Before marking this complete, create one example of your own and explain why your approach works.</p></div><button type="button" disabled={completed.has(selected.topic)||!visitedReferences.has(selected.topic)} onClick={completeTopic} className="mt-7 flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700"><CheckCircle2 size={17}/>{completed.has(selected.topic)?"Topic completed":visitedReferences.has(selected.topic)?"Mark topic complete":"Open a reference first"}</button></main> : <main className="surface-card rounded-3xl p-10 text-center"><TrendingUp className="mx-auto text-emerald-500" size={34}/><h2 className="mt-4 text-xl font-bold">You are ready to continue</h2><p className="mt-2 text-gray-500">No additional remediation is required for this session.</p></main>}</div>
    <section className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center"><div><h2 className="font-bold">{readyToRetry ? "Learning plan complete" : "Complete the plan to continue"}</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{readyToRetry ? "Your assessment retry is now available." : `${weakTopics.length-completed.size} focus ${weakTopics.length-completed.size===1?"topic":"topics"} remaining.`}</p></div><button type="button" disabled={!readyToRetry} onClick={handleContinue} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700">{readyToRetry?<PlayCircle size={17}/>:<LockKeyhole size={17}/>} {placementMode?"Retry assessment":"Return to practice"}</button></section>
    <LearningAssignment topic={selected?.topic} value={reflections[selected?.topic]||""} referenceVisited={visitedReferences.has(selected?.topic)} completed={completed.has(selected?.topic)} onChange={(value)=>setReflections((current)=>({...current,[selected.topic]:value}))} onComplete={completeTopic}/>
    {!placementMode&&<button type="button" onClick={()=>navigate("/dashboard")} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-indigo-600"><ArrowLeft size={16}/> Back to dashboard</button>}</div>;
}

export default LearningWorkspace;

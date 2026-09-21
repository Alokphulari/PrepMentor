import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, RotateCcw, Trophy } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { addHistoryEntry } from "../services/history";
import { generateAptitudeSession } from "../services/questionService";
import { markDailyQuestionActivity } from "../services/dailyActivity";
import { APTITUDE_SESSION_KEY, getAptitudeSession, normalizeAptitudeProgress } from "../utils/aptitudeSession";
import { getAssessmentPercentage, PASS_PERCENTAGE } from "../utils/assessmentRules";
import { getAccountStorageKey } from "../utils/storage";

function readStoredSession(storageKey) {
  try {
    return JSON.parse(sessionStorage.getItem(storageKey));
  } catch {
    return null;
  }
}

function AptitudePracticeSession() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const storageKey = getAccountStorageKey(APTITUDE_SESSION_KEY, user);
  const [restoredSession] = useState(() => readStoredSession(storageKey));
  const [config, setConfig] = useState(() => getAptitudeSession(location.state || restoredSession));
  const questions = config.questions;
  const sessionSeconds = questions.length * 60;
  const category = config.categoryDetails;
  const [initialProgress] = useState(() => normalizeAptitudeProgress(restoredSession?.sessionId === config.sessionId ? restoredSession.progress : null, questions.length, sessionSeconds));
  const [index,setIndex]=useState(initialProgress.index); const [answers,setAnswers]=useState(initialProgress.answers); const [seconds,setSeconds]=useState(initialProgress.seconds); const [result,setResult]=useState(null);
  const completedRef=useRef(false);
  const answered=Object.keys(answers).length;

  useEffect(() => {
    if (answered > 0) markDailyQuestionActivity();
  }, [answered]);

  useEffect(()=>{if(questions.length<30)navigate("/practice/aptitude",{replace:true});},[navigate,questions.length]);

  const topicPerformance=useMemo(()=>{const topics={};questions.forEach((question,questionIndex)=>{topics[question.topic]??={topic:question.topic,correct:0,total:0};topics[question.topic].total+=1;if(answers[questionIndex]===question.answer)topics[question.topic].correct+=1;});return Object.values(topics).map((item)=>({...item,percentage:getAssessmentPercentage(item.correct,item.total)}));},[answers,questions]);
  const finish=useCallback((remainingSeconds)=>{if(completedRef.current)return;completedRef.current=true;const score=questions.reduce((total,question,questionIndex)=>total+(answers[questionIndex]===question.answer?1:0),0);const percentage=getAssessmentPercentage(score,questions.length);setResult({score,percentage,timedOut:remainingSeconds===0});try{sessionStorage.removeItem(storageKey);}catch{/* Completion should still work when tab storage is unavailable. */}addHistoryEntry({title:`${category.title} · ${config.difficulty}`,type:"Aptitude Practice",mode:"practice",difficulty:config.difficulty,score:percentage,duration:`${Math.max(1,Math.ceil((sessionSeconds-remainingSeconds)/60))} min`,topicPerformance});},[answers,category.title,config.difficulty,questions,sessionSeconds,storageKey,topicPerformance]);
  const submit=()=>{if(answered!==questions.length)return;finish(seconds);};
  const restart=async()=>{try{const generated=await generateAptitudeSession({category:config.category,difficulty:config.difficulty,count:questions.length});const nextConfig=getAptitudeSession({...config,sessionId:crypto.randomUUID(),generatedQuestions:generated.questions,generationSource:generated.source});completedRef.current=false;setConfig(nextConfig);setIndex(0);setAnswers({});setSeconds(nextConfig.questions.length*60);setResult(null);}catch{navigate("/practice/aptitude");}};

  useEffect(()=>{if(result||!config.sessionId)return;try{sessionStorage.setItem(storageKey,JSON.stringify({...config,generatedQuestions:questions,progress:{index,answers,seconds}}));}catch{/* The active quiz still works if tab storage becomes unavailable. */}},[answers,config,index,questions,result,seconds,storageKey]);

  useEffect(()=>{if(result)return undefined;const timer=window.setInterval(()=>setSeconds((value)=>{if(value<=1){window.clearInterval(timer);window.queueMicrotask(()=>finish(0));return 0;}return value-1;}),1000);return()=>window.clearInterval(timer);},[finish,result]);
  const time=`${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`;

  if(questions.length<30)return null;

  if(result)return <div className="mx-auto max-w-4xl space-y-6"><section className="surface-card rounded-3xl p-8 text-center sm:p-10"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/40"><Trophy size={30}/></div><p className="mt-6 text-sm font-bold capitalize text-indigo-600 dark:text-indigo-400">{category.title} · {config.difficulty}</p><h1 className="mt-2 text-3xl font-black">{result.timedOut?"Time is up":"Practice complete"}</h1><p className="mt-3 text-gray-500">{result.timedOut&&"Unanswered questions were counted as incorrect. "}You answered {result.score} of {questions.length} questions correctly.</p><p className="mt-6 text-6xl font-black tracking-tight text-indigo-600 dark:text-indigo-300">{result.percentage}%</p><div className="mt-8 flex flex-wrap justify-center gap-3"><button type="button" onClick={()=>navigate("/learning",{state:{topicPerformance,overallScore:result.score,totalQuestions:questions.length}})} className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold dark:border-gray-700">Review weak topics</button><button type="button" onClick={restart} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white"><RotateCcw size={16}/> Try again</button></div></section><section className="grid gap-3 sm:grid-cols-2">{topicPerformance.map((topic)=><div key={topic.topic} className="surface-card rounded-2xl p-5"><div className="flex justify-between gap-3"><p className="font-bold">{topic.topic}</p><span className={topic.percentage>=PASS_PERCENTAGE?"font-black text-emerald-600":"font-black text-amber-600"}>{topic.percentage}%</span></div><div className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-gray-800"><div className={`h-full rounded-full ${topic.percentage>=PASS_PERCENTAGE?"bg-emerald-500":"bg-amber-500"}`} style={{width:`${topic.percentage}%`}}/></div></div>)}</section></div>;

  const question=questions[index];
  return <div className="mx-auto max-w-5xl space-y-6"><header className="flex items-center justify-between gap-4"><button type="button" onClick={()=>navigate("/practice/aptitude")} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-indigo-600"><ArrowLeft size={17}/> Exit session</button><div className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-black ${seconds<60?"border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900 dark:bg-rose-950/30":"border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"}`}><Clock3 size={17}/>{time}</div></header>
    <section className="surface-card min-w-0 overflow-hidden rounded-3xl p-6 sm:p-8"><div className="flex min-w-0 flex-col justify-between gap-5 sm:flex-row sm:items-center"><div className="shrink-0"><p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">{category.title} · <span className="capitalize">{config.difficulty}</span></p><h1 className="mt-2 text-xl font-extrabold">Question {index+1} of {questions.length}</h1></div><div className="flex min-w-0 max-w-full gap-2 overflow-x-auto pb-2 sm:max-w-[68%]" aria-label="Question navigator">{questions.map((_,questionIndex)=><button key={questionIndex} type="button" onClick={()=>setIndex(questionIndex)} aria-label={`Go to question ${questionIndex+1}`} className={`h-8 w-8 shrink-0 rounded-lg text-xs font-black transition ${questionIndex===index?"bg-indigo-600 text-white":answers[questionIndex]?"bg-emerald-100 text-emerald-700 dark:bg-emerald-950":"bg-gray-100 text-gray-500 dark:bg-gray-800"}`}>{questionIndex+1}</button>)}</div></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{width:`${(answered/questions.length)*100}%`}}/></div>
      <div className="mt-8"><p className="text-sm font-bold text-teal-600 dark:text-teal-400">{question.topic}</p><h2 className="mt-3 text-xl font-bold leading-8 sm:text-2xl">{question.question}</h2><div className="mt-6 grid gap-3 sm:grid-cols-2">{question.options.map((option,optionIndex)=>{const selected=answers[index]===option;return <button key={option} type="button" onClick={()=>setAnswers((current)=>({...current,[index]:option}))} className={`flex min-h-16 items-center gap-3 rounded-2xl border p-4 text-left transition ${selected?"border-indigo-500 bg-indigo-50 text-indigo-800 ring-4 ring-indigo-500/10 dark:bg-indigo-950/40 dark:text-indigo-200":"border-gray-200 hover:border-indigo-300 dark:border-gray-700 dark:hover:border-indigo-700"}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${selected?"bg-indigo-600 text-white":"bg-gray-100 text-gray-500 dark:bg-gray-800"}`}>{String.fromCharCode(65+optionIndex)}</span><span className="font-semibold">{option}</span>{selected&&<CheckCircle2 size={18} className="ml-auto shrink-0 text-indigo-600"/>}</button>})}</div></div>
      <div className="mt-8 flex items-center justify-between"><button type="button" disabled={index===0} onClick={()=>setIndex(index-1)} className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold disabled:opacity-30 dark:border-gray-700"><ArrowLeft size={16}/> Previous</button>{index<questions.length-1?<button type="button" onClick={()=>setIndex(index+1)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white">Next <ArrowRight size={16}/></button>:<button type="button" disabled={answered!==questions.length} onClick={submit} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Submit answers</button>}</div>{index===questions.length-1&&answered!==questions.length&&<p className="mt-3 text-right text-xs text-gray-400">Answer all {questions.length} questions before submitting.</p>}</section></div>;
}

export default AptitudePracticeSession;

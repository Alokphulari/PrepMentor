import { useEffect, useState } from "react";
import { Award, CheckCircle2, LoaderCircle, RotateCcw, Sparkles, TrendingUp } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getRemoteInterviewResult } from "../services/interviewService";
import { getInterviewFeedback, getInterviewHeadline } from "../utils/interviewFeedback";
import { readLocalInterviewResult, saveLocalInterviewResult } from "../utils/interviewResultStorage";
import CareerRoadmap from "../components/CareerRoadmap";

function InterviewResult() {
  const { id } = useParams();
  const { user } = useAuth();
  const [localResult] = useState(() => readLocalInterviewResult(id, user));
  const [result, setResult] = useState(localResult);
  const [loading, setLoading] = useState(() => !localResult);

  useEffect(() => {
    if (localResult) return undefined;
    let active = true;
    getRemoteInterviewResult(id)
      .then((remoteResult) => {
        if (!active || !remoteResult) return;
        const saved = { ...remoteResult, id: remoteResult.id || id };
        saveLocalInterviewResult(saved, user);
        setResult(saved);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, localResult, user]);

  if (loading) return <div className="surface-card mx-auto flex max-w-xl items-center justify-center gap-3 rounded-3xl p-10 text-center"><LoaderCircle className="animate-spin text-indigo-600" /><p className="font-bold">Loading interview result...</p></div>;
  if (!result) return <div className="surface-card mx-auto max-w-xl rounded-3xl p-10 text-center"><h1 className="text-2xl font-bold">Result not found</h1><p className="mt-2 text-gray-500">This interview result is unavailable or was cleared.</p><Link to="/interview/setup" className="mt-6 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white">Start a new interview</Link></div>;
  const semantic = result.evaluationMode?.startsWith("AI semantic");
  const localRubric = result.evaluationMode === "Local deterministic interview rubric";
  const assessed = semantic || localRubric;
  const feedback = getInterviewFeedback(result.metrics);
  const score = Math.max(0, Math.min(100, Math.round(Number(result.score) || 0)));
  return <div className="mx-auto max-w-5xl space-y-6"><section className="surface-card relative overflow-hidden rounded-3xl p-8 sm:p-10"><div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl"/><div className="relative flex flex-col gap-7 sm:flex-row sm:items-center"><div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[10px] border-indigo-100 text-3xl font-black text-indigo-600 dark:border-indigo-950 dark:text-indigo-300">{score}%</div><div><p className="flex items-center gap-2 text-sm font-bold text-emerald-600"><CheckCircle2 size={17}/> Interview complete</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight">{assessed ? getInterviewHeadline(score) : "Response completeness report"}</h1><p className="mt-2 text-gray-500 dark:text-gray-400">{result.role || "Software Engineer"} · {result.type || "Mixed"} interview</p></div></div></section>
    {result.summary && <section className="surface-card rounded-3xl p-6"><h2 className="font-bold">Interview summary</h2><p className="mt-3">{result.summary}</p>{result.nextSteps?.length > 0 && <ul className="mt-3 list-disc pl-5">{result.nextSteps.map((step) => <li key={step}>{step}</li>)}</ul>}</section>}
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300"><strong>Evaluation source: {result.provider === "local" || result.fallbackUsed || !semantic ? "Local Backup" : result.provider === "gemini" ? "Gemini" : "AI provider"}. Evaluation mode:</strong> {result.evaluationMode || "Local practice rubric"}. {result.evaluationMode?.startsWith("AI semantic") ? "AI evaluated answer relevance, reasoning and technical content. Fluency is a communication proxy, not psychological confidence." : localRubric ? "Local scoring estimates concept coverage, relevance and answer structure. It does not verify factual correctness." : "This fallback measures response completeness only, not technical correctness."}</div><section className="grid gap-4 sm:grid-cols-2">{(assessed ? feedback.metrics : []).map(({key,label,value})=><div key={key} className="surface-card interactive-card rounded-2xl p-5"><div className="flex items-center justify-between"><p className="font-bold">{key==="confidence"?"Communication fluency (proxy)":label}</p><span className="text-lg font-black text-indigo-600 dark:text-indigo-300">{value}%</span></div><div className="mt-4 h-2 rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-full rounded-full bg-indigo-600" style={{width:`${value}%`}}/></div></div>)}</section>
    <section className="grid gap-5 lg:grid-cols-2"><div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950/30"><h2 className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-200"><Award size={20}/> Strengths</h2><ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-emerald-700 dark:text-emerald-300">{(result.strengths?.length?result.strengths:semantic ? feedback.strengths : ["Technical strengths have not been assessed."]).map((strength)=><li key={strength}>{strength}</li>)}</ul></div><div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/30"><h2 className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-200"><TrendingUp size={20}/> Next focus</h2><ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-amber-700 dark:text-amber-300">{(result.recommendations?.length?result.recommendations:semantic ? feedback.recommendations : ["Repeat with semantic AI evaluation to assess relevance and correctness."]).map((recommendation)=><li key={recommendation}>{recommendation}</li>)}</ul></div></section>
    {Number.isFinite(result.metrics?.answerRelevance)&&<p className="surface-card rounded-xl p-4">Answer relevance: {result.metrics.answerRelevance}%</p>}
    {result.weaknesses?.length>0&&<section className="surface-card rounded-3xl p-6"><h2 className="font-bold">Areas to improve</h2><ul>{result.weaknesses.map((item)=><li key={item}>{item}</li>)}</ul></section>}
    {result.weakTopics?.length>0&&<section className="surface-card rounded-3xl p-6"><h2 className="font-bold">Weak topics</h2>{result.weakTopics.map((item)=><p key={item.topic}>{item.topic}: {item.score}% ? {item.reason}</p>)}</section>}
    {result.questionFeedback?.length>0&&<section className="surface-card space-y-5 rounded-3xl p-6"><h2 className="font-bold">Question-by-question feedback</h2>{result.questionFeedback.map((item,i)=><article key={i}><h3 className="font-semibold">{i+1}. {item.question} ({item.score}%)</h3><p className="mt-3 text-xs font-bold uppercase text-gray-500">Your answer</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{item.answer || "Answer unavailable for this older report."}</p><p className="mt-3 text-sm leading-6">{item.feedback}</p><h4 className="mt-4 font-bold text-indigo-600 dark:text-indigo-300">{item.provider === "local" ? "Answer review guide" : "Strong sample answer"}</h4><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-500 dark:text-gray-400">{item.idealAnswer || item.betterApproach || "A sample answer is unavailable for this offline evaluation."}</p>{item.betterApproach && <><h4 className="mt-4 font-bold">Better approach</h4><p className="mt-2 text-sm leading-6">{item.betterApproach}</p></>}</article>)}</section>}
    <CareerRoadmap score={score} module={`${result.type || "Mixed"} interview`} role={result.role} topicPerformance={(assessed ? feedback.metrics : []).map((metric)=>({topic:metric.label,percentage:metric.value}))}/>
    <div className="flex flex-wrap justify-end gap-3"><Link to="/interview/setup" className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold dark:border-gray-700"><RotateCcw size={17}/> Try again</Link><Link to="/learning" state={{resultId:result.id,module:"interview",placementLevel:"status",placementMode:result.mode==="placement",topicPerformance:result.weakTopics?.length?result.weakTopics.map((item)=>({topic:item.topic,percentage:item.score})):feedback.metrics.filter((item)=>item.value<80).map((item)=>({topic:item.label,percentage:item.value}))}} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white"><Sparkles size={17}/> Open Learning Hub</Link></div></div>;
}

export default InterviewResult;

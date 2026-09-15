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
  const feedback = getInterviewFeedback(result.metrics);
  const score = Math.max(0, Math.min(100, Math.round(Number(result.score) || 0)));
  return <div className="mx-auto max-w-5xl space-y-6"><section className="surface-card relative overflow-hidden rounded-3xl p-8 sm:p-10"><div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl"/><div className="relative flex flex-col gap-7 sm:flex-row sm:items-center"><div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[10px] border-indigo-100 text-3xl font-black text-indigo-600 dark:border-indigo-950 dark:text-indigo-300">{score}%</div><div><p className="flex items-center gap-2 text-sm font-bold text-emerald-600"><CheckCircle2 size={17}/> Interview complete</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight">{getInterviewHeadline(score)}</h1><p className="mt-2 text-gray-500 dark:text-gray-400">{result.role || "Software Engineer"} · {result.type || "Mixed"} interview</p></div></div></section>
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300"><strong>Evaluation mode:</strong> {result.evaluationMode || "Local practice rubric"}. Scores measure response completion and depth; they are not semantic AI analysis.</div><section className="grid gap-4 sm:grid-cols-2">{feedback.metrics.map(({key,label,value})=><div key={key} className="surface-card interactive-card rounded-2xl p-5"><div className="flex items-center justify-between"><p className="font-bold">{label}</p><span className="text-lg font-black text-indigo-600 dark:text-indigo-300">{value}%</span></div><div className="mt-4 h-2 rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-full rounded-full bg-indigo-600" style={{width:`${value}%`}}/></div></div>)}</section>
    <section className="grid gap-5 lg:grid-cols-2"><div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950/30"><h2 className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-200"><Award size={20}/> Strengths</h2><ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-emerald-700 dark:text-emerald-300">{feedback.strengths.map((strength)=><li key={strength}>{strength}</li>)}</ul></div><div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/30"><h2 className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-200"><TrendingUp size={20}/> Next focus</h2><ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-amber-700 dark:text-amber-300">{feedback.recommendations.map((recommendation)=><li key={recommendation}>{recommendation}</li>)}</ul></div></section>
    <CareerRoadmap score={score} module={`${result.type || "Mixed"} interview`} role={result.role} topicPerformance={feedback.metrics.map((metric)=>({topic:metric.label,percentage:metric.value}))}/>
    <div className="flex flex-wrap justify-end gap-3"><Link to="/interview/setup" className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold dark:border-gray-700"><RotateCcw size={17}/> Try again</Link><Link to="/learning" className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white"><Sparkles size={17}/> Open Learning Hub</Link></div></div>;
}

export default InterviewResult;

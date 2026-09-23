import { useEffect, useState } from "react";
import { ArrowRight, Brain, Code2, Globe, Layers, Mic } from "lucide-react";
import { Link } from "react-router-dom";
import { authorizedRequest } from "../services/authService";
import { hasRemoteApi } from "../services/api";
const categories = { programming: ["Programming", Code2, "coding practice"], webDevelopment: ["Web Development", Globe, "a resume analysis"], coreCS: ["Core CS", Layers, "a resume analysis"], problemSolving: ["Problem Solving", Brain, "aptitude practice"], interviewReadiness: ["Interview Readiness", Mic, "an interview"] };
export default function SkillBaseline({ refreshKey = 0 }) {
  const [baseline, setBaseline] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!hasRemoteApi) return;
    let active = true;
    authorizedRequest("/api/baseline").then((value) => { if (active) setBaseline(value); }).catch((failure) => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [refreshKey]);
  const items = baseline?.categories || Object.keys(categories).map((category) => ({ category, estimate: null, latestScore: null }));
  return <section className="surface-card rounded-3xl p-6 sm:p-7"><div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-extrabold">Skill baseline</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your latest skill signals. Resume estimates and measured results stay separate.</p></div><Link to="/resume" className="flex shrink-0 items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-300">View details <ArrowRight size={16}/></Link></div>{error && <p role="status" className="mt-3 text-sm text-amber-600">{error}</p>}<div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{items.map((item) => {
    const [label, Icon, activity] = categories[item.category] || [item.category, Brain, "an assessment"];
    const estimate = Number.isFinite(item.estimate), measured = Number.isFinite(item.latestScore);
    return <article key={item.category} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-800/45"><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><Icon size={18}/></div><h3 className="text-sm font-extrabold">{label}</h3>{estimate || measured ? <><dl className="mt-3 space-y-2 text-xs"><div className="flex justify-between gap-2"><dt className="text-gray-500 dark:text-gray-400">Resume estimate</dt><dd className="font-bold">{estimate ? `${item.estimate}%` : "—"}</dd></div><div className="flex justify-between gap-2"><dt className="text-gray-500 dark:text-gray-400">Latest assessment</dt><dd className="font-bold text-indigo-600 dark:text-indigo-300">{measured ? `${item.latestScore}%` : "—"}</dd></div></dl><p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Evidence: {measured && item.source ? item.source : "Resume estimate"}</p></> : <><p className="mt-3 text-sm font-semibold text-gray-600 dark:text-gray-300">No evidence yet</p><p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">Complete {activity} to establish this score.</p></>}</article>;
  })}</div></section>;
}

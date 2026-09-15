import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, History as HistoryIcon, RefreshCw, Search, Sparkles, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { getHistory, getSyncedHistory, HISTORY_UPDATED_EVENT } from "../services/history";
import CareerRoadmap from "../components/CareerRoadmap";

function getCategory(item) {
  const value = `${item.type} ${item.title}`.toLowerCase();
  if (value.includes("interview")) return "Interview";
  if (value.includes("coding")) return "Coding";
  return "Aptitude";
}

function History() {
  const [attempts, setAttempts] = useState(getHistory);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [syncing, setSyncing] = useState(true);
  const [syncError, setSyncError] = useState("");
  const [roadmapId, setRoadmapId] = useState("");

  const syncHistory = () => {
    setSyncing(true);
    setSyncError("");
    return getSyncedHistory()
      .then(setAttempts)
      .catch((error) => setSyncError(error.message || "Unable to sync activity."))
      .finally(() => setSyncing(false));
  };

  useEffect(() => {
    const refresh = () => setAttempts(getHistory());
    let active = true;
    getSyncedHistory()
      .then((entries) => active && setAttempts(entries))
      .catch((error) => active && setSyncError(error.message || "Unable to sync activity."))
      .finally(() => active && setSyncing(false));
    window.addEventListener(HISTORY_UPDATED_EVENT, refresh);
    return () => {
      active = false;
      window.removeEventListener(HISTORY_UPDATED_EVENT, refresh);
    };
  }, []);

  const average = useMemo(() => attempts.length
    ? Math.round(attempts.reduce((sum, item) => sum + item.score, 0) / attempts.length)
    : 0, [attempts]);
  const visibleAttempts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return attempts.filter((item) =>
      (filter === "All" || getCategory(item) === filter) &&
      (!normalizedQuery || `${item.title} ${item.type}`.toLowerCase().includes(normalizedQuery))
    );
  }, [attempts, filter, query]);
  const formatDate = (item) => new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(item.createdAt));

  return <div className="space-y-7"><header><p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Activity archive</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Your preparation history</h1><p className="mt-2 text-gray-500 dark:text-gray-400">Review attempts, spot patterns, and turn practice into measurable progress.</p></header>
    <section className="grid gap-4 sm:grid-cols-3">{[[attempts.length,"Total sessions",HistoryIcon,"bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40"],[attempts.length ? `${average}%` : "—","Average score",TrendingUp,"bg-teal-50 text-teal-600 dark:bg-teal-950/40"],[syncing ? "Syncing" : syncError ? "Offline" : attempts.length ? "Synced" : "Ready","Activity status",Clock3,"bg-amber-50 text-amber-600 dark:bg-amber-950/40"]].map(([value,label,Icon,tone])=><div key={label} className="surface-card interactive-card rounded-2xl p-5"><div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon size={20}/></div><p className="text-2xl font-black">{value}</p><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{label}</p></div>)}</section>
    {syncError&&<div className="flex flex-col justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300 sm:flex-row sm:items-center"><p>Your local activity is still available. {syncError}</p><button type="button" disabled={syncing} onClick={syncHistory} className="flex shrink-0 items-center gap-2 font-bold"><RefreshCw size={15} className={syncing ? "animate-spin" : ""}/> Retry sync</button></div>}
    <section className="surface-card overflow-hidden rounded-3xl"><div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800"><div className="flex items-center justify-between"><div><h2 className="font-bold">Recent attempts</h2><p className="mt-1 text-sm text-gray-500">{visibleAttempts.length} of {attempts.length} sessions</p></div><CalendarDays className="text-gray-400" size={21}/></div>{attempts.length>0&&<div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><label className="relative block lg:max-w-sm lg:flex-1"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/><span className="sr-only">Search attempts</span><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search attempts" className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-900"/></label><div className="flex gap-2 overflow-x-auto">{["All","Aptitude","Coding","Interview"].map((name)=><button key={name} type="button" onClick={()=>setFilter(name)} className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${filter===name?"bg-indigo-600 text-white":"bg-gray-100 text-gray-500 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-300"}`}>{name}</button>)}</div></div>}</div>{attempts.length ? visibleAttempts.length ? <div className="divide-y divide-gray-100 dark:divide-gray-800">{visibleAttempts.map((item)=><article key={item.id} className="flex flex-col gap-4 p-5 transition hover:bg-gray-50/80 dark:hover:bg-gray-800/35 sm:flex-row sm:items-center"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"><CheckCircle2 size={21}/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{item.title}</h3><span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-500 dark:bg-gray-800">{item.type}</span></div><p className="mt-1 text-sm text-gray-500">{formatDate(item)} · {item.duration}</p></div><div className="flex items-center justify-between gap-5 sm:justify-end"><div className="sm:text-right"><p className={`text-xl font-black ${item.score >= 70 ? "text-emerald-600" : "text-amber-600"}`}>{item.score}%</p><p className="text-xs text-gray-400">Score</p></div>{item.type === "Interview" && <Link to={`/interview/result/${item.id}`} aria-label={`View ${item.title} result`} className="rounded-xl border border-gray-200 p-2.5 text-gray-500 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-gray-700"><ArrowRight size={17}/></Link>}</div></article>)}</div> : <div className="px-6 py-12 text-center"><Search className="mx-auto text-gray-300" size={25}/><h3 className="mt-3 font-bold">No matching attempts</h3><p className="mt-1 text-sm text-gray-500">Try another search or category.</p><button type="button" onClick={()=>{setQuery("");setFilter("All");}} className="mt-4 text-sm font-bold text-indigo-600">Clear filters</button></div> : <div className="px-6 py-14 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-950/40"><Sparkles size={25}/></div><h3 className="mt-4 text-lg font-bold">No sessions yet</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">Complete an aptitude quiz, coding exercise, or mock interview and the result will appear here.</p><Link to="/practice/aptitude" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700">Start practicing <ArrowRight size={16}/></Link></div>}</section>
    {attempts.length>0&&<section className="space-y-4"><div className="surface-card flex flex-col justify-between gap-4 rounded-2xl p-5 sm:flex-row sm:items-center"><div><p className="text-sm font-bold text-indigo-600 dark:text-indigo-300">Saved career roadmaps</p><p className="mt-1 text-sm text-gray-500">Reopen a performance plan from any previous activity.</p></div><select value={roadmapId} onChange={(event)=>setRoadmapId(event.target.value)} className="max-w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold dark:border-gray-700 dark:bg-gray-900"><option value="">Choose an attempt</option>{attempts.map((item)=><option key={item.id} value={item.id}>{item.title} · {item.score}%</option>)}</select></div>{roadmapId&&(()=>{const item=attempts.find((attempt)=>attempt.id===roadmapId);return item?<CareerRoadmap score={item.score} module={item.type} topicPerformance={item.topicPerformance}/>:null;})()}</section>}
  </div>;
}

export default History;

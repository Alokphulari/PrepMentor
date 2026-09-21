import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, Award, BarChart3, Sparkles, Target, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getHistory, getSyncedHistory, HISTORY_UPDATED_EVENT } from "../services/history";

const categoryColors = {
  Aptitude: "bg-indigo-500",
  Coding: "bg-teal-500",
  Interview: "bg-violet-500",
};

function getCategory(item) {
  const value = `${item.type} ${item.title}`.toLowerCase();
  if (value.includes("interview")) return "Interview";
  if (value.includes("coding")) return "Coding";
  return "Aptitude";
}

function Performance() {
  const [history, setAttempts] = useState(getHistory);
  const attempts = useMemo(()=>history.filter((item)=>/aptitude|coding|interview/i.test(item.type)&&item.evidenceType!=="semantic-or-static-review"&&item.evidenceType!=="self-reported"&&!(item.evaluationMode||"").includes("rubric")),[history]);

  useEffect(() => {
    let active = true;
    const refresh = () => setAttempts(getHistory());
    getSyncedHistory().then((entries) => active && setAttempts(entries)).catch(() => {});
    window.addEventListener(HISTORY_UPDATED_EVENT, refresh);
    return () => {
      active = false;
      window.removeEventListener(HISTORY_UPDATED_EVENT, refresh);
    };
  }, []);

  const analytics = useMemo(() => {
    const ordered = [...attempts].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const average = attempts.length
      ? Math.round(attempts.reduce((sum, item) => sum + item.score, 0) / attempts.length)
      : 0;
    const best = attempts.length ? Math.max(...attempts.map((item) => item.score)) : 0;
    const recent = ordered.slice(-8).map((item, index) => ({
      name: ordered.length > 8 ? `${ordered.length - 7 + index}` : `${index + 1}`,
      score: item.score,
      title: item.title,
    }));
    const categories = ["Aptitude", "Coding", "Interview"].map((name) => {
      const entries = attempts.filter((item) => getCategory(item) === name);
      return {
        name,
        count: entries.length,
        average: entries.length ? Math.round(entries.reduce((sum, item) => sum + item.score, 0) / entries.length) : 0,
      };
    });
    const firstHalf = ordered.slice(0, Math.max(1, Math.floor(ordered.length / 2)));
    const secondHalf = ordered.slice(Math.floor(ordered.length / 2));
    const mean = (items) => items.length ? items.reduce((sum, item) => sum + item.score, 0) / items.length : 0;
    const improvement = ordered.length > 1 ? Math.round(mean(secondHalf) - mean(firstHalf)) : 0;
    const topics=new Map();
    [...attempts].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).forEach((item)=>(item.topicPerformance||[]).forEach((topic)=>{if(!topics.has(topic.topic))topics.set(topic.topic,topic.percentage);}));
    const weakest=[...topics].sort((a,b)=>a[1]-b[1]).slice(0,5);
    return { average, best, recent, categories, improvement, weakest };
  }, [attempts]);

  if (!attempts.length) return <div className="space-y-7"><header><p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Performance analytics</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Turn practice into progress.</h1></header><section className="surface-card rounded-3xl px-6 py-16 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-950/40"><Sparkles size={29}/></div><h2 className="mt-5 text-xl font-extrabold">Your analytics will appear here</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">Complete your first practice session to unlock score trends, category averages, and improvement insights.</p><Link to="/practice/aptitude" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700">Start a session <ArrowRight size={16}/></Link></section></div>;

  return <div className="space-y-7"><header><p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Performance analytics</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">See where your preparation is heading.</h1><p className="mt-2 text-gray-500 dark:text-gray-400">Insights are calculated from your real aptitude, coding, and interview attempts.</p></header>
    {analytics.weakest.length>0&&<section className="surface-card rounded-3xl p-6"><h2 className="font-bold">Areas to focus on</h2>{analytics.weakest.map(([topic,score])=><p key={topic}>{topic}: {score}% on latest evidence</p>)}</section>}<section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={Activity} label="Total attempts" value={attempts.length}/><Metric icon={Target} label="Average score" value={`${analytics.average}%`}/><Metric icon={Award} label="Personal best" value={`${analytics.best}%`}/><Metric icon={TrendingUp} label="Score movement" value={`${analytics.improvement > 0 ? "+" : ""}${analytics.improvement}%`} positive={analytics.improvement >= 0}/></section>
    <section className="grid items-start gap-6 xl:grid-cols-[1.25fr_0.75fr]"><div className="surface-card rounded-3xl p-6 sm:p-7"><div className="flex items-center justify-between"><div><h2 className="text-lg font-extrabold">Recent score trend</h2><p className="mt-1 text-sm text-gray-500">Your latest {analytics.recent.length} attempts</p></div><BarChart3 className="text-indigo-500" size={22}/></div><div className="mt-6 h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={analytics.recent} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}><CartesianGrid strokeDasharray="4 4" stroke="currentColor" opacity={0.1}/><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12 }}/><YAxis domain={[0,100]} tickLine={false} axisLine={false} tick={{ fontSize: 12 }}/><Tooltip formatter={(value) => [`${value}%`, "Score"]} labelFormatter={(_, payload) => payload?.[0]?.payload?.title || "Attempt"} contentStyle={{ borderRadius: 14, border: "1px solid #e5e7eb" }}/><Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: "#4f46e5" }} activeDot={{ r: 6 }}/></LineChart></ResponsiveContainer></div></div>
      <div className="surface-card rounded-3xl p-6 sm:p-7"><h2 className="text-lg font-extrabold">Category breakdown</h2><p className="mt-1 text-sm text-gray-500">Average by practice type</p><div className="mt-6 space-y-6">{analytics.categories.map((category)=><div key={category.name}><div className="flex items-end justify-between"><div><p className="font-bold">{category.name}</p><p className="mt-0.5 text-xs text-gray-400">{category.count} {category.count === 1 ? "attempt" : "attempts"}</p></div><span className="text-lg font-black">{category.count ? `${category.average}%` : "—"}</span></div><div className="mt-3 h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"><div className={`h-full rounded-full transition-all duration-700 ${categoryColors[category.name]}`} style={{ width: `${category.average}%` }}/></div></div>)}</div><Link to="/history" className="mt-7 flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-300">View all attempts <ArrowRight size={16}/></Link></div></section>
    <section className="surface-card overflow-hidden rounded-3xl p-6 sm:p-7"><h2 className="text-lg font-extrabold">Recent Performance</h2><div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-700"><tr>{["Assessment","Score","Performance","Date"].map((label)=><th key={label} className="px-3 py-3">{label}</th>)}</tr></thead><tbody>{[...attempts].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).map((item)=><tr key={item.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800"><td className="px-3 py-4 font-semibold">{item.title}<span className="mt-1 block text-xs font-normal text-gray-500">{item.role} {item.duration}</span></td><td className="px-3 py-4 font-bold text-indigo-600 dark:text-indigo-300">{item.score}%</td><td className="px-3 py-4">{item.score>=80?"Excellent":item.score>=70?"Good":item.score>=60?"Improving":"Needs Work"}</td><td className="whitespace-nowrap px-3 py-4">{getCategory(item)==="Interview"&&<span className="mb-1 block text-xs font-bold text-gray-500">Interview date</span>}<time dateTime={item.createdAt}>{Number.isFinite(Date.parse(item.createdAt))?new Intl.DateTimeFormat("en-IN",{day:"numeric",month:"short",year:"numeric",...(getCategory(item)==="Interview"?{hour:"numeric",minute:"2-digit"}:{})}).format(new Date(item.createdAt)):"Date unavailable"}</time></td></tr>)}</tbody></table></div></section>
  </div>;
}

function Metric({ icon: Icon, label, value, positive = true }) {
  return <div className="surface-card interactive-card rounded-2xl p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300"><Icon size={20}/></div><p className={`mt-4 text-2xl font-black ${positive ? "" : "text-amber-600"}`}>{value}</p><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{label}</p></div>;
}

export default Performance;

import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Brain, CheckCircle2, Clock3, Code2, Flame, Mic, Sparkles, Target, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePlacement } from "../context/PlacementContext";
import DailyChecks from "../components/DailyChecks";
import { DAILY_ACTIVITY_UPDATED_EVENT, getDailyActivity, getLocalDateKey } from "../services/dailyActivity";
import { getHistory, getSyncedHistory, HISTORY_UPDATED_EVENT } from "../services/history";
import { calculateActivityStreak, getAchievementProgress } from "../utils/achievements";
import { getDashboardInsights } from "../utils/dashboardInsights";

const actions = [
  { title: "Aptitude practice", description: "Sharpen quantitative, logical, and verbal skills.", path: "/practice/aptitude", icon: Brain, tone: "indigo" },
  { title: "Coding lab", description: "Work through an interview-style coding problem.", path: "/coding-interview", icon: Code2, tone: "teal" },
  { title: "Mock interview", description: "Practice clear answers in a realistic session.", path: "/interview/setup", icon: Mic, tone: "violet" },
];

const toneClasses = {
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300",
  teal: "bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-300",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300",
};

function getPlacementSummary(state) {
  const steps = [
    ["Aptitude Easy", state.aptitude.easy], ["Aptitude Medium", state.aptitude.medium], ["Aptitude Hard", state.aptitude.hard],
    ["Coding Easy", state.coding.easy], ["Coding Medium", state.coding.medium], ["Coding Hard", state.coding.hard],
    ["AI Interview", state.interview.status],
  ];
  const completed = steps.filter(([, status]) => status === "passed").length;
  const current = steps.find(([, status]) => status === "available" || status === "failed") || ["Journey complete", "passed"];
  return { steps, completed, current, readiness: Math.round((completed / steps.length) * 100) };
}

function DashboardHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { placementState } = usePlacement();
  const [history, setHistory] = useState(getHistory);
  const [dailyActivity, setDailyActivity] = useState(getDailyActivity);

  useEffect(() => {
    let active = true;
    const refresh = () => setHistory(getHistory());
    const refreshDailyActivity = () => setDailyActivity(getDailyActivity());
    getSyncedHistory()
      .then((entries) => {
        if (active) setHistory(entries);
      })
      .catch(() => {
        // Keep the local cache visible when the API is unavailable.
      });
    window.addEventListener(HISTORY_UPDATED_EVENT, refresh);
    window.addEventListener(DAILY_ACTIVITY_UPDATED_EVENT, refreshDailyActivity);
    return () => {
      active = false;
      window.removeEventListener(HISTORY_UPDATED_EVENT, refresh);
      window.removeEventListener(DAILY_ACTIVITY_UPDATED_EVENT, refreshDailyActivity);
    };
  }, []);
  const placement = getPlacementSummary(placementState);
  const average = history.length ? Math.round(history.reduce((sum, item) => sum + item.score, 0) / history.length) : 0;
  const achievementProgress = getAchievementProgress(history, placementState);
  const insights = getDashboardInsights(history);
  const streak = achievementProgress.streak;
  const badges = achievementProgress.earnedCount;
  const firstName = (user?.name || user?.fullName || "there").split(" ")[0];
  const placementPath = placement.current[0].startsWith("Coding") ? "/placement/coding" : placement.current[0] === "AI Interview" ? "/interview/setup" : "/placement/aptitude";
  const activityDays = [...new Set([...dailyActivity, ...history.map((item) => getLocalDateKey(item.createdAt)).filter(Boolean)])];
  const dailyStreak = calculateActivityStreak(activityDays.map((day) => ({ createdAt: `${day}T12:00:00` })));

  return <div className="dashboard-summary space-y-8">
    <DailyChecks activityDays={activityDays} streak={dailyStreak} />
    <section className="brand-hero relative overflow-hidden rounded-3xl px-6 py-8 text-white sm:px-9 sm:py-10"><div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"/><div className="absolute bottom-0 right-1/4 h-32 w-32 rounded-full bg-violet-200/20 blur-2xl"/><div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end"><div><p className="text-sm font-bold text-violet-100">Welcome back, {firstName}</p><h1 className="mt-2 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">Build confidence one focused session at a time.</h1><p className="mt-3 max-w-xl leading-7 text-white/80">Your workspace brings practice, placement progress, and interview feedback together.</p></div><button type="button" onClick={()=>navigate(history.length ? "/learning" : "/practice/aptitude")} className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-700 shadow-xl shadow-violet-950/15 transition hover:-translate-y-0.5 hover:bg-indigo-50">{history.length ? "Review recommendations" : "Start first practice"}<ArrowRight size={17}/></button></div></section>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Sessions completed" value={history.length} icon={BookOpen} tone="indigo"/><Metric label="Average score" value={history.length ? `${average}%` : "—"} icon={Target} tone="teal"/><Metric label="Current streak" value={`${streak} ${streak === 1 ? "day" : "days"}`} icon={Flame} tone="orange"/><Metric label="Badges earned" value={badges} icon={Trophy} tone="amber"/></section>

    <section className="surface-card rounded-3xl p-6 sm:p-7"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400">Performance pulse</p><h2 className="mt-2 text-2xl font-extrabold">Your preparation balance</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Live averages based only on completed attempts.</p></div><button type="button" onClick={()=>navigate("/performance")} className="flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-300">Open analytics <ArrowRight size={16}/></button></div><div className="mt-6 grid gap-4 md:grid-cols-3">{insights.performance.map((item)=>{const Icon=item.id==="aptitude"?Brain:item.id==="coding"?Code2:Mic;return <div key={item.id} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-5 dark:border-gray-700 dark:bg-gray-800/45"><div className="flex items-center justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm dark:bg-gray-900 dark:text-indigo-300"><Icon size={19}/></div><span className={`text-2xl font-black ${item.average===null?"text-gray-300 dark:text-gray-600":item.average>=70?"text-emerald-600":"text-amber-600"}`}>{item.average===null?"—":`${item.average}%`}</span></div><p className="mt-4 font-extrabold">{item.label}</p><p className="mt-1 text-xs text-gray-500">{item.attempts} completed {item.attempts===1?"attempt":"attempts"}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"><div className={`h-full rounded-full ${item.average>=70?"bg-emerald-500":"bg-amber-500"}`} style={{width:`${item.average||0}%`}}/></div></div>})}</div><div className="mt-5 flex flex-col gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5 dark:border-indigo-900/60 dark:bg-indigo-950/25 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-indigo-500">Recommended next step</p><p className="mt-1 font-bold text-gray-800 dark:text-gray-100">{insights.recommendation}</p></div><button type="button" onClick={()=>navigate(insights.weakest?.id==="coding"?"/coding-interview":insights.weakest?.id==="interview"?"/interview/setup":"/practice/aptitude")} className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">Practice now</button></div></section>

    <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]"><div className="surface-card rounded-3xl p-6 sm:p-7"><div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">Placement journey</p><h2 className="mt-2 text-2xl font-extrabold">{placement.current[0]}</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{placement.current[1] === "failed" ? "Review weak areas, then retry this level." : "Your next available milestone."}</p></div><div className="text-right"><p className="text-2xl font-black text-indigo-600 dark:text-indigo-300">{placement.readiness}%</p><p className="text-xs text-gray-400">ready</p></div></div><div className="mt-6 h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-teal-500 transition-all duration-700" style={{width:`${placement.readiness}%`}}/></div><div className="mt-6 grid grid-cols-7 gap-1.5">{placement.steps.map(([label,status],index)=><div key={label} title={`${label}: ${status}`} className={`h-2 rounded-full ${status === "passed" ? "bg-emerald-500" : status === "available" || status === "failed" ? "bg-indigo-500" : "bg-gray-200 dark:bg-gray-700"}`} aria-label={`${index+1}. ${label}: ${status}`}/>)}</div><button type="button" onClick={()=>navigate(placement.current[0] === "Journey complete" ? "/placement" : placementPath)} className="mt-6 flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-300">{placement.current[0] === "Journey complete" ? "View completed journey" : "Continue placement"}<ArrowRight size={16}/></button></div>
      <div className="surface-card rounded-3xl p-6 sm:p-7"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400">Latest activity</p><h2 className="mt-2 text-xl font-extrabold">Recent sessions</h2></div><Clock3 size={21} className="text-gray-400"/></div>{history.length ? <div className="mt-5 space-y-4">{history.slice(0,3).map((item)=><div key={item.id} className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"><CheckCircle2 size={18}/></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{item.title}</p><p className="text-xs text-gray-400">{new Intl.DateTimeFormat("en-IN",{day:"numeric",month:"short"}).format(new Date(item.createdAt))}</p></div><span className="text-sm font-black text-gray-700 dark:text-gray-200">{item.score}%</span></div>)}</div> : <div className="mt-6 rounded-2xl border border-dashed border-gray-200 p-5 text-center dark:border-gray-700"><Sparkles className="mx-auto text-indigo-400" size={24}/><p className="mt-3 text-sm font-bold">Your timeline starts here</p><p className="mt-1 text-xs leading-5 text-gray-500">Complete a practice session and it will appear automatically.</p></div>}</div></section>

    <section><div className="mb-4"><p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Quick practice</p><h2 className="mt-1 text-2xl font-extrabold">Choose your focus</h2></div><div className="grid gap-5 md:grid-cols-3">{actions.map(({title,description,path,icon:Icon,tone})=><button key={title} type="button" onClick={()=>navigate(path)} className="surface-card interactive-card group rounded-3xl p-6 text-left"><div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneClasses[tone]}`}><Icon size={23}/></div><h3 className="mt-5 text-lg font-bold">{title}</h3><p className="mt-2 min-h-10 text-sm leading-6 text-gray-500 dark:text-gray-400">{description}</p><span className="mt-5 flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-300">Open practice <ArrowRight size={16} className="transition-transform group-hover:translate-x-1"/></span></button>)}</div></section>
  </div>;
}

function Metric({ label, value, icon: Icon, tone }) {
  const classes = tone === "teal" ? "bg-teal-50 text-teal-600 dark:bg-teal-950/40" : tone === "orange" ? "bg-orange-50 text-orange-600 dark:bg-orange-950/40" : tone === "amber" ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40";
  return <div className="surface-card interactive-card rounded-2xl p-5"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${classes}`}><Icon size={20}/></div><p className="mt-4 text-2xl font-black">{value}</p><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{label}</p></div>;
}

export default DashboardHome;

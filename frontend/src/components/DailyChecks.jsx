import { CalendarCheck2, Check, Flame } from "lucide-react";
import { getLocalDateKey } from "../services/dailyActivity";

function DailyChecks({ activityDays, streak }) {
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (13 - index));
    return { date, key: getLocalDateKey(date) };
  });
  const completed = new Set(activityDays);
  const todayKey = getLocalDateKey(today);
  const completedCount = days.filter(({ key }) => completed.has(key)).length;

  return <section className="surface-card relative overflow-hidden rounded-3xl p-5 sm:p-7">
    <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl" />
    <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300"><CalendarCheck2 size={22} /></div><div><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Daily checks</p><h2 className="mt-1 text-xl font-extrabold">Show up, solve one, keep moving.</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Answer any question to check off today automatically.</p></div></div>
      <div className="flex gap-3"><div className="rounded-2xl bg-orange-50 px-4 py-3 dark:bg-orange-950/30"><p className="flex items-center gap-1 text-lg font-black text-orange-600"><Flame size={18} />{streak}</p><p className="text-[11px] font-bold text-gray-500">day streak</p></div><div className="rounded-2xl bg-indigo-50 px-4 py-3 dark:bg-indigo-950/30"><p className="text-lg font-black text-indigo-600 dark:text-indigo-300">{completedCount}/14</p><p className="text-[11px] font-bold text-gray-500">recent days</p></div></div>
    </div>
    <div className="relative mt-6 grid grid-cols-7 gap-2 sm:grid-cols-[repeat(14,minmax(0,1fr))]">{days.map(({ date, key }) => {const checked=completed.has(key);const isToday=key===todayKey;return <div key={key} title={`${date.toLocaleDateString("en-IN",{dateStyle:"medium"})}: ${checked?"completed":"not completed"}`} className="text-center"><div className={`mx-auto flex aspect-square w-full max-w-11 items-center justify-center rounded-xl border transition ${checked?"border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/20":isToday?"border-indigo-400 bg-indigo-50 text-indigo-400 ring-2 ring-indigo-400/20 dark:bg-indigo-950/40":"border-gray-200 bg-gray-50 text-gray-300 dark:border-gray-700 dark:bg-gray-800/70"}`}>{checked?<Check size={17} strokeWidth={3}/>:<span className="h-1.5 w-1.5 rounded-full bg-current"/>}</div><p className={`mt-1 text-[10px] font-bold ${isToday?"text-indigo-600 dark:text-indigo-300":"text-gray-400"}`}>{isToday?"Today":date.toLocaleDateString("en-US",{weekday:"narrow"})}</p></div>})}</div>
  </section>;
}

export default DailyChecks;

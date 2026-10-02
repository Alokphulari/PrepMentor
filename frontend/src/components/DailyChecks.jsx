import { useEffect, useState } from "react";
import { CalendarCheck2, Flame } from "lucide-react";
import { DAILY_ACTIVITY_UPDATED_EVENT, getDailyActivity, getLocalDateKey } from "../services/dailyActivity";
import { calculateActivityStreak } from "../utils/achievements";

const DAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];

function buildYearGrid(today) {
  const year = today.getFullYear();
  const months = Array.from({ length: 12 }, (_, monthIndex) => {
    const dayCount = new Date(year, monthIndex + 1, 0).getDate();
    const leadingBlanks = new Date(year, monthIndex, 1).getDay();
    const dates = Array.from({ length: dayCount }, (_, dayIndex) => {
      const date = new Date(year, monthIndex, dayIndex + 1);
      return { date, key: getLocalDateKey(date), day: dayIndex + 1 };
    });
    return {
      name: new Date(year, monthIndex, 1).toLocaleDateString("en-US", { month: "long" }),
      dayCount,
      dates,
      cells: [...Array(leadingBlanks).fill(null), ...dates],
    };
  });
  return { year, months, dates: months.flatMap((month) => month.dates) };
}

function DailyChecks({ activityDays, streak }) {
  const [savedActivity, setSavedActivity] = useState(getDailyActivity);

  useEffect(() => {
    if (Array.isArray(activityDays)) return undefined;
    const refresh = () => setSavedActivity(getDailyActivity());
    window.addEventListener(DAILY_ACTIVITY_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(DAILY_ACTIVITY_UPDATED_EVENT, refresh);
  }, [activityDays]);

  const today = new Date();
  const { year, months, dates } = buildYearGrid(today);
  const completed = new Set(Array.isArray(activityDays) ? activityDays : savedActivity);
  const todayKey = getLocalDateKey(today);
  const completedCount = dates.filter(({ key }) => completed.has(key)).length;
  const currentStreak = Number.isFinite(streak) ? streak : calculateActivityStreak([...completed].map((day) => ({ createdAt: `${day}T12:00:00` })));

  return <section className="surface-card relative overflow-hidden rounded-3xl p-5 sm:p-7">
    <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl" />
    <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300"><CalendarCheck2 size={22} /></div><div><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Daily activity · {year}</p><h2 className="mt-1 text-xl font-extrabold">Your full-year preparation streak</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Every dated box represents one real calendar day. Answer any question to mark today.</p></div></div>
      <div className="flex gap-3"><div className="rounded-2xl bg-orange-50 px-4 py-3 dark:bg-orange-950/30"><p className="flex items-center gap-1 text-lg font-black text-orange-600"><Flame size={18} />{currentStreak}</p><p className="text-[11px] font-bold text-gray-500">day streak</p></div><div className="rounded-2xl bg-emerald-50 px-4 py-3 dark:bg-emerald-950/30"><p className="text-lg font-black text-emerald-600 dark:text-emerald-300">{completedCount}</p><p className="text-[11px] font-bold text-gray-500">active days in {year}</p></div></div>
    </div>
    <div className="relative mt-7 max-w-full overflow-x-auto overscroll-x-contain pb-4" aria-label={`Daily activity for ${year}: ${completedCount} active days`} tabIndex={0}>
      <div className="flex w-max snap-x snap-mandatory gap-4 pr-2">
        {months.map((month, monthIndex) => <section key={month.name} className={`w-48 shrink-0 snap-start rounded-2xl border p-4 ${monthIndex === today.getMonth() ? "border-violet-300 bg-violet-50/50 shadow-sm dark:border-violet-800 dark:bg-violet-950/20" : "border-gray-200 bg-gray-50/60 dark:border-gray-700 dark:bg-gray-800/40"}`} aria-label={`${month.name}, ${month.dayCount} days`}>
          <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-extrabold">{month.name}</h3><span className="text-[10px] font-bold text-gray-400">{month.dayCount} days</span></div>
          <div className="mb-1.5 grid grid-cols-7 gap-1">{DAY_NAMES.map((name, index) => <span key={`${name}-${index}`} className="text-center text-[9px] font-bold text-gray-400">{name}</span>)}</div>
          <div className="grid grid-cols-7 gap-1">{month.cells.map((entry, index) => {
            if (!entry) return <span key={`blank-${index}`} className="aspect-square" aria-hidden="true" />;
            const checked = completed.has(entry.key);
            const isToday = entry.key === todayKey;
            const isFuture = entry.date > today;
            const label = `${entry.date.toLocaleDateString("en-IN", { dateStyle: "medium" })}: ${checked ? "activity completed" : isFuture ? "upcoming" : "no activity"}`;
            return <span key={entry.key} title={label} aria-label={label} className={`flex aspect-square items-center justify-center rounded-md border text-[9px] font-bold transition ${checked ? "border-emerald-500 bg-emerald-500 text-white shadow-sm" : isFuture ? "border-gray-100 bg-transparent text-gray-300 dark:border-gray-800 dark:text-gray-600" : "border-gray-200 bg-white text-gray-400 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900"} ${isToday ? "ring-2 ring-violet-500 ring-offset-1 dark:ring-offset-gray-900" : ""}`}>{entry.day}</span>;
          })}</div>
        </section>)}
      </div>
    </div>
    <p className="mt-1 text-center text-[11px] font-semibold text-gray-400">Scroll horizontally to view January through December · resets automatically for each calendar year</p>
  </section>;
}

export default DailyChecks;

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Award, BookOpenCheck, BrainCircuit, Braces, Check, Code2, Compass, Crown, Flame, Gem, GraduationCap, LockKeyhole, Medal, MessagesSquare, Mic, Puzzle, Rocket, ShieldCheck, Sparkles, Target, Terminal, Trophy } from "lucide-react";
import { usePlacement } from "../context/PlacementContext";
import { getHistory, getSyncedHistory, HISTORY_UPDATED_EVENT } from "../services/history";
import { getAchievementProgress } from "../utils/achievements";

const icons = { sparkles: Sparkles, book: BookOpenCheck, code: Code2, mic: Mic, target: Target, flame: Flame, trophy: Trophy, award: Award, brain: BrainCircuit, puzzle: Puzzle, terminal: Terminal, braces: Braces, messages: MessagesSquare, graduation: GraduationCap, rocket: Rocket, gem: Gem, medal: Medal, compass: Compass, shield: ShieldCheck, crown: Crown };
const categories = {
  Consistency: { gradient: "from-amber-400 to-orange-600", ink: "text-amber-700 dark:text-amber-300", tint: "bg-amber-50 dark:bg-amber-950/30", ring: "border-amber-200 dark:border-amber-800", path: "/practice" },
  Aptitude: { gradient: "from-teal-400 to-emerald-600", ink: "text-teal-700 dark:text-teal-300", tint: "bg-teal-50 dark:bg-teal-950/30", ring: "border-teal-200 dark:border-teal-800", path: "/practice/aptitude" },
  Coding: { gradient: "from-sky-400 to-blue-600", ink: "text-blue-700 dark:text-blue-300", tint: "bg-blue-50 dark:bg-blue-950/30", ring: "border-blue-200 dark:border-blue-800", path: "/coding-interview" },
  Interviews: { gradient: "from-fuchsia-400 to-purple-600", ink: "text-purple-700 dark:text-purple-300", tint: "bg-purple-50 dark:bg-purple-950/30", ring: "border-purple-200 dark:border-purple-800", path: "/interview/setup" },
  Performance: { gradient: "from-rose-400 to-pink-600", ink: "text-rose-700 dark:text-rose-300", tint: "bg-rose-50 dark:bg-rose-950/30", ring: "border-rose-200 dark:border-rose-800", path: "/practice" },
  Placement: { gradient: "from-indigo-400 to-violet-600", ink: "text-indigo-700 dark:text-indigo-300", tint: "bg-indigo-50 dark:bg-indigo-950/30", ring: "border-indigo-200 dark:border-indigo-800", path: "/placement" },
};

function BadgeEmblem({ badge, small = false }) {
  const Icon = icons[badge.icon];
  const tone = categories[badge.category];
  return <div aria-hidden="true" className={`relative flex shrink-0 items-center justify-center ${small ? "h-16 w-16" : "h-24 w-24"}`}>
    <div className={`absolute inset-1 rotate-12 rounded-[28%] border ${tone.ring} ${tone.tint}`} />
    <div className={`relative flex h-4/5 w-4/5 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br text-white shadow-lg dark:border-gray-900 ${tone.gradient} ${badge.earned ? "" : "opacity-60"}`}><Icon size={small ? 23 : 32} strokeWidth={1.7} /></div>
    <span className={`absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-white dark:border-gray-900 ${badge.earned ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300"}`}>{badge.earned ? <Check size={13} strokeWidth={3} /> : <LockKeyhole size={12} />}</span>
  </div>;
}

function Achievements() {
  const [history, setHistory] = useState(getHistory);
  const [filter, setFilter] = useState("All badges");
  const [category, setCategory] = useState("All categories");
  const { placementState } = usePlacement();
  useEffect(() => {
    let active = true;
    const refresh = () => setHistory(getHistory());
    getSyncedHistory().then((entries) => { if (active) setHistory(entries); }).catch(() => { /* Local progress remains available offline. */ });
    window.addEventListener(HISTORY_UPDATED_EVENT, refresh);
    return () => { active = false; window.removeEventListener(HISTORY_UPDATED_EVENT, refresh); };
  }, []);

  const { achievements, earnedCount } = getAchievementProgress(history, placementState);
  const percentage = Math.round(earnedCount / achievements.length * 100);
  const nextBadge = achievements.filter((badge) => !badge.earned).sort((a, b) => b.percent - a.percent)[0];
  const visible = achievements.filter((badge) => (filter === "All badges" || (filter === "Earned" ? badge.earned : !badge.earned)) && (category === "All categories" || badge.category === category));
  const counts = { "All badges": achievements.length, Earned: earnedCount, Locked: achievements.length - earnedCount };

  return <div className="mx-auto max-w-7xl space-y-7">
    <header><p className="flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-300"><Sparkles size={16} /> Badges & achievements</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Small steps. Remarkable milestones.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">Every practice session moves you forward. Build your collection across aptitude, coding, interviews, and your Placement journey.</p></header>
    <section aria-label="Achievement collection" className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-800 p-6 text-white sm:p-8">
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-72 w-72 rounded-full border-[40px] border-white/5" />
      <div className="relative grid items-center gap-7 md:grid-cols-[1fr_auto]"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-200">Your trophy cabinet</p><div className="mt-4 flex items-baseline gap-3"><span className="text-5xl font-black tracking-tight">{earnedCount.toString().padStart(2, "0")}</span><span className="text-sm text-indigo-100">of {achievements.length} badges earned</span></div><p className="mt-3 text-sm text-indigo-100">{earnedCount === achievements.length ? "Collection complete. Keep building on your progress." : "Earned through your recorded sessions and Placement results."}</p>
        <div className="mt-6 max-w-lg"><div className="mb-2 flex justify-between text-xs font-semibold text-indigo-100"><span>Collection progress</span><span>{percentage}%</span></div><div role="progressbar" aria-label="Collection progress" aria-valuenow={earnedCount} aria-valuemin={0} aria-valuemax={achievements.length} className="h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400 transition-all motion-reduce:transition-none" style={{ width: `${percentage}%` }} /></div></div></div>
        <div aria-hidden="true" className="hidden h-36 w-36 rotate-6 items-center justify-center rounded-[2rem] border border-white/20 bg-white/10 shadow-2xl md:flex"><Trophy size={76} strokeWidth={1.3} className="text-amber-300 drop-shadow-lg" /></div>
      </div>
    </section>
    {nextBadge && <section aria-label="Next achievement" className="surface-card flex flex-col gap-5 rounded-2xl border border-indigo-100 p-5 dark:border-indigo-900 sm:flex-row sm:items-center"><BadgeEmblem badge={nextBadge} small /><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">Next to unlock</p><h2 className="mt-1 text-lg font-extrabold">{nextBadge.title}</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{nextBadge.description} <span className="font-semibold">{nextBadge.progressLabel}</span></p></div><Link to={categories[nextBadge.category].path} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700">Keep progressing <ArrowRight size={16} /></Link></section>}
    <section aria-label="Badge collection" className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div role="group" aria-label="Filter badges by status" className="flex w-fit max-w-full gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">{Object.entries(counts).map(([name, count]) => <button key={name} type="button" aria-pressed={filter === name} onClick={() => setFilter(name)} className={`rounded-lg px-3 py-2 text-xs font-bold transition sm:text-sm ${filter === name ? "bg-white text-indigo-700 shadow-sm dark:bg-gray-900 dark:text-indigo-300" : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"}`}>{name} <span className="ml-1 opacity-70">{count}</span></button>)}</div><label className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400"><span>Category</span><select aria-label="Category" value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">{["All categories", ...Object.keys(categories)].map((name) => <option key={name}>{name}</option>)}</select></label></div>
      <p role="status" className="text-xs text-gray-500 dark:text-gray-400">Showing {visible.length} of {achievements.length} badges</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{visible.map((badge) => {
        const tone = categories[badge.category];
        return <article key={badge.id} aria-label={`${badge.title}: ${badge.earned ? "earned" : "locked"}`} className={`relative flex flex-col overflow-hidden rounded-3xl border bg-white p-5 transition duration-200 motion-safe:hover:-translate-y-1 hover:shadow-lg dark:bg-gray-900 ${badge.earned ? tone.ring : "border-gray-200 dark:border-gray-800"}`}>
          <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tone.gradient} ${badge.earned ? "" : "opacity-30"}`} />
          <div className="flex items-center justify-between gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${tone.ink} ${tone.tint}`}>{badge.category}</span><span className="text-[10px] font-semibold tabular-nums text-gray-400">{String(achievements.indexOf(badge) + 1).padStart(2, "0")} / {achievements.length}</span></div>
          <div className="my-6 flex justify-center"><BadgeEmblem badge={badge} /></div><h2 className="text-center text-base font-extrabold">{badge.title}</h2><p className="mt-2 flex-1 text-center text-sm leading-6 text-gray-500 dark:text-gray-400">{badge.description}</p>
          <div className="mt-6 border-t border-gray-100 pt-4 dark:border-gray-800"><div className="mb-2 flex items-center justify-between gap-2"><span className={`text-[11px] font-bold ${badge.earned ? "text-emerald-700 dark:text-emerald-300" : "text-gray-500 dark:text-gray-400"}`}>{badge.earned ? "Unlocked" : "In progress"}</span><span className="text-xs font-bold tabular-nums text-gray-500 dark:text-gray-400">{badge.percent}%</span></div><div role="progressbar" aria-label={`${badge.title} progress`} aria-valuenow={badge.percent} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"><div className={`h-full rounded-full bg-gradient-to-r ${tone.gradient}`} style={{ width: `${badge.percent}%` }} /></div><p className="mt-2 min-h-4 text-[11px] text-gray-500 dark:text-gray-400">{badge.progressLabel}</p></div>
        </article>;
      })}</div>
      {!visible.length && <div className="surface-card rounded-3xl border border-dashed border-gray-200 p-10 text-center dark:border-gray-700"><Award size={32} className="mx-auto text-indigo-400" /><h2 className="mt-4 font-bold">{filter === "Earned" ? "Your first badge is waiting" : "No badges in this view"}</h2><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{filter === "Earned" ? "Complete a session to start your collection, or explore another category." : "Try another category or view all badges."}</p><button type="button" onClick={() => { setFilter("All badges"); setCategory("All categories"); }} className="mt-4 text-sm font-bold text-indigo-600 dark:text-indigo-300">View all badges</button></div>}
    </section>
    <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">Progress reflects saved history and current Placement status. Average-score and streak milestones can change as your activity changes.</p>
  </div>;
}

export default Achievements;

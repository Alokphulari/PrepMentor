import { useEffect, useState } from "react";
import { Award, BookOpenCheck, Code2, Flame, LockKeyhole, Mic, Sparkles, Target, Trophy } from "lucide-react";
import { usePlacement } from "../context/PlacementContext";
import { getHistory, getSyncedHistory, HISTORY_UPDATED_EVENT } from "../services/history";
import { getAchievementProgress } from "../utils/achievements";

const badgeIcons = { sparkles: Sparkles, book: BookOpenCheck, code: Code2, mic: Mic, target: Target, flame: Flame, trophy: Trophy, award: Award };

function Achievements() {
  const [history, setHistory] = useState(getHistory);
  const { placementState } = usePlacement();

  useEffect(() => {
    let active = true;
    const refresh = () => setHistory(getHistory());
    getSyncedHistory()
      .then((entries) => {
        if (active) setHistory(entries);
      })
      .catch(() => {
        // Local achievements remain available while the API is offline.
      });
    window.addEventListener(HISTORY_UPDATED_EVENT, refresh);
    return () => {
      active = false;
      window.removeEventListener(HISTORY_UPDATED_EVENT, refresh);
    };
  }, []);

  const progress = getAchievementProgress(history, placementState);
  const badges = progress.achievements.map((badge) => ({ ...badge, icon: badgeIcons[badge.icon] }));
  const earnedCount = progress.earnedCount;

  return <div className="space-y-7"><header><p className="text-sm font-bold text-amber-600 dark:text-amber-400">Badges & achievements</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Your preparation milestones.</h1><p className="mt-2 max-w-2xl text-gray-500 dark:text-gray-400">Achievements are unlocked automatically from your practice history and Placement progress.</p></header>
    <section className="surface-card rounded-3xl p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-bold">Collection progress</p><p className="mt-1 text-sm text-gray-500">{earnedCount} of {badges.length} badges earned</p></div><span className="text-3xl font-black text-amber-500">{Math.round((earnedCount / badges.length) * 100)}%</span></div><div className="mt-4 h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all" style={{ width: `${(earnedCount / badges.length) * 100}%` }} /></div></section>
    <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{badges.map(({ title, description, earned, icon: Icon }) => <article key={title} className={`rounded-3xl border p-6 transition ${earned ? "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20" : "border-gray-200 bg-white opacity-70 dark:border-gray-800 dark:bg-gray-900"}`}><div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${earned ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "bg-gray-100 text-gray-400 dark:bg-gray-800"}`}>{earned ? <Icon size={23} /> : <LockKeyhole size={21} />}</div><h2 className="mt-5 font-extrabold">{title}</h2><p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{description}</p><p className={`mt-4 text-xs font-black uppercase tracking-wider ${earned ? "text-amber-600" : "text-gray-400"}`}>{earned ? "Unlocked" : "Locked"}</p></article>)}</section>
  </div>;
}

export default Achievements;

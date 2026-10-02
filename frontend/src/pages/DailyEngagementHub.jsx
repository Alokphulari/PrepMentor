import { ArrowRight, Award, CalendarCheck2, Flame, Gamepad2 } from "lucide-react";
import { Link } from "react-router-dom";
import DailyChecks from "../components/DailyChecks";

const activities = [
  { title: "Question of the Day", description: "Solve today’s focused aptitude challenge and protect your streak.", path: "/question-of-the-day", icon: CalendarCheck2 },
  { title: "Mind-refresh Games", description: "Play short aptitude, coding recall, and pattern challenges.", path: "/games", icon: Gamepad2 },
  { title: "Badges & Achievements", description: "Review milestones earned through consistent preparation.", path: "/achievements", icon: Award },
];

function DailyEngagementHub() {
  return <div className="space-y-7"><header><p className="flex items-center gap-2 text-sm font-bold text-orange-600"><Flame size={18}/> Daily Engagement Hub</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Build momentum every day.</h1><p className="mt-3 max-w-2xl text-gray-500 dark:text-gray-400">Your daily challenge, streak activities, games, and achievements now live in one focused place.</p></header><DailyChecks/><section className="grid gap-5 md:grid-cols-3">{activities.map(({title,description,path,icon:Icon})=><Link key={path} to={path} className="surface-card interactive-card group rounded-3xl p-6"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300"><Icon size={23}/></div><h2 className="mt-5 text-xl font-extrabold">{title}</h2><p className="mt-2 min-h-16 text-sm leading-6 text-gray-500 dark:text-gray-400">{description}</p><span className="mt-5 flex items-center gap-2 text-sm font-bold text-violet-600">Open activity <ArrowRight size={16} className="transition group-hover:translate-x-1"/></span></Link>)}</section></div>;
}

export default DailyEngagementHub;

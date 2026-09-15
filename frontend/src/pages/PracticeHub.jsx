import { ArrowRight, Brain, Code2, Infinity as InfinityIcon, Mic, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const modes = [
  {
    title: "Aptitude Practice",
    description: "Generate 30–50 quantitative, logical, or verbal questions at the difficulty you choose.",
    path: "/practice/aptitude",
    icon: Brain,
    tone: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300",
    detail: "Easy · Medium · Hard",
  },
  {
    title: "Coding Practice",
    description: "Work through important interview patterns from a 1,000-position catalog in eight languages.",
    path: "/coding-interview",
    icon: Code2,
    tone: "bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-300",
    detail: "JavaScript · Python · Java · C++ and more",
  },
  {
    title: "Mock Interview",
    description: "Hear each question aloud and answer naturally with your microphone or keyboard.",
    path: "/interview/setup",
    icon: Mic,
    tone: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300",
    detail: "Technical · Behavioral · Mixed",
  },
];

function PracticeHub() {
  const navigate = useNavigate();
  return <div className="space-y-8"><header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-700 to-violet-800 px-7 py-9 text-white sm:px-10"><div className="absolute -right-14 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"/><div className="relative"><p className="flex items-center gap-2 text-sm font-bold text-indigo-200"><InfinityIcon size={18}/> Unlimited preparation</p><h1 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">Practice any skill without affecting Placement progression.</h1><p className="mt-4 max-w-2xl leading-7 text-indigo-100">Choose a mode, difficulty, and focus. Fresh LLM sessions are generated when the backend model is configured.</p></div></header>
    <section className="grid gap-5 lg:grid-cols-3">{modes.map(({title,description,path,icon:Icon,tone,detail})=><button key={path} type="button" onClick={()=>navigate(path)} className="surface-card interactive-card group rounded-3xl p-6 text-left sm:p-7"><div className={`flex h-13 w-13 items-center justify-center rounded-2xl ${tone}`}><Icon size={25}/></div><p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-gray-400">{detail}</p><h2 className="mt-2 text-xl font-extrabold">{title}</h2><p className="mt-3 min-h-20 text-sm leading-6 text-gray-500 dark:text-gray-400">{description}</p><span className="mt-5 flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-300">Open mode <ArrowRight size={16} className="transition-transform group-hover:translate-x-1"/></span></button>)}</section>
    <section className="flex items-start gap-4 rounded-3xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/25"><Sparkles className="mt-0.5 shrink-0 text-amber-500" size={22}/><div><h2 className="font-bold text-amber-900 dark:text-amber-200">Practice is always unlocked</h2><p className="mt-1 text-sm leading-6 text-amber-700 dark:text-amber-300">Use these modes as often as you want. Placement assessments remain sequential and unlock only after passing the previous stage.</p></div></section>
  </div>;
}

export default PracticeHub;

import { ArrowRight, BarChart3, Brain, Calculator, Languages, Timer } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { aptitudeCategories } from "../data/aptitudeQuestions";
import { generateAptitudeSession } from "../services/questionService";
import { APTITUDE_SESSION_KEY } from "../utils/aptitudeSession";
import { getAccountStorageKey } from "../utils/storage";

const icons = { quantitative: Calculator, logical: Brain, verbal: Languages };
const difficultyNotes = { easy: "Build accuracy", medium: "Interview standard", hard: "Stretch your reasoning" };

function AptitudePracticeHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [category, setCategory] = useState("quantitative");
  const [difficulty, setDifficulty] = useState("medium");
  const [questionCount, setQuestionCount] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const selected = aptitudeCategories.find((item) => item.id === category);
  const start = async () => {
    setLoading(true);
    setError("");
    try {
      const generated = await generateAptitudeSession({ category, difficulty, count: questionCount });
      const session = { sessionId: crypto.randomUUID(), category, difficulty, questionCount, generatedQuestions: generated.questions, generationSource: generated.source };
      try {
        sessionStorage.setItem(getAccountStorageKey(APTITUDE_SESSION_KEY, user), JSON.stringify(session));
      } catch {
        // Route state still starts the generated session when tab storage is unavailable.
      }
      navigate("/practice/aptitude/quiz", { state: session });
    } catch (generationError) {
      setError(generationError.message || "Unable to prepare this question session.");
      setLoading(false);
    }
  };

  return <div className="space-y-8"><header><p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Aptitude practice</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Choose what you want to sharpen.</h1><p className="mt-2 max-w-2xl text-gray-500 dark:text-gray-400">Generate a fresh 30–50 question session for each category and difficulty whenever you practice.</p></header>
    <section><h2 className="text-sm font-black uppercase tracking-[0.16em] text-gray-400">1. Select a category</h2><div className="mt-4 grid gap-5 md:grid-cols-3">{aptitudeCategories.map((item)=>{const Icon=icons[item.id];const active=category===item.id;return <button key={item.id} type="button" onClick={()=>setCategory(item.id)} className={`interactive-card rounded-3xl border p-6 text-left ${active?"border-indigo-500 bg-indigo-50/70 ring-4 ring-indigo-500/10 dark:bg-indigo-950/35":"border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"}`}><div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${active?"bg-indigo-600 text-white":"bg-gray-100 text-gray-500 dark:bg-gray-800"}`}><Icon size={23}/></div><h3 className="mt-5 text-lg font-bold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{item.description}</p></button>})}</div></section>
    <section><h2 className="text-sm font-black uppercase tracking-[0.16em] text-gray-400">2. Set the difficulty</h2><div className="mt-4 grid gap-3 sm:grid-cols-3">{Object.entries(difficultyNotes).map(([level,note])=><button key={level} type="button" onClick={()=>setDifficulty(level)} className={`rounded-2xl border px-5 py-4 text-left transition ${difficulty===level?"border-teal-500 bg-teal-50 dark:bg-teal-950/35":"border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900"}`}><p className="capitalize font-bold">{level}</p><p className="mt-1 text-xs text-gray-500">{note}</p></button>)}</div></section>
    <section><h2 className="text-sm font-black uppercase tracking-[0.16em] text-gray-400">3. Choose session length</h2><div className="mt-4 flex flex-wrap gap-3">{[30,40,50].map((count)=><button key={count} type="button" onClick={()=>setQuestionCount(count)} className={`rounded-xl border px-5 py-3 text-sm font-bold ${questionCount===count?"border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300":"border-gray-200 dark:border-gray-700"}`}>{count} questions</button>)}</div></section>
    <section className="surface-card flex flex-col justify-between gap-6 rounded-3xl p-6 sm:flex-row sm:items-center"><div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{selected.title}</span><span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold capitalize text-teal-700 dark:bg-teal-950 dark:text-teal-300">{difficulty}</span></div><h2 className="mt-4 text-xl font-extrabold">Your session is ready</h2><div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500"><span className="flex items-center gap-1.5"><BarChart3 size={16}/> {questionCount} questions</span><span className="flex items-center gap-1.5"><Timer size={16}/> {questionCount} minutes</span></div>{error&&<p role="alert" className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}</div><button type="button" disabled={loading} onClick={start} className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:opacity-60">{loading?"Generating questions…":"Start session"} {!loading&&<ArrowRight size={17}/>}</button></section>
  </div>;
}

export default AptitudePracticeHome;

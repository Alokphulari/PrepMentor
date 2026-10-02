import { useMemo, useState } from "react";
import { BookOpen, Search, Sparkles, Video } from "lucide-react";
import { Link, Navigate, useLocation } from "react-router-dom";
import LearningResources from "../components/LearningResources";
import { allLearningTopics, learningTopics } from "../data/learningTopics";

function LearningHub() {
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedTopic, setSelectedTopic] = useState("JavaScript");
  const normalizedQuery = query.trim().toLowerCase();
  const results = useMemo(() => allLearningTopics.filter((item) => {
    const matchesCategory = category === "All" || item.category === category;
    return matchesCategory && (!normalizedQuery || `${item.topic} ${item.category}`.toLowerCase().includes(normalizedQuery));
  }), [category, normalizedQuery]);

  const chooseTopic = (topic) => {
    setSelectedTopic(topic);
    window.requestAnimationFrame(() => document.getElementById("learning-resources")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  if (location.state?.topicPerformance) {
    return <Navigate to="/learning/recommendations" state={location.state} replace />;
  }

  return <div className="mx-auto max-w-7xl space-y-7">
    <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-7 text-white sm:p-10"><div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"/><div className="relative max-w-3xl"><p className="flex items-center gap-2 text-sm font-bold text-violet-100"><Sparkles size={17}/> Independent learning library</p><h1 className="mt-3 text-3xl font-black sm:text-4xl">Learn any topic at your own pace.</h1><p className="mt-3 leading-7 text-white/80">Search the complete catalog for guides, video lessons, references, and practice assignments. This library is separate from weak-topic recommendations.</p><div className="mt-5"><Link to="/learning/recommendations" className="text-sm font-bold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">View my weak-topic recommendations</Link></div><label className="mt-5 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-gray-900 shadow-xl shadow-indigo-950/15"><Search className="shrink-0 text-violet-600" size={21}/><span className="sr-only">Search learning topics</span><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search JavaScript, aptitude, system design..." className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-gray-400"/></label></div></header>
    <section className="surface-card rounded-3xl p-5 sm:p-7"><div className="flex flex-wrap gap-2" aria-label="Learning categories">{["All",...learningTopics.map((group)=>group.category)].map((name)=><button key={name} type="button" onClick={()=>setCategory(name)} className={`rounded-full px-4 py-2 text-sm font-bold transition ${category===name?"bg-violet-600 text-white":"bg-gray-100 text-gray-600 hover:bg-violet-50 hover:text-violet-700 dark:bg-gray-800 dark:text-gray-300"}`}>{name}</button>)}</div><div className="mt-6 flex items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold">Topic catalog</h2><p className="mt-1 text-sm text-gray-500">{results.length} learning topics available</p></div><BookOpen className="text-violet-500"/></div>{results.length?<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{results.map((item)=><button key={item.topic} type="button" onClick={()=>chooseTopic(item.topic)} className={`group rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${selectedTopic===item.topic?"border-violet-500 bg-violet-50 ring-4 ring-violet-500/10 dark:bg-violet-950/30":"border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"}`}><p className="text-xs font-black uppercase tracking-wider text-gray-400">{item.category}</p><p className="mt-2 font-extrabold group-hover:text-violet-600 dark:group-hover:text-violet-300">{item.topic}</p></button>)}</div>:<div className="mt-6 rounded-2xl border border-dashed border-gray-300 p-10 text-center dark:border-gray-700"><Search className="mx-auto text-gray-400"/><h3 className="mt-3 font-bold">No matching topics</h3><p className="mt-1 text-sm text-gray-500">Try a broader keyword or another category.</p></div>}</section>
    <section id="learning-resources" className="scroll-mt-24 surface-card rounded-3xl p-6 sm:p-8"><div className="flex items-start gap-4"><span className="rounded-2xl bg-rose-50 p-3 text-rose-600 dark:bg-rose-950/30"><Video/></span><div><p className="text-xs font-black uppercase tracking-[.16em] text-violet-600">Selected topic</p><h2 className="mt-1 text-2xl font-extrabold">{selectedTopic}</h2><p className="mt-1 text-sm text-gray-500">Choose a guide, video lesson, or hands-on assignment below.</p></div></div><LearningResources topic={selectedTopic}/></section>
  </div>;
}

export default LearningHub;

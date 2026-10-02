import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Code2, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { getLocalCodingBatch } from "../services/questionService";
import CatalogPracticeWorkspace from "../components/CatalogPracticeWorkspace";

const PAGE_SIZE = 30;

function CodingCatalog() {
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [selected, setSelected] = useState(null);
  const problems = useMemo(() => getLocalCodingBatch({ offset, count: PAGE_SIZE, difficulty }), [difficulty, offset]);
  const visible = problems.filter((problem) => `${problem.title} ${problem.topic} ${problem.description}`.toLowerCase().includes(query.trim().toLowerCase()));
  if (selected) return <CatalogPracticeWorkspace problem={selected} onBack={()=>setSelected(null)}/>;
  return <div className="mx-auto max-w-6xl space-y-6"><header className="rounded-3xl bg-gradient-to-br from-slate-950 via-violet-950 to-violet-700 p-8 text-white"><p className="text-sm font-bold text-violet-200">Complete coding library</p><h1 className="mt-2 text-3xl font-black">1,000 coding questions</h1><p className="mt-3 max-w-2xl text-violet-100">Browse interview patterns in batches of 30. Use these prompts for unlimited drafting and study; verified Run and Submit tests are available in the executable practice workspace.</p><Link to="/coding-interview" className="mt-5 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-violet-700">Open executable workspace</Link></header>
    <section className="surface-card rounded-3xl p-5"><div className="flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-3 text-gray-400" size={18}/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search this batch" className="w-full rounded-xl border border-gray-200 bg-transparent py-2.5 pl-10 pr-4 dark:border-gray-700"/></label><select value={difficulty} onChange={(event)=>{setDifficulty(event.target.value);setOffset(0);}} className="rounded-xl border border-gray-200 bg-transparent px-4 dark:border-gray-700"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></div><div className="mt-5 grid gap-4 md:grid-cols-2">{visible.map((problem)=><article key={problem.id} className="rounded-2xl border border-gray-200 p-5 dark:border-gray-700"><div className="flex items-center justify-between"><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold capitalize text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">{problem.difficulty}</span><Code2 size={18} className="text-gray-400"/></div><h2 className="mt-3 font-extrabold">{problem.title}</h2><p className="mt-1 text-xs font-bold text-violet-600">{problem.topic}</p><p className="mt-3 text-sm leading-6 text-gray-500">{problem.description}</p><ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-gray-500">{problem.constraints.slice(0,2).map((constraint)=><li key={constraint}>{constraint}</li>)}</ul><button type="button" onClick={()=>setSelected(problem)} className="mt-5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white">Practice this question</button></article>)}</div></section>
    <nav className="flex items-center justify-between"><button type="button" disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-PAGE_SIZE))} className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold disabled:opacity-40"><ArrowLeft size={16}/> Previous</button><span className="text-sm font-bold text-gray-500">Questions {offset+1}–{Math.min(1000,offset+PAGE_SIZE)} of 1,000</span><button type="button" disabled={offset+PAGE_SIZE>=1000} onClick={()=>setOffset(Math.min(990,offset+PAGE_SIZE))} className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">Next <ArrowRight size={16}/></button></nav>
  </div>;
}

export default CodingCatalog;

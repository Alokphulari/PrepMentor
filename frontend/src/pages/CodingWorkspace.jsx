import CodeReview from "../components/CodeReview";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Bookmark, CheckCircle2, ChevronRight, Code2, Layers, Lightbulb, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { dsaProblems, dsaTopics } from "../data/dsaRoadmap";
import { filterDsaProblems, normalizeDsaProgress } from "../utils/dsaProgress";
import { CODING_LANGUAGES, getStarterCode } from "../utils/codingLanguages";
import { getAccountStorageKey, readStorage, writeStorage } from "../utils/storage";
import CodeAssessmentWorkspace from "../components/CodeAssessmentWorkspace";

const field = "rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900";
const badges = { Easy: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300", Medium: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300", Hard: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" };
const statusLabels = { todo: "To do", "in-progress": "In progress", completed: "Completed" };

function DsaWorkspace({ storageKey }) {
  const [progress, setProgress] = useState(() => normalizeDsaProgress(readStorage(storageKey, null)));
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("All");
  const [status, setStatus] = useState("All");
  const [storageError, setStorageError] = useState(false);
  const topic = dsaTopics.find((item) => item.id === progress.topicId);
  const problem = dsaProblems.find((item) => item.id === selectedId);
  const completed = dsaProblems.filter((item) => progress.entries[item.id]?.status === "completed").length;
  const visible = filterDsaProblems({ topicId: query.trim() ? null : topic.id, query, difficulty, status, entries: progress.entries });
  const next = dsaProblems.find((item) => progress.entries[item.id]?.status !== "completed");

  const save = (nextProgress) => {
    setProgress(nextProgress);
    setStorageError(!writeStorage(storageKey, nextProgress));
  };
  const updateEntry = (id, changes) => save({ ...progress, entries: { ...progress.entries, [id]: { ...progress.entries[id], ...changes } } });
  const openProblem = (item) => {
    setSelectedId(item.id);
    save({ ...progress, topicId: item.topicId, entries: { ...progress.entries, [item.id]: { ...progress.entries[item.id], status: progress.entries[item.id]?.status === "completed" ? "completed" : "in-progress" } } });
  };
  const selectTopic = (id) => { save({ ...progress, topicId: id }); setSelectedId(null); setQuery(""); setDifficulty("All"); setStatus("All"); };

  return <div className="space-y-6">
    <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-700 p-6 text-white sm:p-8">
      <div aria-hidden="true" className="absolute -right-16 -top-24 h-80 w-80 rounded-full border-[40px] border-white/5"/>
      <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">Your DSA practice path</p><h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">Build skills. One pattern at a time.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-indigo-100">A structured roadmap from arrays to dynamic programming. Understand the pattern, solve the problem, then review your approach.</p><div className="mt-5 flex flex-wrap gap-4 text-xs font-semibold text-indigo-200"><span>{dsaTopics.length} ordered topics</span><span>{dsaProblems.length} distinct problems</span><span>Easy → Medium → Hard</span></div></div>
        <button type="button" disabled={!next} onClick={() => openProblem(next)} className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-800 hover:bg-indigo-50 disabled:opacity-60">{next ? completed ? "Continue roadmap" : "Start first problem" : "Roadmap completed"}<ArrowRight size={17}/></button>
      </div>
    </header>
    <section className="grid gap-4 sm:grid-cols-3" aria-label="Practice overview">{[
      [CheckCircle2, `${completed} / ${dsaProblems.length}`, "Personally completed"],
      [Layers, `${dsaTopics.filter((item) => dsaProblems.filter((question) => question.topicId === item.id).every((question) => progress.entries[question.id]?.status === "completed")).length} / ${dsaTopics.length}`, "Topics completed"],
      [Bookmark, dsaProblems.filter((item) => progress.entries[item.id]?.bookmarked).length, "Bookmarked for revision"],
    ].map(([Icon, value, label]) => <div key={label} className="surface-card flex items-center gap-4 rounded-2xl p-5"><Icon size={23} className="text-indigo-500"/><div><p className="text-xl font-extrabold">{value}</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{label}</p></div></div>)}</section>
    {storageError && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Your browser could not save this change. Keep this tab open and copy your draft before leaving.</p>}
    <div className="grid items-start gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="surface-card rounded-3xl p-4"><h2 className="px-2 py-2 text-sm font-extrabold">DSA roadmap</h2><p className="mb-4 px-2 text-xs leading-5 text-gray-500 dark:text-gray-400">Follow the suggested order or jump to a topic you want to revise.</p>
        <nav aria-label="DSA topics" className="grid gap-1 sm:grid-cols-2 xl:grid-cols-1">{dsaTopics.map((item, index) => {
          const questions = dsaProblems.filter((question) => question.topicId === item.id);
          const done = questions.filter((question) => progress.entries[question.id]?.status === "completed").length;
          return <button type="button" key={item.id} aria-current={topic.id === item.id ? "step" : undefined} onClick={() => selectTopic(item.id)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left transition ${topic.id === item.id ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${done === questions.length ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300"}`}>{done === questions.length ? <CheckCircle2 size={15}/> : String(index + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1"><span className="block text-xs font-bold leading-5">{item.title}</span><span className="mt-0.5 block text-[11px] text-gray-500 dark:text-gray-400">{item.stage} · {done}/{questions.length}</span></span></button>;
        })}</nav>
      </aside>
      <main className="min-w-0 space-y-5">
        {problem ? <ProblemWorkspace key={problem.id} problem={problem} entry={progress.entries[problem.id] || {}} language={progress.language} onLanguage={(language) => save({ ...progress, language })} onChange={(changes) => updateEntry(problem.id, changes)} onBack={() => setSelectedId(null)} onNext={() => { const index = dsaProblems.findIndex((item) => item.id === problem.id); if (index + 1 < dsaProblems.length) openProblem(dsaProblems[index + 1]); }} isLast={problem.id === dsaProblems.at(-1).id}/> : <>
          <section className="surface-card rounded-3xl p-6"><p className="text-xs font-bold uppercase tracking-wider text-indigo-500">Step {dsaTopics.indexOf(topic) + 1} · {topic.stage}</p><h2 className="mt-2 text-2xl font-extrabold">{topic.title}</h2><p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{topic.goal}</p><div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold text-gray-500 dark:text-gray-400"><span>01 Understand</span><ChevronRight size={14}/><span>02 Implement</span><ChevronRight size={14}/><span>03 Review complexity</span></div></section>
          <section className="surface-card overflow-hidden rounded-3xl">
            <div className="flex flex-col gap-3 border-b border-gray-100 p-5 dark:border-gray-800 sm:flex-row"><label className="relative min-w-0 flex-1"><Search size={17} className="absolute left-3 top-3 text-gray-400"/><input aria-label="Search all DSA problems" placeholder="Search problems or patterns…" value={query} onChange={(event) => setQuery(event.target.value)} className={`${field} w-full pl-10`}/></label><select aria-label="Difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className={field}>{["All", "Easy", "Medium", "Hard"].map((value) => <option key={value} value={value}>{value === "All" ? "All difficulties" : value}</option>)}</select><select aria-label="Problem status" value={status} onChange={(event) => setStatus(event.target.value)} className={field}>{["All", "todo", "in-progress", "completed", "bookmarked"].map((value) => <option key={value} value={value}>{statusLabels[value] || (value === "All" ? "All statuses" : "Bookmarked")}</option>)}</select></div>
            <div className="flex justify-between px-5 py-3 text-xs text-gray-500 dark:text-gray-400"><span>{query.trim() ? "Search results across all topics" : "Suggested practice order"}</span><span>{visible.length} problems</span></div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">{visible.map((item) => <div key={item.id} className="flex items-center gap-3 px-5 py-4 transition hover:bg-gray-50 dark:hover:bg-gray-800/40"><button type="button" onClick={() => openProblem(item)} className="flex min-w-0 flex-1 items-center gap-3 text-left"><span className="shrink-0 text-indigo-500">{progress.entries[item.id]?.status === "completed" ? <CheckCircle2 size={20}/> : <Code2 size={20}/>}</span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{item.title}</span><span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">{item.pattern} · {statusLabels[progress.entries[item.id]?.status || "todo"]}</span></span><span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${badges[item.difficulty]}`}>{item.difficulty}</span></button><button type="button" aria-label={`Bookmark ${item.title}`} aria-pressed={Boolean(progress.entries[item.id]?.bookmarked)} onClick={() => updateEntry(item.id, { bookmarked: !progress.entries[item.id]?.bookmarked })} className="rounded-lg p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950"><Bookmark size={17} fill={progress.entries[item.id]?.bookmarked ? "currentColor" : "none"}/></button></div>)}</div>
            {!visible.length && <div className="p-10 text-center"><Search className="mx-auto text-gray-400"/><h3 className="mt-3 font-bold">No matching problems</h3><p className="mt-2 text-sm text-gray-500">Try a different search or clear your filters.</p><button type="button" onClick={() => { setQuery(""); setDifficulty("All"); setStatus("All"); }} className="mt-4 text-sm font-bold text-indigo-500">Clear filters</button></div>}
          </section>
          <p className="px-2 text-xs leading-5 text-gray-500 dark:text-gray-400">Completion is your personal study checklist. Only server-run assessments contribute verified coding scores. Drafts and progress are saved in this browser for your account.</p>
        </>}
      </main>
    </div>
  </div>;
}

function ProblemWorkspace({ problem, entry, language, onLanguage, onChange, onBack, onNext, isLast }) {
  const [hintVisible, setHintVisible] = useState(false);
  const [tab, setTab] = useState("draft");
  const code = entry.drafts?.[language] ?? getStarterCode(language, problem.title);
  return <>
    <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-indigo-500"><ArrowLeft size={16}/> Back to topic questions</button>
    <section className="surface-card rounded-3xl p-6 sm:p-8"><div className="flex items-center justify-between gap-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${badges[problem.difficulty]}`}>{problem.difficulty}</span><button type="button" aria-label={`Bookmark ${problem.title}`} aria-pressed={Boolean(entry.bookmarked)} onClick={() => onChange({ bookmarked: !entry.bookmarked })} className="p-2 text-indigo-500"><Bookmark size={20} fill={entry.bookmarked ? "currentColor" : "none"}/></button></div><h2 className="mt-3 text-2xl font-extrabold">{problem.title}</h2><p className="mt-2 text-xs font-bold text-indigo-500">Pattern: {problem.pattern}</p><p className="mt-5 text-sm leading-7 text-gray-600 dark:text-gray-300">{problem.description}</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{[["Input", problem.input], ["Expected result", problem.output]].map(([label, value]) => <div key={label} className="min-w-0 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800"><h3 className="text-xs font-bold text-gray-500 dark:text-gray-400">{label}</h3><pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-6">{value}</pre></div>)}</div><h3 className="mt-5 text-sm font-bold">Constraints</h3><p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{problem.constraints}</p><button type="button" aria-expanded={hintVisible} onClick={() => setHintVisible(!hintVisible)} className="mt-5 flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-400"><Lightbulb size={17}/>{hintVisible ? "Hide approach hint" : "Reveal approach hint"}</button>{hintVisible && <div className="mt-3 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"><p>{problem.hint}</p><p className="mt-2 font-semibold">Target: {problem.complexity}</p></div>}</section>
    <section className="surface-card overflow-hidden rounded-3xl"><div className="flex flex-wrap gap-2 border-b border-gray-100 p-4 dark:border-gray-800">{[["draft", "Solution draft"], ["notes", "Approach & review"], ...(problem.executionId ? [["execute", "Run assessment"]] : [])].map(([value, label]) => <button key={value} type="button" aria-pressed={tab === value} onClick={() => setTab(value)} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === value ? "bg-indigo-600 text-white" : "text-gray-500 dark:text-gray-400"}`}>{label}</button>)}</div>
      {tab === "draft" && <><div className="flex flex-wrap items-center justify-between gap-3 p-4"><span className="text-xs font-bold text-gray-500">Function sketch</span><label className="flex items-center gap-2 text-xs font-bold">Language<select aria-label="Draft language" value={language} onChange={(event) => onLanguage(event.target.value)} className={field}>{CODING_LANGUAGES.map((value) => <option key={value}>{value}</option>)}</select></label></div><textarea aria-label="Solution draft" spellCheck={false} value={code} maxLength={50000} onChange={(event) => onChange({ drafts: { ...entry.drafts, [language]: event.target.value } })} className="min-h-[340px] w-full bg-slate-950 p-5 font-mono text-sm leading-7 text-slate-100"/>{problem.executionId && <div className="flex flex-col gap-3 border-t border-gray-100 bg-indigo-50/60 px-5 py-4 dark:border-gray-800 dark:bg-indigo-950/20 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-gray-600 dark:text-gray-300">Ready to check your answer? Run the verified program tester to see whether your solution is correct.</p><button type="button" onClick={() => setTab("execute")} className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">Test &amp; submit solution</button></div>}<p className="px-5 py-3 text-xs leading-5 text-gray-500 dark:text-gray-400">Adapt the function signature and types to the problem. This draft is saved locally; editing it does not run tests.{problem.executionId ? " The tester uses a complete standard-input program, so paste or rewrite your final program there before submitting." : " This exercise currently supports drafting and self-review; automated tests are not available."}</p></>}
      {tab === "notes" && <div className="space-y-4 p-5"><h3 className="font-bold">Explain before you optimize</h3><ol className="list-inside list-decimal space-y-2 text-sm leading-6 text-gray-500 dark:text-gray-400"><li>Describe a straightforward solution and its cost.</li><li>Explain the invariant or recurrence behind your improvement.</li><li>Walk through the example and relevant edge cases.</li><li>State the final time and space complexity.</li></ol><label className="block text-sm font-bold">Your approach and edge cases<textarea aria-label="Approach notes" rows={8} maxLength={6000} value={entry.notes || ""} onChange={(event) => onChange({ notes: event.target.value })} placeholder="My approach… Edge cases… Time and space complexity…" className={`${field} mt-3 w-full font-normal leading-6`}/></label></div>}
      {tab === "execute" && <CodeAssessmentWorkspace key={problem.id} mode="practice" practiceProblemId={problem.executionId} initialLanguage={language} onLanguageChange={onLanguage}/>}
    </section>
    {tab !== "execute" && <CodeReview code={code} language={language} problem={problem.title + ": " + problem.description}/>}
    <section className="surface-card flex flex-col justify-between gap-4 rounded-2xl p-5 sm:flex-row sm:items-center"><div><p className="text-sm font-bold">Personal study progress</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Mark complete after implementing and reviewing your solution.</p></div><div className="flex flex-wrap gap-3"><button type="button" onClick={() => onChange({ status: entry.status === "completed" ? "in-progress" : "completed" })} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white"><CheckCircle2 size={17}/>{entry.status === "completed" ? "Reopen problem" : "Mark complete"}</button><button type="button" disabled={isLast} onClick={onNext} className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold disabled:opacity-40 dark:border-gray-700">Next problem<ArrowRight size={16}/></button></div></section>
  </>;
}

export default function CodingWorkspace() {
  const { user } = useAuth();
  const storageKey = getAccountStorageKey("prepmentor_dsa_roadmap_v1", user);
  return <DsaWorkspace key={storageKey} storageKey={storageKey}/>;
}

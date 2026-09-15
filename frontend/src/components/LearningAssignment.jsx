import { CheckCircle2, FilePenLine, LockKeyhole } from "lucide-react";
import { countLearningWords } from "../utils/learningPlan";

const MIN_ASSIGNMENT_WORDS = 20;

function LearningAssignment({ topic, value, referenceVisited, completed, onChange, onComplete }) {
  if (!topic) return null;
  const words = countLearningWords(value);
  const ready = referenceVisited && words >= MIN_ASSIGNMENT_WORDS;

  return <section className="surface-card rounded-3xl p-6 sm:p-7"><div className="flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300"><FilePenLine size={21}/></div><div><p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">Learning assignment</p><h2 className="mt-1 text-lg font-extrabold">Explain {topic} with your own example</h2><p className="mt-1 text-sm text-gray-500">Write what you learned, how it works, and one mistake you would avoid.</p></div></div><textarea value={value} disabled={completed} onChange={(event)=>onChange(event.target.value)} rows="5" maxLength="3000" placeholder="Explain the concept and walk through an original example…" className="mt-5 w-full resize-y rounded-2xl border border-gray-200 bg-white p-4 leading-7 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 disabled:opacity-70 dark:border-gray-700 dark:bg-gray-900"/><div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><p className={`text-xs font-bold ${words>=MIN_ASSIGNMENT_WORDS?"text-emerald-600":"text-gray-400"}`}>{words} / {MIN_ASSIGNMENT_WORDS} required words</p><button type="button" disabled={completed||!ready} onClick={onComplete} className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700">{completed?<CheckCircle2 size={17}/>:<LockKeyhole size={17}/>} {completed?"Assignment completed":!referenceVisited?"Open a reference first":words<MIN_ASSIGNMENT_WORDS?"Finish your explanation":"Complete assignment"}</button></div></section>;
}

export default LearningAssignment;

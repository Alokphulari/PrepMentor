import { Flag } from "lucide-react";

const statusStyles = {
  "not-visited": "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300",
  unanswered: "bg-rose-500 text-white",
  answered: "bg-emerald-500 text-white",
  review: "bg-violet-500 text-white",
  "answered-review": "relative bg-violet-500 text-white",
};

function getQuestionStatus(index, currentIndex, answers, currentAnswer, visited, markedForReview) {
  const answered = index === currentIndex ? Boolean(currentAnswer) : Boolean(answers[index]);
  const marked = Boolean(markedForReview[index]);
  if (marked && answered) return "answered-review";
  if (marked) return "review";
  if (answered) return "answered";
  if (visited[index]) return "unanswered";
  return "not-visited";
}

function AptitudeQuestionPalette({ questionCount, currentIndex, answers, currentAnswer, visited, markedForReview, onNavigate, onToggleReview, disabled = false }) {
  const currentMarked = Boolean(markedForReview[currentIndex]);
  return (
    <aside className="surface-card h-fit rounded-2xl p-4 lg:sticky lg:top-24" aria-label="Question palette">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-sm font-black">Question palette</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">JEE-style navigation</p></div>
        <Flag size={18} className={currentMarked ? "text-violet-500" : "text-gray-400"} />
      </div>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {Array.from({ length: questionCount }, (_, index) => {
          const status = getQuestionStatus(index, currentIndex, answers, currentAnswer, visited, markedForReview);
          return <button key={index} type="button" disabled={disabled} onClick={() => onNavigate(index)} aria-label={`Question ${index + 1}, ${status.replace("-", " ")}`} aria-current={index === currentIndex ? "step" : undefined} className={`relative flex h-9 items-center justify-center rounded-lg text-xs font-black transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 ${statusStyles[status]} ${index === currentIndex ? "ring-4 ring-indigo-500/25 ring-offset-2 dark:ring-offset-gray-900" : ""}`}>{index + 1}{status === "answered-review" && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400 dark:border-gray-900" />}</button>;
        })}
      </div>
      <button type="button" disabled={disabled} onClick={() => onToggleReview(currentIndex)} className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${currentMarked ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200" : "border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-600 dark:border-gray-700 dark:text-gray-300"}`}><Flag size={15} />{currentMarked ? "Remove review mark" : "Mark for review"}</button>
      <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-gray-100 pt-4 text-[11px] font-semibold text-gray-500 dark:border-gray-800 dark:text-gray-400">
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded bg-emerald-500" /> Answered</span>
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded bg-rose-500" /> Unanswered</span>
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded bg-violet-500" /> Review</span>
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded bg-gray-200 dark:bg-gray-700" /> Not visited</span>
      </div>
    </aside>
  );
}

export default AptitudeQuestionPalette;

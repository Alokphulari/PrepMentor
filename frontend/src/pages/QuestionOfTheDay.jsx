import { useState } from "react";
import { CalendarCheck2, CheckCircle2, Flame, LockKeyhole, Sparkles, XCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { aptitudeQuestions } from "../data/aptitudeQuestions";
import { addHistoryEntry } from "../services/history";
import { markDailyQuestionActivity } from "../services/dailyActivity";
import { DAILY_CHALLENGE_KEY, getDailyQuestion, getLocalDayKey, normalizeDailyChallenge } from "../utils/dailyChallenge";
import { getAccountStorageKey, readStorage, writeStorage } from "../utils/storage";

const dailyQuestions = Object.entries(aptitudeQuestions).flatMap(([category, levels]) =>
  Object.entries(levels).flatMap(([difficulty, questions]) =>
    questions.map((question) => ({ ...question, id: `${category}-${difficulty}-${question.id}`, category, difficulty })),
  ),
);

function QuestionOfTheDay() {
  const { user } = useAuth();
  const dayKey = getLocalDayKey();
  const question = getDailyQuestion(dailyQuestions);
  const storageKey = getAccountStorageKey(DAILY_CHALLENGE_KEY, user);
  const [result, setResult] = useState(() => normalizeDailyChallenge(readStorage(storageKey, null), dayKey, question));
  const [selectedAnswer, setSelectedAnswer] = useState(() => result?.selectedAnswer || "");

  const submit = () => {
    if (!selectedAnswer || result) return;
    markDailyQuestionActivity();
    const next = {
      dayKey,
      questionId: question.id,
      selectedAnswer,
      correct: selectedAnswer === question.answer,
      recorded: true,
    };
    writeStorage(storageKey, next);
    addHistoryEntry({
      id: `daily-${dayKey}`,
      title: `Question of the Day · ${question.topic}`,
      type: "Daily Challenge",
      score: next.correct ? 100 : 0,
      duration: "Daily",
      topicPerformance: [{ topic: question.topic, percentage: next.correct ? 100 : 0 }],
    });
    setResult(next);
  };

  return <div className="mx-auto max-w-4xl space-y-7">
    <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 p-7 text-white shadow-2xl shadow-indigo-900/20 sm:p-10"><div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/15 blur-3xl"/><div className="relative"><div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-white/15"><CalendarCheck2 size={26}/></div><p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-indigo-100">{dayKey}</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Question of the Day</h1><p className="mt-3 max-w-2xl leading-7 text-indigo-100">Solve one focused challenge each day. Your first answer is final and records today’s activity toward your streak.</p></div></header>

    <section className="surface-card rounded-3xl p-6 sm:p-9"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2"><span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold capitalize text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">{question.category}</span><span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold capitalize text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">{question.difficulty}</span></div>{result ? <span className="flex items-center gap-2 text-sm font-bold text-emerald-600"><LockKeyhole size={16}/> Completed today</span> : <span className="flex items-center gap-2 text-sm font-bold text-orange-600"><Flame size={17}/> Streak activity</span>}</div>
      <p className="mt-7 text-sm font-bold text-teal-600 dark:text-teal-400">{question.topic}</p><h2 className="mt-2 text-xl font-extrabold leading-8 sm:text-2xl">{question.question}</h2>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">{question.options.map((option, index) => {const selected=selectedAnswer===option;const correct=result&&option===question.answer;const wrong=result&&selected&&!result.correct;return <button key={option} type="button" disabled={Boolean(result)} onClick={()=>setSelectedAnswer(option)} className={`flex min-h-16 items-center gap-3 rounded-2xl border p-4 text-left font-semibold transition ${correct?"border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200":wrong?"border-rose-400 bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200":selected?"border-indigo-500 bg-indigo-50 text-indigo-800 ring-4 ring-indigo-500/10 dark:bg-indigo-950/40 dark:text-indigo-200":"border-gray-200 hover:border-indigo-300 dark:border-gray-700"}`}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/70 text-xs font-black text-gray-600 dark:bg-gray-800 dark:text-gray-300">{String.fromCharCode(65+index)}</span><span>{option}</span>{correct&&<CheckCircle2 className="ml-auto text-emerald-600" size={19}/>} {wrong&&<XCircle className="ml-auto text-rose-600" size={19}/>}</button>})}</div>
      {result ? <div className={`mt-7 rounded-2xl border p-5 ${result.correct?"border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30":"border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"}`}><p className="flex items-center gap-2 font-extrabold">{result.correct?<CheckCircle2 className="text-emerald-600"/>:<Sparkles className="text-amber-600"/>}{result.correct?"Correct—nice work.":`The correct answer is ${question.answer}.`}</p><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Today’s challenge is recorded. Come back tomorrow for a new question.</p></div> : <button type="button" disabled={!selectedAnswer} onClick={submit} className="mt-7 w-full rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">Lock in answer</button>}
    </section>

  </div>;
}

export default QuestionOfTheDay;

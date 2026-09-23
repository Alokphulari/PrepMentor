import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Bolt, BrainCircuit, CheckCircle2, Code2, Gamepad2, RotateCcw, Sparkles, Timer, Trophy } from "lucide-react";
import { aptitudeQuestions } from "../data/aptitudeQuestions";
import { addHistoryEntry } from "../services/history";
import { markDailyQuestionActivity } from "../services/dailyActivity";
import { generateOfflineQuestions } from "../utils/offlineQuestionGenerator";

const aptitudeGame = aptitudeQuestions.quantitative.easy.concat(aptitudeQuestions.logical.easy).map((item, index) => ({ ...item, id: `aptitude-game-${index}` }));
const codingGame = [
  ["Which structure uses FIFO order?", ["Stack", "Queue", "Tree", "Heap"], "Queue", "Data Structures"],
  ["What is binary search average complexity?", ["O(1)", "O(log n)", "O(n)", "O(n²)"], "O(log n)", "Complexity"],
  ["Which JavaScript value represents no intentional value?", ["0", "false", "null", "NaN"], "null", "JavaScript"],
  ["Which traversal commonly uses a queue?", ["DFS", "BFS", "Inorder", "Postorder"], "BFS", "Graphs"],
  ["What prevents infinite recursion?", ["A compiler", "A base case", "A queue", "A class"], "A base case", "Recursion"],
  ["Which structure gives average O(1) key lookup?", ["Linked list", "Hash table", "Array scan", "Binary heap"], "Hash table", "Hashing"],
  ["Which principle hides internal implementation details?", ["Encapsulation", "Iteration", "Compilation", "Sorting"], "Encapsulation", "OOP"],
  ["Which HTTP method is normally used to retrieve data?", ["GET", "POST", "PATCH", "DELETE"], "GET", "Web"],
].map(([question, options, answer, topic], index) => ({ id: `coding-game-${index}`, question, options, answer, topic }));
const focusGame = [
  ["Which number breaks the pattern?", ["2", "4", "8", "14"], "14", "Pattern Spotting"],
  ["Choose the odd one out.", ["Triangle", "Square", "Circle", "Blue"], "Blue", "Classification"],
  ["What comes next: A, C, E, G, ?", ["H", "I", "J", "K"], "I", "Sequence"],
  ["Which word does not belong?", ["Calm", "Quiet", "Peaceful", "Noisy"], "Noisy", "Attention"],
  ["Complete: 1, 1, 2, 3, 5, ?", ["6", "7", "8", "10"], "8", "Pattern Spotting"],
  ["Which shape has no corners?", ["Square", "Circle", "Triangle", "Rectangle"], "Circle", "Visual Reset"],
].map(([question, options, answer, topic], index) => ({ id: `focus-game-${index}`, question, options, answer, topic }));

const modes = {
  aptitude: { title: "Aptitude Blitz", subtitle: "10 questions · 60 seconds", icon: Bolt, color: "indigo", seconds: 60, questions: aptitudeGame },
  coding: { title: "Code Rapid Fire", subtitle: "8 concepts · 60 seconds", icon: Code2, color: "teal", seconds: 60, questions: codingGame },
  focus: { title: "Pattern Reset", subtitle: "6 calm pattern rounds", icon: BrainCircuit, color: "violet", seconds: 0, questions: focusGame },
};

function Games() {
  const [modeId, setModeId] = useState("");
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState("");
  const [finished, setFinished] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [gameQuestions, setGameQuestions] = useState([]);
  const completedRef = useRef(false);
  const answerTimerRef = useRef(null);
  const mode = modes[modeId];
  const questions = gameQuestions;

  const completeGame = useCallback((finalScore) => {
    if (!mode || completedRef.current) return;
    completedRef.current = true;
    const percentage = Math.round((finalScore / questions.length) * 100);
    addHistoryEntry({ title: `Game · ${mode.title}`, type: "Game", score: percentage, duration: mode.seconds ? `${mode.seconds} sec` : "Quick play", topicPerformance: [{ topic: mode.title, percentage }] });
    setScore(finalScore);
    setFinished(true);
  }, [mode, questions.length]);

  useEffect(() => {
    if (!mode?.seconds || finished) return undefined;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [finished, mode]);

  useEffect(() => {
    if (mode?.seconds && seconds === 0 && !finished) completeGame(score);
  }, [completeGame, finished, mode, score, seconds]);

  useEffect(() => () => window.clearTimeout(answerTimerRef.current), []);

  const start = (nextMode) => {
    window.clearTimeout(answerTimerRef.current);
    completedRef.current = false;
    const category = nextMode === "aptitude" ? "quantitative" : nextMode === "coding" ? "programming" : "focus";
    setGameQuestions(generateOfflineQuestions({
      category,
      difficulty: nextMode === "coding" ? "medium" : "easy",
      count: modes[nextMode].questions.length,
    }));
    setModeId(nextMode);
    setIndex(0);
    setScore(0);
    setSelected("");
    setFinished(false);
    setSeconds(modes[nextMode].seconds);
  };

  const exit = () => {
    window.clearTimeout(answerTimerRef.current);
    answerTimerRef.current = null;
    setModeId("");
  };

  const answer = (option) => {
    if (selected || finished) return;
    setSelected(option);
    markDailyQuestionActivity();
    const nextScore = score + (option === questions[index].answer ? 1 : 0);
    answerTimerRef.current = window.setTimeout(() => {
      if (index === questions.length - 1) completeGame(nextScore);
      else {
        setScore(nextScore);
        setIndex((value) => value + 1);
        setSelected("");
      }
    }, 450);
  };

  if (!mode) return <div className="space-y-8"><header><p className="text-sm font-bold text-violet-600 dark:text-violet-400">Games</p><h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Reset your mind. Keep your edge.</h1><p className="mt-3 max-w-2xl text-gray-500 dark:text-gray-400">Short challenges for speed, coding recall, and pattern recognition. Every completed game counts as preparation activity.</p></header><section className="grid gap-5 md:grid-cols-3">{Object.entries(modes).map(([id, item]) => {const Icon=item.icon;return <button key={id} type="button" onClick={()=>start(id)} className="surface-card interactive-card group rounded-3xl p-6 text-left sm:p-7"><div className={`flex h-13 w-13 items-center justify-center rounded-2xl ${item.color==="teal"?"bg-teal-50 text-teal-600 dark:bg-teal-950/40":item.color==="violet"?"bg-violet-50 text-violet-600 dark:bg-violet-950/40":"bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40"}`}><Icon size={25}/></div><h2 className="mt-6 text-xl font-extrabold">{item.title}</h2><p className="mt-2 text-sm text-gray-500">{item.subtitle}</p><span className="mt-6 flex items-center gap-2 text-sm font-bold text-violet-600">Play now <Gamepad2 size={17}/></span></button>})}</section></div>;

  if (finished) {const percentage=Math.round((score/questions.length)*100);return <div className="mx-auto max-w-2xl space-y-6"><section className="surface-card rounded-3xl p-8 text-center sm:p-10"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/40"><Trophy size={31}/></div><p className="mt-6 text-sm font-bold text-violet-600">{mode.title}</p><h1 className="mt-2 text-3xl font-black">Round complete</h1><p className="mt-5 text-6xl font-black text-indigo-600 dark:text-indigo-300">{percentage}%</p><p className="mt-3 text-gray-500">{score} of {questions.length} correct. This activity was saved to your history.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><button type="button" onClick={exit} className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold dark:border-gray-700"><ArrowLeft size={17}/> All games</button><button type="button" onClick={()=>start(modeId)} className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white"><RotateCcw size={17}/> Play again</button></div></section></div>}

  const question = questions[index];
  return <div className="mx-auto max-w-4xl space-y-6"><header className="flex items-center justify-between gap-4"><button type="button" onClick={exit} className="flex items-center gap-2 text-sm font-bold text-gray-500"><ArrowLeft size={17}/> Exit game</button>{mode.seconds?<span className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-black ${seconds<=10?"border-rose-200 bg-rose-50 text-rose-600":"border-gray-200 dark:border-gray-700"}`}><Timer size={17}/>{seconds}s</span>:<span className="rounded-xl bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"><Sparkles size={16} className="mr-2 inline"/>Untimed reset</span>}</header><section className="surface-card rounded-3xl p-6 sm:p-9"><div className="flex items-center justify-between text-sm"><span className="font-bold text-violet-600">{mode.title}</span><span className="font-bold text-gray-400">{index+1} / {questions.length}</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-full rounded-full bg-violet-600 transition-all" style={{width:`${((index+1)/questions.length)*100}%`}}/></div><p className="mt-8 text-sm font-bold text-teal-600">{question.topic}</p><h1 className="mt-2 text-2xl font-extrabold leading-9">{question.question}</h1><div className="mt-7 grid gap-3 sm:grid-cols-2">{question.options.map((option)=>{const chosen=selected===option;const correct=selected&&option===question.answer;return <button key={option} type="button" disabled={Boolean(selected)} onClick={()=>answer(option)} className={`min-h-16 rounded-2xl border p-4 text-left font-semibold transition ${correct?"border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30":chosen?"border-rose-400 bg-rose-50 text-rose-800 dark:bg-rose-950/30":"border-gray-200 hover:border-violet-400 dark:border-gray-700"}`}>{option}{correct&&<CheckCircle2 size={18} className="float-right text-emerald-600"/>}</button>})}</div></section></div>;
}

export default Games;

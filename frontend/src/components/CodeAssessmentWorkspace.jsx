import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { authorizedRequest } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import { usePlacement } from "../context/PlacementContext";
import { getAccountStorageKey, readStorage, writeStorage } from "../utils/storage";
import { addHistoryEntry } from "../services/history";
import { markDailyQuestionActivity } from "../services/dailyActivity";

const starters = {
  JavaScript: "const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim();\n// Parse input and print your answer.\n",
  Python: "import sys\ndata = sys.stdin.read()\n# Parse input and print your answer.\n",
  Java: "import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner in = new Scanner(System.in);\n    // Read input and print your answer.\n  }\n}\n",
  "C++": "#include <iostream>\nusing namespace std;\nint main() {\n  // Read input and print your answer.\n  return 0;\n}\n",
};
export default function CodeAssessmentWorkspace({ mode = "placement", practiceProblemId }) {
  const { user } = useAuth();
  const { placementState, applyServerPlacement } = usePlacement();
  const [problems, setProblems] = useState([]);
  const [selected, setSelected] = useState("");
  const [language, setLanguage] = useState("JavaScript");
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const lock = useRef(false);
  const availableLevel = ["easy", "medium", "hard"].find((level) => placementState.coding[level] === "available");
  const problem = mode === "practice" && practiceProblemId
    ? problems.find((item) => item.id === practiceProblemId)
    : problems.find((item) => item.id === selected) || (mode === "placement" ? problems.find((item) => item.difficulty === availableLevel) : problems[0]);
  const key = getAccountStorageKey(`code-execution:${problem?.id}:${language}`, user);
  const code = draft?.key === key ? draft.code : readStorage(key, starters[language]);
  const setCode = (value) => setDraft({ key, code: value });
  useEffect(() => {
    let active = true;
    authorizedRequest("/api/code/problems").then((data) => { if (active) setProblems(data.problems); }).catch((failure) => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, []);
  const execute = async (submit) => {
    if (lock.current || !problem) return;
    lock.current = true; setBusy(submit ? "Submitting hidden tests..." : "Compiling and running sample tests..."); setError("");
    try {
      const response = await authorizedRequest(`/api/code/${submit ? "submit" : "run"}`, { method: "POST", timeoutMs: 65000, body: JSON.stringify({ problemId: problem.id, language, code, mode }) });
      setResult({ ...response, level: problem.difficulty, topic: problem.topic, submitted: submit });
      if (submit) {
        addHistoryEntry(response.entry, { sync: false });
        markDailyQuestionActivity();
        if (mode === "placement") applyServerPlacement(response.placementState);
      }
    } catch (failure) { setError(failure.message); }
    finally { lock.current = false; setBusy(""); }
  };
  return <section className="surface-card space-y-5 rounded-3xl p-6">
    <header><h2 className="text-2xl font-bold">{mode === "placement" ? "Placement coding assessment" : "Sandbox coding practice"}</h2><p className="mt-2 text-gray-500">Write a complete program that reads standard input and prints standard output. Hidden test correctness determines the score. Pass threshold: 80%.</p></header>
    {mode === "practice" && !practiceProblemId && <label>Problem<select disabled={Boolean(busy)} className="ml-3 rounded border p-2 dark:bg-gray-900" value={problem?.id || ""} onChange={(event) => { setSelected(event.target.value); setResult(null); }}>{problems.map((item) => <option key={item.id} value={item.id}>{item.difficulty}: {item.title}</option>)}</select></label>}
    {problem && !(mode === "placement" && result?.submitted) && <>
      <h3 className="text-xl font-bold">{problem.title} <span className="text-sm capitalize text-indigo-500">{problem.difficulty}</span></h3><p>{problem.description}</p>
      {problem.samples.map((sample, index) => <div key={index} className="grid gap-4 rounded-xl bg-gray-100 p-4 dark:bg-gray-800 sm:grid-cols-2"><div>Sample input<pre>{sample.input}</pre></div><div>Expected output<pre>{sample.output}</pre></div></div>)}
      <label className="block">Language<select disabled={Boolean(busy)} value={language} onChange={(event) => { setLanguage(event.target.value); setResult(null); }} className="ml-3 rounded border p-2 dark:bg-gray-900">{Object.keys(starters).map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="block"><span className="font-semibold">Solution</span><textarea spellCheck={false} aria-label="Source code" rows={16} value={code} disabled={Boolean(busy)} onChange={(event) => { setCode(event.target.value); writeStorage(key, event.target.value); }} className="mt-2 w-full rounded-xl border bg-slate-950 p-4 font-mono text-sm text-slate-100" /></label>
      <div className="flex flex-wrap gap-3"><button type="button" disabled={Boolean(busy)} onClick={() => execute(false)} className="rounded-xl border px-5 py-3 font-bold disabled:opacity-50">Run sample tests</button><button type="button" disabled={Boolean(busy)} onClick={() => execute(true)} className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white disabled:opacity-50">{busy === "Submitting hidden tests..." ? "Submitting…" : "Submit solution"}</button></div>
    </>}
    {!problem && !result && (mode === "practice" ? <p>{error ? "The assessment could not be loaded. Your solution draft is still available in the previous tab." : "Loading the assessment…"}</p> : <p>Complete the previous Placement stage, or finish your Learning Hub remediation to unlock a retake. <Link className="text-indigo-500" to="/placement">View progress</Link></p>)}
    <p role="status">{busy}</p>{error && <p role="alert" className="text-rose-500">{error}</p>}
    {result?.submitted && <div aria-live="polite" className={`flex items-center gap-2 rounded-xl border p-4 text-lg font-extrabold ${result.status === "passed" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"}`}>{result.status === "passed" ? <CheckCircle2 size={22}/> : <XCircle size={22}/>}{result.status === "passed" ? "Correct — all tests passed." : "Incorrect — some tests did not pass."}</div>}
    {result && <div aria-live="polite" className="space-y-3 rounded-xl border p-5"><h3 className="font-bold">{result.submitted ? "Hidden test results" : "Sample results"}: {result.passedTests}/{result.totalTests} passed</h3><p>Runtime: {result.runtime.toFixed(3)} seconds · Memory: {result.memory} KB</p>{result.failureReason && <p>{result.failureReason}</p>}{!result.submitted && result.sampleResults?.map((sample, index) => <div key={index}><p className="font-bold">Sample {index + 1} output</p><pre className="whitespace-pre-wrap">{sample.stdout || "(no output)"}</pre>{sample.compilation && <pre className="whitespace-pre-wrap">{sample.compilation}</pre>}{sample.stderr && <pre className="whitespace-pre-wrap">{sample.stderr}</pre>}</div>)}{result.submitted && <p>Score: {result.score}%</p>}
      {result.submitted && mode === "placement" && (result.score >= 80 ? <Link to={result.level === "hard" ? "/interview/setup" : "/placement"} state={result.level === "hard" ? { mode: "placement" } : undefined} className="font-bold text-indigo-500">Continue to {result.level === "hard" ? "AI interview" : "next level"}</Link> : <Link to="/learning" state={{ module: "coding", placementLevel: result.level, placementMode: true, topicPerformance: [{ topic: result.topic, percentage: result.score }] }} className="font-bold text-indigo-500">Complete learning tasks before retaking</Link>)}
    </div>}
  </section>;
}

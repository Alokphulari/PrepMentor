import { useRef, useState } from "react";
import { authorizedRequest } from "../services/authService";
import { hasRemoteApi } from "../services/api";
import { localPerformanceAnalysis, performanceEvidence } from "../utils/performanceAnalysis";
export default function PerformanceAnalysis({ history }) {
  const [analysis, setAnalysis] = useState(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const analyze = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try {
      const result = hasRemoteApi ? (await authorizedRequest("/api/performance/analyze", { method: "POST", timeoutMs: 20000 })).analysis : localPerformanceAnalysis(performanceEvidence(history));
      setAnalysis(result);
    } catch { setAnalysis({ ...localPerformanceAnalysis(performanceEvidence(history)), notice: "The server could not respond. This analysis uses the history available on this device." }); }
    finally { lock.current = false; setBusy(false); }
  };
  return <section className="surface-card space-y-4 rounded-3xl p-6 sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-extrabold">AI Performance Analysis</h2><button type="button" disabled={busy} onClick={analyze} className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? "Analyzing..." : analysis ? "Refresh analysis" : "Analyze performance"}</button></div>
    <p className="text-sm text-gray-500">Personalized guidance from your aptitude, coding, interview, and weak-topic history.</p>
    {busy && <p role="status">Reviewing your results...</p>}
    {analysis && <div aria-live="polite" className="space-y-3"><p className="font-bold text-indigo-600 dark:text-indigo-300">Source: {analysis.provider === "local" ? "Local Backup" : analysis.provider === "gemini" ? "Gemini" : "AI provider"}</p>{analysis.notice && <p className="text-sm text-amber-600">{analysis.notice}</p>}<p>{analysis.summary}</p>{[["strengths","Strengths"],["recommendations","Next steps"]].map(([key,label]) => <div key={key}><h3 className="font-semibold">{label}</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{analysis[key].map((item,index) => <li key={index}>{item}</li>)}</ul></div>)}<p className="text-xs text-gray-500">Based on {analysis.evidence.count} recorded attempts. Refresh after completing another session.</p></div>}
  </section>;
}

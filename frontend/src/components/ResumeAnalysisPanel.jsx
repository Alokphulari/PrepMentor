import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { authorizedRequest } from "../services/authService";
import SkillBaseline from "./SkillBaseline";

export default function ResumeAnalysisPanel() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const analyze = async (manual) => {
    if (lock.current) return;
    lock.current = true; setError(""); setStatus(manual ? "Analyzing saved resume..." : "Uploading, extracting and analyzing...");
    try {
      let body = { manual: true };
      if (!manual) {
        if (!file || file.size === 0 || file.size > 5 * 1024 * 1024) throw new Error("Choose a PDF or DOCX up to 5 MB.");
        const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(",")[1]); reader.onerror = () => reject(new Error("Unable to read file.")); reader.readAsDataURL(file); });
        body = { fileName: file.name, mimeType: file.type, data };
      }
      const response = await authorizedRequest("/api/resume/analyze", { method: "POST", timeoutMs: 90000, body: JSON.stringify(body) });
      setAnalysis(response.analysis);
    } catch (failure) { setError(failure.message); }
    finally { setStatus(""); lock.current = false; }
  };
  return <div data-print-hide className="space-y-5"><section className="surface-card space-y-4 rounded-3xl p-6"><h2 className="text-xl font-bold">Upload or analyze your resume</h2><p className="text-sm text-gray-500">PDF or DOCX, up to 5 MB. Text is processed on the server and sent to the configured AI provider for analysis.</p><label className="block">Resume file<input className="mt-2 block" type="file" accept=".pdf,.docx" disabled={Boolean(status)} onChange={(event) => setFile(event.target.files?.[0] || null)} /></label><div className="flex flex-wrap gap-3"><button disabled={Boolean(status) || !file} onClick={() => analyze(false)} className="rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white disabled:opacity-50">Upload and analyze</button><button disabled={Boolean(status)} onClick={() => analyze(true)} className="rounded-xl border px-4 py-3 font-bold disabled:opacity-50">Analyze saved builder resume</button></div><p role="status">{status}</p>{error && <p role="alert" className="text-rose-500">{error}</p>}{analysis && <div aria-live="polite"><h3 className="font-bold">{analysis.source.startsWith("AI") ? "Analysis complete" : "Resume extracted"}</h3><p>{analysis.source}</p><p>Skills: {analysis.skills.join(", ") || "No analyzed skills available"}</p><p>Strengths: {analysis.strengths.join("; ") || "Not assessed"}</p><p>Missing areas: {analysis.missingAreas.join("; ") || "Not assessed"}</p><Link className="mt-3 inline-block font-bold text-indigo-500" to="/dashboard">Continue to dashboard</Link></div>}</section><SkillBaseline refreshKey={analysis?.id || 0} /></div>;
}

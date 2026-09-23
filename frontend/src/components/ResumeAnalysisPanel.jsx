import { useEffect, useRef, useState } from "react";
import { FileText, LoaderCircle, Upload } from "lucide-react";
import { authorizedRequest } from "../services/authService";
import { hasRemoteApi } from "../services/api";
import SkillBaseline from "./SkillBaseline";

const resultSections = {
  strengths: "Strengths", missingAreas: "Areas to improve", targetRoles: "Suitable roles",
  roleSuitability: "Role suitability", atsSuggestions: "ATS suggestions", recommendations: "Recommended next steps",
};

export default function ResumeAnalysisPanel({ resume, loadingDraft = false }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const lock = useRef(false);
  const revision = useRef(0);
  useEffect(() => {
    if (!hasRemoteApi) return;
    let active = true;
    const initialRevision = revision.current;
    authorizedRequest("/api/baseline")
      .then((value) => { if (active && revision.current === initialRevision) setAnalysis(value.analysis || null); })
      .catch(() => { if (active) setLoadError("Could not load your previous analysis. You can still upload and retry."); });
    return () => { active = false; };
  }, []);

  const selectFile = (event) => {
    const selected = event.target.files?.[0] || null;
    setError("");
    if (selected && (!/\.(pdf|docx)$/i.test(selected.name) || !selected.size || selected.size > 5 * 1024 * 1024)) {
      setFile(null);
      setError("Choose a non-empty PDF or DOCX file up to 5 MB.");
      event.target.value = "";
      return;
    }
    setFile(selected);
  };
  const analyze = async (manual) => {
    if (lock.current) return;
    lock.current = true;
    revision.current += 1;
    setError("");
    setStatus(manual ? "Analyzing your current draft..." : "Reading your file and analyzing its contents...");
    try {
      let body = { manual: true, ...(resume ? { resume } : {}) };
      if (!manual) {
        if (!file) throw new Error("Choose a PDF or DOCX file first.");
        const data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(",")[1]);
          reader.onerror = () => reject(new Error("Unable to read this file. Select it again and retry."));
          reader.onabort = () => reject(new Error("File reading was interrupted. Please retry."));
          reader.readAsDataURL(file);
        });
        body = { fileName: file.name, mimeType: file.type, data };
      }
      const response = await authorizedRequest("/api/resume/analyze", { method: "POST", timeoutMs: 90000, body: JSON.stringify(body) });
      if (!response?.analysis?.id) throw new Error("No analysis was returned. Please retry.");
      setAnalysis(response.analysis);
      setLoadError("");
    } catch (failure) { setError(failure.message); }
    finally { setStatus(""); lock.current = false; }
  };
  const disabled = Boolean(status) || !hasRemoteApi;
  const complete = analysis?.source?.startsWith("AI");
  return <div data-print-hide className="space-y-5">
    <section className="surface-card space-y-5 rounded-3xl p-6" aria-busy={Boolean(status)}>
      <div><h2 className="text-xl font-bold">Upload or analyze your resume</h2><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Choose a PDF or DOCX with selectable text, up to 5 MB. Its text is sent to the configured AI provider for feedback.</p></div>
      <label className="block rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/40 p-5 dark:border-indigo-800 dark:bg-indigo-950/20">
        <span className="flex items-center gap-2 font-semibold"><Upload size={19} /> Resume file</span>
        <input aria-label="Resume file" className="mt-3 block w-full min-w-0 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-3 file:py-2 file:font-semibold file:text-indigo-700 dark:file:bg-indigo-900 dark:file:text-indigo-200" type="file" accept=".pdf,.docx" disabled={disabled} onChange={selectFile} />
        {file && <span className="mt-3 block break-all text-sm text-gray-500">{file.name} · {Math.max(1, Math.round(file.size / 1024))} KB · Ready to analyze</span>}
      </label>
      {!hasRemoteApi && <p role="status" className="text-sm text-amber-600">Resume analysis needs a connection to the PrepMentor API. You can still edit and print your resume below.</p>}
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={disabled || !file} onClick={() => analyze(false)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{status ? <LoaderCircle size={18} className="animate-spin" /> : <Upload size={18} />}Upload and analyze</button>
        <button type="button" disabled={disabled || loadingDraft} onClick={() => analyze(true)} className="rounded-xl border border-gray-300 px-4 py-3 font-bold disabled:opacity-50 dark:border-gray-700">{resume ? "Analyze current draft" : "Analyze saved builder resume"}</button>
      </div>
      <p role="status" className="text-sm text-indigo-600 dark:text-indigo-300">{status || loadError}</p>
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
      {analysis && <div aria-live="polite" className="space-y-4 border-t border-gray-200 pt-5 dark:border-gray-700">
        <div><h3 className="flex items-center gap-2 text-lg font-bold"><FileText size={20} />{complete ? "Resume analysis" : "Previous extraction"}</h3><p className="mt-1 break-all text-sm text-gray-500">{analysis.fileName} · {analysis.source}</p></div>
        {!complete && <p className="text-sm text-amber-600">This earlier upload did not receive AI feedback. Select your file and analyze it again.</p>}
        <div><h4 className="mb-2 font-semibold">Skills found in your resume</h4><div className="flex flex-wrap gap-2">{analysis.skills?.length ? analysis.skills.map((skill, index) => <span key={index} className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200">{skill}</span>) : <p className="text-sm text-gray-500">No skills identified in this analysis.</p>}</div></div>
        <div className="grid gap-4 md:grid-cols-2">{Object.entries(resultSections).map(([key, title]) => analysis[key]?.length > 0 && <section key={key} className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/50"><h4 className="font-bold">{title}</h4><ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-gray-600 dark:text-gray-300">{analysis[key].map((item, index) => <li key={index}>{item}</li>)}</ul></section>)}</div>
      </div>}
    </section>
    <SkillBaseline refreshKey={analysis?.id || 0} />
  </div>;
}

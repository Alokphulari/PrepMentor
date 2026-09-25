import { useRef, useState } from "react";
import { authorizedRequest } from "../services/authService";
import { hasRemoteApi } from "../services/api";
export default function CodeReview({ code, language, problem }) {
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const run = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(""); setReview(null);
    try {
      const response = await authorizedRequest("/api/code/review", { method: "POST", timeoutMs: 20000, body: JSON.stringify({ code, language, problem }) });
      setReview({ ...response, reviewedCode: code, reviewedLanguage: language });
    } catch { setError("Code review is unavailable. Your draft is safe. Check input parsing, boundary cases, and time complexity, then retry."); }
    finally { lock.current = false; setBusy(false); }
  };
  return <section className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
    <button type="button" disabled={busy || !code?.trim() || !hasRemoteApi} onClick={run} className="rounded-xl border border-indigo-300 px-4 py-2 font-bold text-indigo-600 disabled:opacity-50 dark:text-indigo-300">{busy ? "Reviewing..." : "Review my code"}</button>
    <p className="text-xs text-gray-500">Review feedback does not execute code, award test scores, or unlock Placement.{!hasRemoteApi && " Connect the backend to request a review."}</p>
    {error && <p role="alert" className="text-sm text-amber-600">{error}</p>}
    {review && <div aria-live="polite" className="space-y-2 text-sm"><p className="font-bold">{review.provider === "local" ? "Local Backup" : review.provider === "gemini" ? "Gemini" : "AI"} · {review.mode}</p>{(review.reviewedCode !== code || review.reviewedLanguage !== language) && <p className="text-amber-600">This feedback applies to an earlier draft. Review again after editing.</p>}<p>{review.summary}</p><p>{review.complexity}</p><ul className="list-disc space-y-1 pl-5">{[...(review.strengths || []), ...(review.issues || [])].map((item,index) => <li key={index}>{item}</li>)}</ul></div>}
  </section>;
}

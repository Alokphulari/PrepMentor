import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authorizedRequest } from "../services/authService";
export default function PlacementReport() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    authorizedRequest("/api/placement/report").then((value) => { if (active) setReport(value); }).catch((failure) => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, []);
  return <section className="surface-card space-y-5 rounded-3xl p-6 sm:p-9"><h1 className="text-3xl font-extrabold">Placement final report</h1>{error && <p role="alert" className="text-amber-600">{error}</p>}{!report && !error && <p role="status">Loading verified Placement results...</p>}{report && <><p className="font-bold text-emerald-600">Aptitude, Coding, and Interview completed</p><p>Interview evaluation: {report.demoEvaluation ? "Local Backup — demo rubric, not verified technical correctness" : "AI evaluation"}</p><p>{report.interview.summary}</p><p className="text-xl font-bold">Interview score: {report.interview.score}%</p><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Assessment</th><th className="p-3">Score</th></tr></thead><tbody>{report.assessments.map((entry) => <tr key={entry.id} className="border-t border-gray-200 dark:border-gray-700"><td className="p-3">{entry.title}</td><td className="p-3">{entry.score}%</td></tr>)}</tbody></table></div><Link className="block font-bold text-indigo-600" to={"/interview/result/" + report.interview.id}>View interview feedback</Link></>}<Link className="block font-bold text-indigo-600" to="/placement">Back to Placement</Link></section>;
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePlacement } from "../context/PlacementContext";
import { hasRemoteApi } from "../services/api";
import { authorizedRequest } from "../services/authService";
import { getHistory } from "../services/history";
import { readLocalInterviewResult } from "../utils/interviewResultStorage";

function isComplete(state) {
  return ["easy", "medium", "hard"].every((level) => state?.aptitude?.[level] === "passed")
    && ["easy", "medium", "hard"].every((level) => state?.coding?.[level] === "passed")
    && state?.interview?.status === "passed";
}

export default function PlacementReport() {
  const { user } = useAuth();
  const { placementState } = usePlacement();
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const localReport = useMemo(() => {
    if (hasRemoteApi || !isComplete(placementState)) return null;
    const history = getHistory();
    const interviewEntry = history.find((entry) => entry.type === "Interview" && entry.mode === "placement");
    const interview = interviewEntry && readLocalInterviewResult(interviewEntry.id, user);
    if (!interview) return null;
    return {
      placementState,
      interview,
      assessments: history.filter((entry) => entry.mode === "placement" && entry.type !== "Interview"),
      demoEvaluation: true,
    };
  }, [placementState, user]);

  useEffect(() => {
    let active = true;
    if (hasRemoteApi) {
      authorizedRequest("/api/placement/report")
        .then((value) => { if (active) setReport(value); })
        .catch((failure) => { if (active) setError(failure.message); });
    }
    return () => { active = false; };
  }, [placementState, user]);

  const displayedReport = hasRemoteApi ? report : localReport;
  const displayedError = error || (!hasRemoteApi && !isComplete(placementState)
    ? "Complete all Aptitude, Coding, and Interview stages before opening the final report."
    : !hasRemoteApi && !localReport
      ? "The local Placement interview result is unavailable. Complete the interview again."
      : "");

  return <section className="surface-card space-y-5 rounded-3xl p-6 sm:p-9">
    <h1 className="text-3xl font-extrabold">Placement final report</h1>
    {displayedError && <p role="alert" className="text-amber-600">{displayedError}</p>}
    {!displayedReport && !displayedError && <p role="status">Loading Placement results...</p>}
    {displayedReport && <>
      <p className="font-bold text-emerald-600">Aptitude, Coding, and Interview completed</p>
      <p>Interview evaluation: {displayedReport.demoEvaluation ? "Local Backup — demo rubric, not verified technical correctness" : "AI evaluation"}</p>
      <p>{displayedReport.interview.summary || "Interview completed successfully."}</p>
      <p className="text-xl font-bold">Interview score: {displayedReport.interview.score}%</p>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Assessment</th><th className="p-3">Score</th></tr></thead><tbody>{displayedReport.assessments.map((entry) => <tr key={entry.id} className="border-t border-gray-200 dark:border-gray-700"><td className="p-3">{entry.title}</td><td className="p-3">{entry.score}%</td></tr>)}</tbody></table></div>
      <Link className="block font-bold text-indigo-600" to={`/interview/result/${displayedReport.interview.id}`}>View interview feedback</Link>
    </>}
    <Link className="block font-bold text-indigo-600" to="/placement">Back to Placement</Link>
  </section>;
}

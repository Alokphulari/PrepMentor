import { hasRemoteApi } from "./api";
import { authorizedRequest } from "./authService";

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function evaluateLocally({ config, questions, answers }) {
  const wordCounts = questions.map((_, index) =>
    (answers[index] || "").trim().split(/\s+/).filter(Boolean).length
  );
  const answered = wordCounts.filter((count) => count >= 20).length;
  const completion = clamp((answered / questions.length) * 100);
  const depth = clamp(
    (wordCounts.reduce((sum, count) => sum + Math.min(count, 80), 0) /
      questions.length) *
      1.25
  );
  const score = clamp(completion * 0.65 + depth * 0.35);

  return {
    score,
    role: config.role || "Software Engineer",
    type: config.interviewType || "Mixed",
    evaluationMode: "Local response-completeness rubric",
    metrics: {},
    summary: "Offline response completion only. Technical correctness, reasoning and communication have not been assessed.",
  };
}

export async function evaluateInterview(payload) {
  if (!hasRemoteApi) {
    return evaluateLocally(payload);
  }

  const response = await authorizedRequest("/api/interviews/evaluate", {
      method: "POST",
      expireSession: false,
      body: JSON.stringify(payload),
    });
  return response.result;
}

export async function getRemoteInterviewResult(id) {
  if (!hasRemoteApi) return null;
  const response = await authorizedRequest(`/api/interviews/${encodeURIComponent(id)}`, { expireSession: false });
  return response.result;
}

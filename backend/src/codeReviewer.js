import { structuredCompletion } from "./ai/aiClient.js";
import { score, text, list } from "./ai/structuredOutput.js";
const languages = new Set(["JavaScript", "TypeScript", "Python", "Java", "C++", "C", "C#", "Go"]);

export function normalizeCodeReviewRequest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Code review payload is required.");
  const code = typeof value.code === "string" ? value.code.trim().slice(0, 50_000) : "";
  const problem = typeof value.problem === "string" ? value.problem.trim().slice(0, 5000) : "";
  if (!code || !problem) throw new Error("Code review requires a problem and solution.");
  return { code, problem, language: languages.has(value.language) ? value.language : "JavaScript" };
}

export async function reviewCode(value) {
  const input = normalizeCodeReviewRequest(value);
  return structuredCompletion("Review solution quality, complexity and edge cases. Never claim execution or decide test correctness. Return {score,summary,strengths:[],issues:[],complexity}.", input, (value) => ({ score: score(value.score), summary: text(value.summary), strengths: list(value.strengths), issues: list(value.issues), complexity: text(value.complexity), mode: "AI semantic review (code not executed)" }));
}

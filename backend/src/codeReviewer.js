const languages = new Set(["JavaScript", "TypeScript", "Python", "Java", "C++", "C", "C#", "Go"]);

export function normalizeCodeReviewRequest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Code review payload is required.");
  const code = typeof value.code === "string" ? value.code.trim().slice(0, 50_000) : "";
  const problem = typeof value.problem === "string" ? value.problem.trim().slice(0, 5000) : "";
  if (!code || !problem) throw new Error("Code review requires a problem and solution.");
  return { code, problem, language: languages.has(value.language) ? value.language : "JavaScript" };
}

function extractJson(content) {
  return JSON.parse(String(content || "").replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim());
}

export async function reviewCode(value) {
  if (!process.env.LLM_API_KEY) {
    const error = new Error("AI code review is not configured. Add LLM_API_KEY to backend/.env.");
    error.status = 503;
    throw error;
  }
  const input = normalizeCodeReviewRequest(value);
  const baseUrl = (process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/chat/completions`, { method: "POST", headers: { Authorization: `Bearer ${process.env.LLM_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: process.env.LLM_MODEL || "gpt-4.1-mini", temperature: 0.2, max_tokens: 1800, messages: [{ role: "system", content: "You are a strict coding interview reviewer. Never claim code was executed. Return JSON only." }, { role: "user", content: `Review this ${input.language} solution against the problem. Analyze logical correctness, complexity, edge cases, and code quality. Return {score:0-100, summary:string, strengths:string[], issues:string[], complexity:string}.\nProblem: ${input.problem}\nSolution:\n${input.code}` }] }), signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw Object.assign(new Error(`The code review provider returned status ${response.status}.`), { status: 502 });
  const result = extractJson((await response.json()).choices?.[0]?.message?.content);
  return { score: Math.max(0, Math.min(100, Math.round(Number(result.score) || 0))), summary: String(result.summary || "Review completed.").slice(0, 1000), strengths: Array.isArray(result.strengths) ? result.strengths.map(String).slice(0, 5) : [], issues: Array.isArray(result.issues) ? result.issues.map(String).slice(0, 6) : [], complexity: String(result.complexity || "Not established").slice(0, 500), mode: "AI semantic review (code not executed)" };
}

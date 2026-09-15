function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function textList(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim().slice(0, 240)).filter(Boolean).slice(0, 5)
    : [];
}

export function normalizeAiEvaluation(value, fallback) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid AI interview evaluation.");
  const metrics = value.metrics && typeof value.metrics === "object" ? value.metrics : {};
  const normalized = {
    ...fallback,
    score: clamp(value.score),
    metrics: {
      communication: clamp(metrics.communication),
      technical: clamp(metrics.technical),
      problemSolving: clamp(metrics.problemSolving),
      confidence: clamp(metrics.confidence),
    },
    strengths: textList(value.strengths),
    weaknesses: textList(value.weaknesses),
    recommendations: textList(value.recommendations),
    evaluationMode: "AI semantic interview evaluation",
  };
  if (!normalized.strengths.length || !normalized.weaknesses.length || !normalized.recommendations.length) {
    throw new Error("Incomplete AI interview evaluation.");
  }
  return normalized;
}

function extractJson(content) {
  return JSON.parse(String(content || "").replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim());
}

export async function evaluateInterviewSemantically(payload, fallback) {
  if (!process.env.LLM_API_KEY) return { ...fallback, evaluationMode: "Server response-completeness rubric" };
  const questions = payload.questions.slice(0, 8).map((item, index) => ({
    question: String(item?.question || "").slice(0, 1000),
    answer: String(payload.answers?.[index] || "").slice(0, 6000),
  }));
  const prompt = `Evaluate this ${fallback.type} interview for a ${fallback.role} role. Judge whether each answer genuinely addresses its question, technical correctness, specificity, reasoning, communication, and confidence. Do not reward length alone. Return ONLY JSON with score (0-100), metrics {communication, technical, problemSolving, confidence}, strengths (array), weaknesses (array), recommendations (array).\n\n${JSON.stringify(questions)}`;
  try {
    const baseUrl = (process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.LLM_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || "gpt-4.1-mini",
        temperature: 0.2,
        max_tokens: 1800,
        messages: [
          { role: "system", content: "You are a strict interview evaluator. Base scores only on the submitted answers and return valid JSON." },
          { role: "user", content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) throw new Error("AI evaluator unavailable.");
    const responseBody = await response.json();
    return normalizeAiEvaluation(extractJson(responseBody.choices?.[0]?.message?.content), fallback);
  } catch {
    return { ...fallback, evaluationMode: "Server response-completeness rubric (AI unavailable)" };
  }
}

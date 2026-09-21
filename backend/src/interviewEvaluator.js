import { structuredCompletion, isConfigured } from "./ai/aiClient.js";
import { score, text, list } from "./ai/structuredOutput.js";
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
  score(value.score);
  for (const key of ["communication", "technical", "problemSolving", "confidence"]) score(metrics[key]);
  if (metrics.answerRelevance !== undefined) normalized.metrics.answerRelevance = score(metrics.answerRelevance);
  normalized.weakTopics = (value.weakTopics || []).slice(0, 20).map((item) => ({ topic: text(item.topic, 160), score: score(item.score), reason: text(item.reason) }));
  normalized.questionFeedback = (value.questionFeedback || []).slice(0, 20).map((item) => ({ question: text(item.question), score: score(item.score), feedback: text(item.feedback), betterApproach: text(item.betterApproach || item.idealAnswer), idealAnswer: text(item.idealAnswer || item.betterApproach, 6000) }));
  normalized.confidenceDescription = "Observable clarity and fluency proxy; not psychological confidence.";
  return normalized;
}

export async function evaluateInterviewSemantically(payload, fallback) {
  if (!isConfigured()) return { ...fallback, evaluationMode: "Server response-completeness rubric" };
  const questions = payload.questions.slice(0, 20).map((item, index) => ({ question: String(item?.question || "").slice(0, 2000), answer: String(payload.answers?.[index] || "").slice(0, 10000) }));
  try {
    return await structuredCompletion("Evaluate the FULL interview for relevance, technical correctness, reasoning, specificity, completeness and communication. Never reward length alone. confidence is only an observable communication/fluency proxy, never psychological diagnosis. Return score 0-100, metrics {communication,technical,problemSolving,confidence,answerRelevance}, strengths[], weaknesses[], recommendations[], weakTopics[{topic,score,reason}], questionFeedback[{question,answer,score,feedback,idealAnswer,betterApproach}] for EVERY question. idealAnswer is a strong sample answer, not the only correct response. Use STAR for behavioral samples.", { role: fallback.role, type: fallback.type, questions }, (value) => {
      const result = normalizeAiEvaluation(value, fallback);
      if (result.questionFeedback.length !== questions.length || !Array.isArray(value.weakTopics)) throw new Error("Incomplete evaluation.");
      result.questionFeedback = result.questionFeedback.map((item, index) => ({ ...item, question: questions[index].question, answer: questions[index].answer }));
      return result;
    });
  } catch {
    return { ...fallback, evaluationMode: "Server response-completeness rubric (AI unavailable)" };
  }
}

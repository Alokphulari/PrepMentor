import { structuredCompletion } from "./ai/aiClient.js";
import { object, score, text, list } from "./ai/structuredOutput.js";

export function validateAnswerEvaluation(value) {
  object(value);
  return { ...Object.fromEntries(["score", "technicalAccuracy", "relevance", "communication", "reasoning"].map((key) => [key, score(value[key])])), strengths: list(value.strengths), improvements: list(value.improvements), feedback: text(value.feedback), idealAnswer: text(value.idealAnswer, 6000), source: "AI semantic answer evaluation" };
}
export function similarQuestion(left, right) {
  const words = (value) => new Set(String(value).toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean));
  const a = words(left), b = words(right);
  const overlap = [...a].filter((word) => b.has(word)).length;
  return overlap / Math.max(1, new Set([...a, ...b]).size) >= 0.72;
}
export function interviewContext(user) {
  return { profile: { targetRole: user?.targetRole, experience: user?.experience, skills: user?.skills }, resume: user?.resumeAnalysis ? { skills: user.resumeAnalysis.skills, projects: user.resumeAnalysis.projects, experience: user.resumeAnalysis.experience } : null };
}
export async function evaluateAnswer(config, turns, current, context, generate = structuredCompletion) {
  try {
    return await generate("Evaluate the CURRENT interview answer semantically. Assess correctness, relevance, reasoning and clarity, never length alone. Return score, technicalAccuracy, relevance, communication, reasoning (all 0-100), strengths[], improvements[], feedback, idealAnswer. idealAnswer is a strong sample answer, not the only correct answer. Use a concrete STAR example for behavioral questions without attributing fictional experience to the candidate; technical samples must be accurate and concise. Evaluate against the question and role.", { config, context, recentConversation: turns.slice(-6), currentQuestion: current.question, currentAnswer: current.transcript, topicsCovered: [...new Set(turns.map((turn) => turn.focus))] }, validateAnswerEvaluation, { timeoutMs: 20000, retries: 0 });
  } catch {
    return { score: current.transcript.trim().split(/\s+/).length >= 20 ? 100 : 0, technicalAccuracy: null, relevance: null, communication: null, reasoning: null, strengths: [], improvements: ["Use a concrete example and explain your reasoning."], feedback: "Offline response-completeness rubric only. AI could not assess correctness or relevance.", idealAnswer: null, source: "Offline response-completeness rubric" };
  }
}

import { withInterviewFallback } from "../services/interviewAIService.js";
import { evaluateAnswer as evaluateLocally } from "../services/localInterviewService.js";
import { answerSchema } from "./ai/interviewSchemas.js";
import { interviewCompletion as structuredCompletion, interviewProviderConfig } from "./ai/interviewProvider.js";
import { object, score, text, list } from "./ai/structuredOutput.js";

export function validateAnswerEvaluation(value) {
  object(value);
  return { ...Object.fromEntries(["completeness", "clarity", "specificity", "problemSolving"].filter((key) => value[key] !== undefined).map((key) => [key, score(value[key])])), ...Object.fromEntries(["score", "technicalAccuracy", "relevance", "communication", "reasoning"].map((key) => [key, score(value[key])])), strengths: list(value.strengths), improvements: list(value.improvements), feedback: text(value.feedback), idealAnswer: text(value.idealAnswer, 6000), weakTopics: list(value.weakTopics || []), technicalCorrectness: score(value.technicalAccuracy), source: "AI semantic answer evaluation" };
}
export function similarQuestion(left, right) {
  const words = (value) => new Set(String(value).toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean));
  const a = words(left), b = words(right);
  const overlap = [...a].filter((word) => b.has(word)).length;
  return overlap / Math.max(1, new Set([...a, ...b]).size) >= 0.72;
}
export function interviewContext(user) {
  return { weakTopics: (user?.interviewResults || []).slice(0, 3).flatMap((result) => result.weakTopics || []).slice(0, 20), profile: { targetRole: user?.targetRole, experience: user?.experience, skills: user?.skills }, resume: user?.resumeAnalysis ? { skills: user.resumeAnalysis.skills, projects: user.resumeAnalysis.projects, experience: user.resumeAnalysis.experience } : null };
}
async function primaryAnswer(config, turns, current, context, generate = structuredCompletion, limits = {}) {
  const evaluation = await generate("Evaluate the CURRENT interview answer semantically. Assess correctness, relevance, reasoning and clarity, never length alone. Return score, technicalAccuracy, relevance, communication, reasoning, completeness, clarity, specificity, problemSolving (all 0-100), strengths[], improvements[], weakTopics[] (topic names), feedback, idealAnswer. Assess completeness, specificity and problem-solving approach where appropriate. idealAnswer is a strong sample answer, not the only correct answer. Use a concrete STAR example for behavioral questions without attributing fictional experience to the candidate; technical samples must be accurate and concise. Evaluate against the question and role.", { config, context, recentConversation: turns.slice(-6), currentQuestion: current.question, currentAnswer: current.transcript, topicsCovered: [...new Set(turns.map((turn) => turn.focus))] }, validateAnswerEvaluation, { timeoutMs: 20000, retries: 1, schema: answerSchema, ...limits });
  return { ...evaluation, provider: interviewProviderConfig().provider };
}

export async function evaluateAnswer(config, turns, current, context, generate = structuredCompletion) {
  return withInterviewFallback(
    (limits) => primaryAnswer(config, turns, current, context, generate, limits),
    () => evaluateLocally(current),
    { forceLocal: config.fallbackUsed || current.fallbackUsed || turns.some((turn) => turn.answerEvaluation?.fallbackUsed), configured: generate !== structuredCompletion || undefined }
  );
}

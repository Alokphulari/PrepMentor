import { findUserById } from "./userStore.js";
import { performanceEvidence, localPerformanceAnalysis } from "../../frontend/src/utils/performanceAnalysis.js";
import { interviewCompletion } from "./ai/interviewProvider.js";
import { withInterviewFallback } from "../services/interviewAIService.js";
import { text, list } from "./ai/structuredOutput.js";
export async function analyzePerformance(userId, generate = interviewCompletion) {
  const user = await findUserById(userId);
  const evidence = performanceEvidence(user.history || [], user.interviewResults || []);
  if (!evidence.count) return localPerformanceAnalysis(evidence);
  const result = await withInterviewFallback(async (options) => generate(
    "Analyze these actual preparation results. Do not invent attempts, scores, trends, or skills. Keep local estimates separate from measured results. Give specific study actions for weak topics. Return {summary:string,strengths:string[],recommendations:string[]}.",
    evidence, (value) => ({ summary: text(value.summary), strengths: list(value.strengths, 10), recommendations: list(value.recommendations, 10) }), options),
  () => localPerformanceAnalysis(evidence), { configured: generate !== interviewCompletion || undefined });
  return { ...result, evidence, createdAt: new Date().toISOString() };
}

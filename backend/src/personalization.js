import { randomUUID, createHash } from "node:crypto";
import { findUserById, mutateUser } from "./userStore.js";
import { structuredCompletion } from "./ai/aiClient.js";
import { getSkillBaseline } from "./resumeAnalysis.js";
import { text, list } from "./ai/structuredOutput.js";

export function measuredWeakTopics(history = []) {
  const latest = new Map();
  for (const entry of history) {
    if (!/aptitude/i.test(entry.type) && !["Coding", "Interview"].includes(entry.type)) continue;
    if ((entry.evaluationMode || "").includes("rubric")) continue;
    if (entry.evidenceType === "self-reported") continue;
    for (const item of entry.topicPerformance || []) if (!latest.has(item.topic)) latest.set(item.topic, item.percentage);
  }
  return [...latest].filter(([, score]) => Number.isFinite(score) && score < 80).map(([topic, score]) => ({ topic, score })).sort((a, b) => a.score - b.score).slice(0, 10);
}
const pending = new Map();
export function personalizedPlan(userId, kind, refresh = false) {
  const key = userId + ":" + kind;
  if (pending.has(key)) return pending.get(key);
  const promise = buildPlan(userId, kind, refresh).finally(() => pending.delete(key));
  pending.set(key, promise);
  return promise;
}
async function buildPlan(userId, kind, refresh) {
  const user = await findUserById(userId);
  const key = kind === "roadmap" ? "careerRoadmaps" : "learningPlans";
  const results = (user.history || []).filter((entry) => /aptitude|coding|interview/i.test(entry.type) && !["self-reported", "semantic-or-static-review"].includes(entry.evidenceType) && !(entry.evaluationMode || "").includes("rubric")).sort((a,b) => Date.parse(b.createdAt)-Date.parse(a.createdAt)).slice(0, 20);
  const evidenceId = createHash("sha256").update(JSON.stringify({ results, resume: user.resumeAnalysis, role: user.targetRole, skills: user.skills, experience: user.experience })).digest("hex");
  if (!refresh && user[key]?.[0] && (kind === "roadmap" || user[key][0].evidenceId === evidenceId)) return user[key][0];
  const weakTopics = measuredWeakTopics(results);
  const role = user.targetRole || "Software Engineer";
  const data = { role, profile: { experience: user.experience, skills: user.skills }, resumeAnalysis: user.resumeAnalysis || null, skillBaseline: await getSkillBaseline(userId), aptitudePerformance: results.filter((entry) => /aptitude/i.test(entry.type)), codingPerformance: results.filter((entry) => /coding/i.test(entry.type)), interviewPerformance: (user.interviewResults || []).slice(0, 5), strengths: results.filter((entry) => entry.score >= 80).map((entry) => entry.title), results, weakTopics };
  let plan;
  try {
    plan = await structuredCompletion(kind === "roadmap" ? "Create a personalized career roadmap from the evidence. No URLs. Return role, readinessSummary, strengths[], gaps[], steps[{period,title,tasks:[],successMetric}] (1-8 steps)." : "Create learning tasks only for the supplied measured weakTopics. No URLs. Return learningPlan[{topic,priority,explanation,tasks:[],practiceGoal}]. Do not invent weaknesses.", data, (value) => {
      if (kind === "roadmap") {
        if (!Array.isArray(value.steps) || !value.steps.length || value.steps.length > 8) throw new Error("Invalid roadmap.");
        return { role: text(value.role, 160), readinessSummary: text(value.readinessSummary), strengths: list(value.strengths || value.currentStrengths), currentStrengths: list(value.strengths || value.currentStrengths), gaps: list(value.gaps), steps: value.steps.map((step) => ({ period: text(step.period, 160), title: text(step.title, 200), tasks: list(step.tasks), successMetric: text(step.successMetric) })) };
      }
      if (!Array.isArray(value.learningPlan) || value.learningPlan.length !== weakTopics.length) throw new Error("Invalid learning plan.");
      return { weakTopics, learningPlan: value.learningPlan.map((item) => {
        if (!weakTopics.some((weak) => weak.topic === item.topic)) throw new Error("Unknown weak topic.");
        return { topic: item.topic, priority: text(item.priority, 40), explanation: text(item.explanation), tasks: list(item.tasks), practiceGoal: text(item.practiceGoal) };
      }) };
    });
    plan.source = "AI personalized plan";
  } catch {
    plan = kind === "roadmap" ? { role, readinessSummary: `${results.length} recorded assessments inform your ${role} preparation. ${weakTopics.length ? "Focus first on the measured gaps below." : "Complete fresh assessments to establish missing evidence."}`, strengths: data.strengths, currentStrengths: data.strengths, gaps: weakTopics.map((item) => item.topic), steps: (weakTopics.length ? weakTopics : [{ topic: `Establish ${role} assessment evidence` }, ...(user.resumeAnalysis?.missingAreas || []).slice(0, 3).map((topic) => ({topic}))]).map((item, index) => ({ period: `Week ${index + 1}`, title: item.topic, tasks: [`Review ${item.topic} for ${role}`, `Explain three ${item.topic} examples using your own project experience`, "Complete a fresh practice assessment"], successMetric: "Reach 80% on a fresh assessment" })) } : { weakTopics, learningPlan: weakTopics.map((item) => ({ topic: item.topic, priority: "high", explanation: `Latest measured score: ${item.score}%.`, tasks: ["Review the concept", "Explain a worked example", "Practice three new questions"], practiceGoal: "Reach 80% on a fresh assessment" })) };
    plan.source = "Deterministic evidence-based fallback";
  }
  const snapshot = { ...plan, id: randomUUID(), evidenceId, createdAt: new Date().toISOString() };
  await mutateUser(userId, (current) => ({ [key]: [snapshot, ...(current[key] || [])].slice(0, 10) }));
  return snapshot;
}

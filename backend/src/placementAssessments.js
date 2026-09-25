import { randomUUID } from "node:crypto";
import { findUserById, mutateUser } from "./userStore.js";
import { DEFAULT_PLACEMENT_STATE, validatePlacementState } from "./placement.js";
import { generateOfflineQuestions } from "../../frontend/src/utils/offlineQuestionGenerator.js";
const levels = ["easy", "medium", "hard"];
function allowed(state, level) {
  validatePlacementState(state);
  if (!levels.includes(level) || state.aptitude[level] !== "available") throw Object.assign(new Error("This aptitude level is locked or requires a retake."), { status: 403 });
}
const publicSession = ({ id, level, questions, expiresAt }) => ({ id, level, expiresAt, source: "server-curated", questions: questions.map(({ answer: _answer, ...question }) => question) });
export async function startAptitude(userId, value) {
  const user = await mutateUser(userId, (current) => {
    const state = current.placementState || DEFAULT_PLACEMENT_STATE;
    allowed(state, value.level);
    const existing = current.aptitudeSession;
    if (existing?.level === value.level && !existing.completed && Date.parse(existing.expiresAt) > Date.now()) return {};
    return { aptitudeSession: { id: randomUUID(), level: value.level, expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), questions: generateOfflineQuestions({ category: "quantitative", difficulty: value.level, count: 30 }) } };
  });
  return publicSession(user.aptitudeSession);
}
export async function submitAptitude(userId, value) {
  let outcome;
  await mutateUser(userId, (current) => {
    const session = current.aptitudeSession;
    if (!session || session.id !== value.sessionId) throw Object.assign(new Error("Assessment session not found. Start this level again."), { status: 404 });
    if (session.completed) { outcome = { ...session.result, placementState: current.placementState }; return {}; }
    if (Date.parse(session.expiresAt) <= Date.now()) throw Object.assign(new Error("Assessment expired. Start this level again."), { status: 409 });
    const state = structuredClone(current.placementState || DEFAULT_PLACEMENT_STATE);
    allowed(state, session.level);
    if (!value.answers || typeof value.answers !== "object" || Array.isArray(value.answers) || Object.keys(value.answers).length !== session.questions.length) throw new Error("Answer every question before submitting.");
    let correct = 0;
    const topics = new Map();
    session.questions.forEach((question, index) => {
      if (!question.options.includes(value.answers[index])) throw new Error("Invalid answer selection.");
      const item = topics.get(question.topic) || { topic: question.topic || "Aptitude", correct: 0, total: 0 };
      item.total++;
      if (value.answers[index] === question.answer) { correct++; item.correct++; }
      topics.set(question.topic, item);
    });
    const score = Math.round(correct / session.questions.length * 100), passed = score >= 80;
    state.aptitude[session.level] = passed ? "passed" : "failed";
    if (passed) {
      if (session.level === "hard") state.coding.easy = "available";
      else state.aptitude[levels[levels.indexOf(session.level) + 1]] = "available";
    }
    const topicPerformance = [...topics.values()].map((item) => ({ ...item, percentage: Math.round(item.correct / item.total * 100) }));
    const entry = { id: randomUUID(), title: "Placement Aptitude " + session.level, type: "Placement Aptitude", mode: "placement", difficulty: session.level, evidenceType: "server-assessment", score, topicPerformance, duration: "Self-paced", createdAt: new Date().toISOString() };
    outcome = { correct, passed, entry, topicPerformance, placementState: state };
    return { placementState: state, history: [entry, ...(current.history || [])].slice(0, 100), aptitudeSession: { ...session, completed: true, result: outcome } };
  });
  return outcome;
}
export async function finalPlacementReport(userId) {
  const user = await findUserById(userId);
  const state = validatePlacementState(user.placementState || DEFAULT_PLACEMENT_STATE);
  if (state.interview.status !== "passed") throw Object.assign(new Error("Pass Aptitude, Coding, and Interview before opening the final report."), { status: 403 });
  const interview = (user.interviewResults || []).find((result) => result.mode === "placement" && result.score >= 80);
  if (!interview) throw Object.assign(new Error("A completed Placement interview report is required."), { status: 403 });
  const assessments = (user.history || []).filter((entry) => entry.mode === "placement" && entry.evidenceType === "server-assessment");
  return { placementState: state, interview, assessments, demoEvaluation: Boolean(interview.fallbackUsed || interview.provider === "local"), completedAt: interview.createdAt };
}

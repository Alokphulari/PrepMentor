import { withInterviewFallback } from "../services/interviewAIService.js";
import { generateQuestion } from "../services/localInterviewService.js";
import { questionSchema } from "./ai/interviewSchemas.js";
import { randomUUID } from "node:crypto";
import { findUserById, mutateUser } from "./userStore.js";
import { interviewCompletion as structuredCompletion, aiError } from "./ai/interviewProvider.js";
import { text } from "./ai/structuredOutput.js";
import { evaluateInterviewSemantically } from "./interviewEvaluator.js";
import { saveInterviewResult } from "./interviewResults.js";

import { evaluateAnswer, similarQuestion, interviewContext } from "./interviewAnswer.js";

const busy = new Set();
export async function withSessionLock(key, operation) {
  if (busy.has(key)) throw Object.assign(new Error("This session is already processing a request."), { status: 409 });
  busy.add(key);
  try { return await operation(); } finally { busy.delete(key); }
}
export function normalizeInterviewConfig(value = {}) {
  return {
    role: text(value.role || "Software Engineer", 160), experience: text(value.experience || "Entry level", 160),
    interviewType: ["Technical", "Behavioral", "Mixed"].includes(value.interviewType) ? value.interviewType : "Mixed",
    difficulty: ["easy", "medium", "hard"].includes(String(value.difficulty).toLowerCase()) ? value.difficulty.toLowerCase() : "medium",
    focusAreas: Array.isArray(value.focusAreas) ? value.focusAreas.slice(0, 4).map((item) => text(item, 100)) : [],
    duration: [10, 20, 30].includes(value.duration) ? value.duration : 20,
    mode: value.mode === "placement" ? "placement" : "practice",
  };
}
async function primaryInterviewQuestion(config, turns, generate = structuredCompletion, context = {}, options = {}) {
  const question = await generate("Act as a professional interviewer. Generate ONE concise relevant next question in {question,focus,category,topic,difficulty,isFollowUp}. Ask exactly one question, never teach or reveal the answer. React to the candidate's previous answer, probe missing details, avoid duplicates, do not praise or reveal answers. For a weak evaluation, probe or clarify the same concept and simplify. For a strong evaluation, deepen with a tradeoff, edge case or application. Avoid close paraphrases of recent questions. Adapt difficulty reasonably. Technical interviews probe reasoning; behavioral interviews use STAR; mixed interviews balance both. Follow the selected role, experience and focus areas.", {
      config, context, topicsCovered: [...new Set(turns.map((turn) => turn.focus))], recentConversation: turns.slice(-6).map(({ question, transcript, answerEvaluation }) => ({ question, transcript, answerEvaluation })), askedQuestions: turns.map((turn) => turn.question).slice(-20),
    }, (value) => ({ question: text(value.question, 1500), focus: text(value.focus, 160), difficulty: ["easy","medium","hard"].includes(value.difficulty) ? value.difficulty : config.difficulty, category: text(value.category || config.interviewType || "Mixed", 160), topic: text(value.topic || value.focus, 160), isFollowUp: value.isFollowUp === true, source: "llm" }), { timeoutMs: 20000, retries: 1, schema: questionSchema, ...options });
    if (turns.some((turn) => similarQuestion(turn.question, question.question))) throw aiError("AI_INVALID_RESPONSE", "Gemini repeated a question. Your answer is preserved; please retry.");
    return question;
}
export async function nextInterviewQuestion(config, turns, generate = structuredCompletion, context = {}, options = {}) {
  return withInterviewFallback(
    (limits) => primaryInterviewQuestion(config, turns, generate, context, { ...options, ...limits }),
    () => generateQuestion(config, turns),
    { forceLocal: config.fallbackUsed || turns.some((turn) => turn.fallbackUsed || turn.answerEvaluation?.fallbackUsed), configured: generate !== structuredCompletion || undefined }
  );
}
function sessionMetadata(turns, currentQuestion, result) {
  const fallbackUsed = Boolean(currentQuestion?.fallbackUsed || result?.fallbackUsed || turns.some((turn) => turn.fallbackUsed || turn.answerEvaluation?.fallbackUsed));
  return {
    success: true, fallbackUsed, providerUsed: fallbackUsed ? "local" : (currentQuestion?.provider || result?.provider || "gemini"),
    questionsAsked: [...turns.map((turn) => turn.question), ...(currentQuestion ? [currentQuestion.question] : [])],
    answers: turns.map((turn) => turn.transcript), scores: turns.map((turn) => turn.answerEvaluation?.score ?? 0),
    currentDifficulty: currentQuestion?.difficulty || turns.at(-1)?.difficulty || "medium",
  };
}
async function readInterviewSession(userId, id) {
  const user = await findUserById(userId);
  const session = user?.interviewSessions?.find((item) => item.id === id);
  if (!session) throw Object.assign(new Error("Interview session not found."), { status: 404 });
  return session;
}
export function publicInterviewSession(session) {
  if (session.config.mode !== "placement" || session.status === "completed") return session;
  const { scores: _privateScores, ...visible } = session;
  const hideHints = ({ keywords: _keywords, followUps: _followUps, ...question }) => question;
  return { ...visible, currentQuestion: session.currentQuestion ? hideHints(session.currentQuestion) : null, turns: session.turns.map(({ answerEvaluation: _privateEvaluation, ...turn }) => hideHints(turn)) };
}
export async function getInterviewSession(userId, id) {
  return publicInterviewSession(await readInterviewSession(userId, id));
}
function assertSessionVersion(user, session, expectedVersion) {
  if (expectedVersion === undefined) return;
  const current = user.interviewSessions?.find((item) => item.id === session.id);
  if (!current || (current.version || 0) !== expectedVersion || current.status !== "active") throw Object.assign(new Error("This interview turn has already changed. Refresh the session."), { status: 409 });
}
async function storeSession(userId, session, expectedVersion) {
  await mutateUser(userId, (user) => {
    assertSessionVersion(user, session, expectedVersion);
    return { interviewSessions: [session, ...(user.interviewSessions || []).filter((item) => item.id !== session.id)].slice(0, 20) };
  });
  return publicInterviewSession(session);
}
export async function startInterviewSession(userId, value) {
  const config = normalizeInterviewConfig(value);
  const user = await findUserById(userId);
  if (config.mode === "placement" && user?.placementState?.interview?.status !== "available") throw Object.assign(new Error("Complete Placement Coding before the interview."), { status: 403 });
  const currentQuestion = await nextInterviewQuestion(config, [], structuredCompletion, interviewContext(user), { timeoutMs: 15000, retries: 0 });
  const startedAt = new Date().toISOString();
  return storeSession(userId, { id: randomUUID(), userId, config, version: 0, createdAt: startedAt, updatedAt: startedAt, expiresAt: new Date(Date.parse(startedAt) + config.duration * 60000).toISOString(), startedAt, duration: config.duration, turns: [], currentQuestion, ...sessionMetadata([], currentQuestion), status: "active" });
}
export async function answerInterviewSession(userId, id, value) {
  return withSessionLock(`${userId}:${id}`, async () => {
    const session = await readInterviewSession(userId, id);
    if (session.status === "completed") return session;
    if (session.config.mode === "placement" && (await findUserById(userId))?.placementState?.interview?.status !== "available") throw Object.assign(new Error("The Placement interview is no longer available. Check your progress or remediation."), { status: 403 });
    if (session.turns.length >= 20 || (value.turnIndex !== session.turns.length || (value.version !== undefined && value.version !== (session.version || 0)))) throw Object.assign(new Error("This interview turn has already changed. Refresh the session."), { status: 409 });
    const transcript = text(value.transcript, 10000);
    const now = new Date().toISOString();
    const turn = { ...session.currentQuestion, turnNumber: session.turns.length + 1, answer: transcript, answerSource: value.answerSource === "voice" ? "voice" : "typed", askedAt: session.questionStartedAt || session.startedAt, answeredAt: now, transcript, answerStartedAt: session.questionStartedAt || session.startedAt, answerEndedAt: now, wordCount: transcript.split(/\s+/).length };
    const context = interviewContext(await findUserById(userId));
    const activeConfig = { ...session.config, fallbackUsed: session.fallbackUsed };
    turn.answerEvaluation = await evaluateAnswer(activeConfig, session.turns, turn, context);
    const turns = [...session.turns, turn];
    const finish = value.finish === true || turns.length >= 20 || Date.now() - Date.parse(session.startedAt) >= session.duration * 60000;
    if (finish) {
      const payload = { config: { ...activeConfig, fallbackUsed: activeConfig.fallbackUsed || turn.answerEvaluation.fallbackUsed }, questions: turns.map((item) => ({ question: item.question, answerEvaluation: item.answerEvaluation })), answers: Object.fromEntries(turns.map((item, index) => [index, item.transcript])) };
      const fallback = { role: session.config.role, type: session.config.interviewType, questionFeedback: turns.map((item) => ({ question: item.question, answer: item.transcript, ...item.answerEvaluation })) };
      const evaluation = await evaluateInterviewSemantically(payload, fallback);
      // One user-store mutation commits the report, history, session and gating.
      const result = await saveInterviewResult(userId, { ...evaluation, mode: session.config.mode, difficulty: session.config.difficulty }, `${session.duration} min`, (current, result) => {
        assertSessionVersion(current, session, session.version || 0);
        const completed = { ...session, version: (session.version || 0) + 1, updatedAt: now, turns, ...sessionMetadata(turns, null, result), status: "completed", result, currentQuestion: null };
        const updates = { interviewSessions: [completed, ...(current.interviewSessions || []).filter((item) => item.id !== id)].slice(0, 20) };
        if (session.config.mode === "placement") {
          if (current.placementState?.interview?.status !== "available") throw Object.assign(new Error("Placement progress changed. Reload your interview."), { status: 409 });
          updates.placementState = { ...current.placementState, interview: { ...current.placementState.interview, status: result.score >= 80 ? "passed" : "failed" } };
          updates.interviewRemediation = { resultId: result.id, completed: false };
        }
        return updates;
      });
      return publicInterviewSession({ ...session, version: (session.version || 0) + 1, updatedAt: now, turns, ...sessionMetadata(turns, null, result), status: "completed", result, currentQuestion: null });
    }
    const currentQuestion = await nextInterviewQuestion(activeConfig, turns, structuredCompletion, context);
    return storeSession(userId, { ...session, version: (session.version || 0) + 1, updatedAt: now, turns, currentQuestion, ...sessionMetadata(turns, currentQuestion), questionStartedAt: now }, session.version || 0);
  });
}

export async function completeInterviewRemediation(userId, value) {
  if (typeof value.reflection !== "string" || value.reflection.length > 10000 || value.reflection.trim().split(/\s+/).length < 20) throw new Error("Explain a worked interview answer in at least 20 words.");
  const user = await mutateUser(userId, (current) => {
    if (current.placementState?.interview?.status !== "failed") throw new Error("No failed interview requires remediation.");
    return { interviewRemediation: { ...current.interviewRemediation, completed: true, reflection: value.reflection, completedAt: new Date().toISOString() }, placementState: { ...current.placementState, interview: { ...current.placementState.interview, status: "available" } } };
  });
  return user.placementState;
}

import { randomUUID } from "node:crypto";
import { findUserById, mutateUser } from "./userStore.js";
import { structuredCompletion } from "./ai/aiClient.js";
import { text } from "./ai/structuredOutput.js";
import { evaluateInterviewSemantically } from "./interviewEvaluator.js";
import { saveInterviewResult } from "./interviewResults.js";
import { buildInterviewQuestions } from "../../frontend/src/data/interviewQuestions.js";

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
export async function nextInterviewQuestion(config, turns, generate = structuredCompletion, context = {}) {
  try {
    const question = await generate("Act as a professional interviewer. Generate ONE relevant next question in {question,focus}. React to the candidate's previous answer, probe missing details, avoid duplicates, do not praise or reveal answers. For a weak evaluation, probe or clarify the same concept and simplify. For a strong evaluation, deepen with a tradeoff, edge case or application. Avoid close paraphrases of recent questions. Adapt difficulty reasonably. Technical interviews probe reasoning; behavioral interviews use STAR; mixed interviews balance both. Follow the selected role, experience and focus areas.", {
      config, context, topicsCovered: [...new Set(turns.map((turn) => turn.focus))], recentConversation: turns.slice(-6).map(({ question, transcript, answerEvaluation }) => ({ question, transcript, answerEvaluation })), askedQuestions: turns.map((turn) => turn.question).slice(-20),
    }, (value) => ({ question: text(value.question, 1500), focus: text(value.focus, 160), difficulty: ["easy","medium","hard"].includes(value.difficulty) ? value.difficulty : config.difficulty, source: "llm" }), { timeoutMs: 20000, retries: 0 });
    if (turns.some((turn) => similarQuestion(turn.question, question.question))) throw new Error("Duplicate question.");
    return question;
  } catch {
    const bank = buildInterviewQuestions({ ...config, questionCount: 20 });
    const selected = bank.find((item) => !turns.some((turn) => similarQuestion(turn.question, item.question)));
    if (!selected) throw Object.assign(new Error("The interview question bank is exhausted. Finish this session."), { status: 409 });
    return { question: selected.question, focus: selected.focus || config.role, source: "curated fallback" };
  }
}
async function readInterviewSession(userId, id) {
  const user = await findUserById(userId);
  const session = user?.interviewSessions?.find((item) => item.id === id);
  if (!session) throw Object.assign(new Error("Interview session not found."), { status: 404 });
  return session;
}
export function publicInterviewSession(session) {
  if (session.config.mode !== "placement" || session.status === "completed") return session;
  return { ...session, turns: session.turns.map(({ answerEvaluation: _privateEvaluation, ...turn }) => turn) };
}
export async function getInterviewSession(userId, id) {
  return publicInterviewSession(await readInterviewSession(userId, id));
}
async function storeSession(userId, session) {
  await mutateUser(userId, (user) => ({ interviewSessions: [session, ...(user.interviewSessions || []).filter((item) => item.id !== session.id)].slice(0, 20) }));
  return publicInterviewSession(session);
}
export async function startInterviewSession(userId, value) {
  const config = normalizeInterviewConfig(value);
  const user = await findUserById(userId);
  if (config.mode === "placement" && user?.placementState?.interview?.status !== "available") throw Object.assign(new Error("Complete Placement Coding before the interview."), { status: 403 });
  const currentQuestion = await nextInterviewQuestion(config, [], structuredCompletion, interviewContext(user));
  return storeSession(userId, { id: randomUUID(), userId, config, startedAt: new Date().toISOString(), duration: config.duration, turns: [], currentQuestion, status: "active" });
}
export async function answerInterviewSession(userId, id, value) {
  return withSessionLock(`${userId}:${id}`, async () => {
    const session = await readInterviewSession(userId, id);
    if (session.status === "completed") return session;
    if (session.config.mode === "placement" && (await findUserById(userId))?.placementState?.interview?.status !== "available") throw Object.assign(new Error("The Placement interview is no longer available. Check your progress or remediation."), { status: 403 });
    if (session.turns.length >= 20 || value.turnIndex !== session.turns.length) throw Object.assign(new Error("This interview turn has already changed. Refresh the session."), { status: 409 });
    const transcript = text(value.transcript, 10000);
    const now = new Date().toISOString();
    const turn = { ...session.currentQuestion, transcript, answerStartedAt: session.questionStartedAt || session.startedAt, answerEndedAt: now, wordCount: transcript.split(/\s+/).length };
    const context = interviewContext(await findUserById(userId));
    turn.answerEvaluation = await evaluateAnswer(session.config, session.turns, turn, context);
    const turns = [...session.turns, turn];
    const finish = value.finish === true || turns.length >= 20 || Date.now() - Date.parse(session.startedAt) >= session.duration * 60000;
    if (finish) {
      const payload = { config: session.config, questions: turns.map((item) => ({ question: item.question })), answers: Object.fromEntries(turns.map((item, index) => [index, item.transcript])) };
      // This fallback reports observable completion only; it is not a skill assessment.
      const completion = Math.round(turns.filter((item) => item.wordCount >= 20).length / turns.length * 100);
      const fallback = { score: completion, role: session.config.role, type: session.config.interviewType, metrics: { communication: completion, technical: 0, problemSolving: 0, confidence: completion }, recommendations: ["Configure AI evaluation to assess technical correctness and reasoning."], weakTopics: [], questionFeedback: turns.map((item) => ({ question: item.question, answer: item.transcript, score: item.answerEvaluation.score, feedback: item.answerEvaluation.feedback, idealAnswer: item.answerEvaluation.idealAnswer, evaluationMode: item.answerEvaluation.source })) };
      const evaluation = await evaluateInterviewSemantically(payload, fallback);
      const result = await saveInterviewResult(userId, { ...evaluation, mode: session.config.mode, difficulty: session.config.difficulty }, `${session.duration} min`);
      if (session.config.mode === "placement") await mutateUser(userId, (current) => ({ placementState: { ...current.placementState, interview: { ...current.placementState.interview, status: evaluation.evaluationMode.startsWith("AI semantic") && result.score >= 80 ? "passed" : "failed" } }, interviewRemediation: { resultId: result.id, completed: false } }));
      return storeSession(userId, { ...session, turns, status: "completed", result, currentQuestion: null });
    }
    const currentQuestion = await nextInterviewQuestion(session.config, turns, structuredCompletion, context);
    return storeSession(userId, { ...session, turns, currentQuestion, questionStartedAt: now });
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

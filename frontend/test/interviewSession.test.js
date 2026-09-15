import assert from "node:assert/strict";
import test from "node:test";
import { createInterviewSession, normalizeInterviewSession } from "../src/utils/interviewSession.js";

const config = { role: "Frontend Developer", createdAt: "2026-09-05T10:00:00.000Z", interviewType: "Technical", difficulty: "Hard", questionCount: 3, focusAreas: ["React"] };
const questions = [
  { question: "Explain reconciliation.", focus: "React" },
  { question: "Explain closures.", topic: "JavaScript" },
  { question: "Design a cache.", focus: "System Design" },
];

test("interview sessions preserve generated questions, position, and safe answers", () => {
  const completeAnswer = Array.from({ length: 20 }, (_, index) => `word${index}`).join(" ");
  const session = createInterviewSession(config, questions, { index: 99, answers: { 0: completeAnswer, 1: completeAnswer, 2: "Current answer", 3: "ignored", bad: {} } });
  assert.equal(session.questions[1].focus, "JavaScript");
  assert.equal(session.index, 2);
  assert.deepEqual(session.answers, { 0: completeAnswer, 1: completeAnswer, 2: "Current answer" });
  assert.deepEqual(normalizeInterviewSession(session), session);
});

test("interview sessions cannot skip unanswered questions", () => {
  const session = createInterviewSession(config, questions, { index: 2, answers: { 0: "Too short", 2: "Injected future answer" } });
  assert.equal(session.index, 0);
  assert.deepEqual(session.answers, { 0: "Too short" });
});

test("interview sessions reject missing identity and replace malformed questions", () => {
  assert.equal(createInterviewSession({ role: "Developer" }, questions), null);
  const session = createInterviewSession(config, [{ unsafe: true }]);
  assert.equal(session.questions.length, 3);
  assert.ok(session.questions.every((item) => item.question));
});

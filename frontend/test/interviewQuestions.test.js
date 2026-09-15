import assert from "node:assert/strict";
import test from "node:test";
import { buildInterviewQuestions } from "../src/data/interviewQuestions.js";

test("interview question builder respects type, focus, and count", () => {
  const questions = buildInterviewQuestions({
    role: "Frontend Developer",
    interviewType: "Technical",
    focusAreas: ["React"],
    questionCount: 3,
  });
  assert.equal(questions.length, 3);
  assert.match(questions[0].question, /Frontend Developer/);
  assert.equal(questions[1].focus, "React");
  const nextQuestions = buildInterviewQuestions({
    role: "Frontend Developer",
    interviewType: "Technical",
    focusAreas: ["React"],
    questionCount: 3,
    excludedQuestions: questions.map((item) => item.question),
  });
  assert.ok(nextQuestions.every((item) => !questions.some((previous) => previous.question === item.question)));
});

test("interview question builder safely normalizes malformed configuration", () => {
  assert.equal(buildInterviewQuestions(null).length, 5);
  assert.equal(buildInterviewQuestions({ questionCount: -4, focusAreas: {} }).length, 5);
  assert.equal(buildInterviewQuestions({ questionCount: 100 }).length, 8);
  assert.doesNotMatch(buildInterviewQuestions({ role: { unsafe: true } })[0].question, /object Object/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { buildInterviewQuestions } from "../src/data/interviewQuestions.js";

test("offline resume interviews ask resume-focused questions", () => {
  const questions = buildInterviewQuestions({
    role: "Software Engineer",
    interviewType: "Resume-based",
    questionCount: 5,
  });
  assert.equal(questions.length, 5);
  assert.ok(questions.slice(1).every((question) => ["Projects", "Skills", "Experience", "Decisions", "Growth"].includes(question.focus)));
});

import test from "node:test";
import assert from "node:assert/strict";
import { normalizeGenerationRequest } from "../src/questionGenerator.js";

test("question generation requests enforce supported modes and bounds", () => {
  assert.deepEqual(normalizeGenerationRequest({ kind: "coding", count: 500, difficulty: "HARD", language: "C++", offset: 5000 }), {
    kind: "coding", count: 50, difficulty: "hard", category: "general", role: "Software Engineer", language: "C++", offset: 999, excludedQuestions: [], previousQuestion: "", previousAnswer: "",
  });
  assert.throws(() => normalizeGenerationRequest({ kind: "unknown" }), /requires aptitude, coding, or interview/);
});

test("interview generation safely bounds adaptive follow-up context", () => {
  const request = normalizeGenerationRequest({
    kind: "interview",
    count: 1,
    previousQuestion: ` Why? ${"q".repeat(2000)}`,
    previousAnswer: ` Because ${"a".repeat(5000)}`,
  });
  assert.equal(request.previousQuestion.length, 1500);
  assert.equal(request.previousAnswer.length, 4000);
});

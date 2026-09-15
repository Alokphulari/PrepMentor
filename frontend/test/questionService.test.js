import assert from "node:assert/strict";
import test from "node:test";
import { normalizeQuestionBatchResponse } from "../src/services/questionService.js";

test("question service accepts complete aptitude batches and rejects truncation", () => {
  const questions = Array.from({ length: 30 }, (_, index) => ({
    id: `aptitude-${index}`,
    question: `Question ${index}`,
    options: ["A", "B", "C", "D"],
    answer: "A",
    topic: "Arithmetic",
  }));
  assert.equal(normalizeQuestionBatchResponse({ kind: "aptitude", count: 30 }, { questions, source: "llm" }).questions.length, 30);
  assert.equal(normalizeQuestionBatchResponse({ kind: "aptitude", count: 30 }, { questions: questions.slice(0, 29) }), null);
});

test("question service validates coding and interview batches before rendering", () => {
  const coding = [{ id: "code-1", title: "Two Sum", question: "Find a pair.", difficulty: "Easy", topic: "Hashing" }];
  assert.equal(normalizeQuestionBatchResponse({ kind: "coding", count: 1 }, { questions: coding }).questions[0].id, "code-1");
  assert.equal(normalizeQuestionBatchResponse({ kind: "coding", count: 2 }, { questions: coding }), null);

  const interview = [{ question: "Explain closures.", focus: "JavaScript" }];
  assert.deepEqual(normalizeQuestionBatchResponse({ kind: "interview", count: 1 }, { questions: interview }).questions, interview);
  assert.equal(normalizeQuestionBatchResponse({ kind: "interview", count: 1 }, { questions: [{ focus: "Missing prompt" }] }), null);
});

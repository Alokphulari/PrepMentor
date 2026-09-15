import assert from "node:assert/strict";
import test from "node:test";
import { normalizePlacementCodingSession } from "../src/utils/placementCodingSession.js";

const questions = Array.from({ length: 30 }, (_, index) => ({
  id: `coding-${index}`,
  question: `Coding question ${index}`,
  options: ["A", "B", "C", "D"],
  answer: "A",
  topic: "Algorithms",
}));

test("Placement coding restoration retains only answers valid for the active batch", () => {
  const restored = normalizePlacementCodingSession({
    level: "hard",
    questions,
    selectedAnswers: { "coding-0": "B", "coding-1": "invalid", missing: "A" },
    generationSource: "llm",
  }, "hard");

  assert.equal(restored.questions.length, 30);
  assert.deepEqual(restored.selectedAnswers, { "coding-0": "B" });
  assert.equal(restored.generationSource, "llm");
});

test("Placement coding restoration rejects stale levels and incomplete batches", () => {
  assert.equal(normalizePlacementCodingSession({ level: "easy", questions }, "medium"), null);
  assert.equal(normalizePlacementCodingSession({ level: "medium", questions: questions.slice(0, 5) }, "medium"), null);
});

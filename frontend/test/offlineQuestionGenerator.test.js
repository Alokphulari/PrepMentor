import assert from "node:assert/strict";
import test from "node:test";

import { generateOfflineQuestions, generatePlacementAptitudeQuestions } from "../src/utils/offlineQuestionGenerator.js";

test("offline generator creates complete valid batches", () => {
  for (const category of ["quantitative", "logical", "verbal", "programming", "focus"]) {
    const questions = generateOfflineQuestions({ category, count: 30, seed: `valid-${category}` });
    assert.equal(questions.length, 30);
    assert.equal(new Set(questions.map((item) => item.id)).size, 30);
    assert.ok(questions.every((item) => item.options.length === 4 && item.options.includes(item.answer)));
    assert.ok(questions.every((item) => typeof item.answer === "string"));
  }
});

test("clicked options use the same type as answers for game scoring", () => {
  const questions = generateOfflineQuestions({ category: "quantitative", count: 10, seed: "game-score" });
  assert.ok(questions.every((question) => question.options.find((option) => option === question.answer)));
});

test("Placement aptitude mixes quantitative, logical, and verbal questions", () => {
  const questions = generatePlacementAptitudeQuestions({ count: 30, seed: "placement-mix" });
  assert.equal(questions.length, 30);
  assert.deepEqual(new Set(questions.map((item) => item.topic)).size >= 3, true);
  assert.ok(questions.some((item) => ["Percentages", "Averages", "Speed and Distance", "Ratios", "Profit and Loss", "Algebra"].includes(item.topic)));
  assert.ok(questions.some((item) => ["Number Series", "Pattern Recognition", "Directions"].includes(item.topic)));
  assert.ok(questions.some((item) => ["Synonyms", "Antonyms"].includes(item.topic)));
});

test("a new session creates different question content, not only a new order", () => {
  for (const category of ["quantitative", "logical", "verbal", "programming", "focus"]) {
    const first = generateOfflineQuestions({ category, count: 10, seed: `first-${category}` });
    const second = generateOfflineQuestions({ category, count: 10, seed: `second-${category}` });
    assert.notDeepEqual(new Set(first.map((item) => item.question)), new Set(second.map((item) => item.question)));
  }
});

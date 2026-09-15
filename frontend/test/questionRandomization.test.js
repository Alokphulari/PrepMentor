import assert from "node:assert/strict";
import test from "node:test";
import { randomizeQuestions, shuffleItems } from "../src/utils/questionRandomization.js";

test("question randomization changes order without mutating source data", () => {
  const source = [
    { id: "a", options: ["1", "2", "3", "4"], answer: "2" },
    { id: "b", options: ["5", "6", "7", "8"], answer: "7" },
  ];
  const randomized = randomizeQuestions(source, () => 0);
  assert.deepEqual(randomized.map((item) => item.id), ["b", "a"]);
  assert.deepEqual(randomized[1].options, ["2", "3", "4", "1"]);
  assert.deepEqual(source[0].options, ["1", "2", "3", "4"]);
  assert.ok(randomized.every((item) => item.options.includes(item.answer)));
});

test("shuffle safely handles invalid random samples", () => {
  assert.deepEqual(shuffleItems([1, 2, 3], () => Number.NaN), [2, 3, 1]);
  assert.deepEqual(shuffleItems(null), []);
});

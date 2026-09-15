import test from "node:test";
import assert from "node:assert/strict";
import { getCodingCatalogBatch, needsCodingDifficultyBatch, normalizeCodingWorkspaceState } from "../src/utils/codingWorkspaceState.js";

const fallback = [{ id: "starter", title: "Starter", description: "Solve it", topic: "Arrays", difficulty: "Easy", constraints: [], example: "[]", hints: [], templates: {}, tokens: {} }];

test("coding workspace state restores valid generated batches and rejects malformed state", () => {
  const generated = [{ id: "coding-31", title: "Two Sum", description: "Find a pair", topic: "Hashing", difficulty: "Easy", constraints: ["small"], example: "[2,7]", hints: ["map"] }];
  const restored = normalizeCodingWorkspaceState({ problems: generated, problemId: "coding-31", language: "C++", filter: "Easy", catalogOffset: 30, catalogSource: "llm", hint: 2 }, fallback);
  assert.equal(restored.problems[0].id, "coding-31");
  assert.equal(restored.language, "C++");
  assert.equal(restored.catalogOffset, 30);
  const invalid = normalizeCodingWorkspaceState({ problems: [{ unsafe: true }], language: "Brain" }, fallback);
  assert.equal(invalid.problems, fallback);
  assert.equal(invalid.language, "JavaScript");
});

test("coding catalog batches cover the final ten problems and wrap to the start", () => {
  assert.deepEqual(getCodingCatalogBatch(960), { offset: 990, count: 10 });
  assert.deepEqual(getCodingCatalogBatch(990), { offset: 0, count: 30 });
  assert.deepEqual(getCodingCatalogBatch(0, 990), { offset: 990, count: 10 });
});

test("coding difficulty changes request a batch only when the level is missing", () => {
  const problems = [{ difficulty: "Medium" }, { difficulty: "Medium" }];
  assert.equal(needsCodingDifficultyBatch(problems, "Easy"), true);
  assert.equal(needsCodingDifficultyBatch(problems, "Medium"), false);
  assert.equal(needsCodingDifficultyBatch(problems, "All"), false);
});

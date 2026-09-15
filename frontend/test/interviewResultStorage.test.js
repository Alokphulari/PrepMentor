import assert from "node:assert/strict";
import test from "node:test";
import { getInterviewResultStorageKey, normalizeInterviewResult } from "../src/utils/interviewResultStorage.js";

test("interview result keys are isolated by account", () => {
  const first = getInterviewResultStorageKey("result-1", { id: "user-a" });
  const second = getInterviewResultStorageKey("result-1", { id: "user-b" });
  assert.notEqual(first, second);
  assert.match(first, /result-1/);
});

test("interview results require matching ids and bounded scores", () => {
  const normalized = normalizeInterviewResult({ id: "result-1", score: 140, metrics: null }, "result-1");
  assert.equal(normalized.score, 100);
  assert.deepEqual(normalized.metrics, {});
  assert.equal(normalizeInterviewResult({ id: "other", score: 80 }, "result-1"), null);
  assert.equal(normalizeInterviewResult({ id: "result-1", score: "invalid" }), null);
});

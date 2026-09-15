import assert from "node:assert/strict";
import test from "node:test";

import { getRecentInterviewQuestions, rememberInterviewQuestions } from "../src/services/interviewQuestionHistory.js";

test("interview question memory deduplicates recent prompts", () => {
  const memory = new Map();
  globalThis.localStorage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: (key) => memory.delete(key) };
  rememberInterviewQuestions([{ question: "Question one" }, { question: "Question two" }]);
  rememberInterviewQuestions([{ question: "Question one" }]);
  assert.deepEqual(getRecentInterviewQuestions(), ["Question one", "Question two"]);
  delete globalThis.localStorage;
});

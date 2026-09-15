import assert from "node:assert/strict";
import test from "node:test";

import { getDailyActivity, getLocalDateKey, markDailyQuestionActivity } from "../src/services/dailyActivity.js";

test("daily question activity checks a local day only once", () => {
  const memory = new Map();
  globalThis.localStorage = {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value),
    removeItem: (key) => memory.delete(key),
  };
  const date = new Date(2026, 8, 5, 10, 30);
  markDailyQuestionActivity(date);
  markDailyQuestionActivity(date);
  assert.deepEqual(getDailyActivity(), ["2026-09-05"]);
  delete globalThis.localStorage;
});

test("local date keys do not shift activity across UTC boundaries", () => {
  assert.equal(getLocalDateKey(new Date(2026, 0, 2, 0, 5)), "2026-01-02");
  assert.equal(getLocalDateKey("invalid"), "");
});

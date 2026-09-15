import assert from "node:assert/strict";
import test from "node:test";

import { getAdaptiveInterviewQuestionCount, getRemainingInterviewSeconds, normalizeInterviewDuration } from "../src/utils/interviewTiming.js";

test("interview duration supports ten, twenty, and thirty minute sessions", () => {
  assert.equal(normalizeInterviewDuration(10), 10);
  assert.equal(normalizeInterviewDuration("30"), 30);
  assert.equal(normalizeInterviewDuration(99), 20);
});

test("adaptive question capacity stays within duration bands", () => {
  assert.equal(getAdaptiveInterviewQuestionCount(10, () => 0), 3);
  assert.equal(getAdaptiveInterviewQuestionCount(10, () => 0.999), 5);
  assert.equal(getAdaptiveInterviewQuestionCount(20, () => 0.999), 7);
  assert.equal(getAdaptiveInterviewQuestionCount(30, () => 0), 7);
});

test("remaining interview time survives refresh and stops at zero", () => {
  assert.equal(getRemainingInterviewSeconds("2026-09-06T10:00:00.000Z", 10, Date.parse("2026-09-06T10:03:00.000Z")), 420);
  assert.equal(getRemainingInterviewSeconds("2026-09-06T10:00:00.000Z", 10, Date.parse("2026-09-06T10:20:00.000Z")), 0);
});

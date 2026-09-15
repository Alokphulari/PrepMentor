import test from "node:test";
import assert from "node:assert/strict";
import { calculateActivityStreak, getAchievementProgress } from "../src/utils/achievements.js";

test("achievement progress uses history and the complete Placement state", () => {
  const history = Array.from({ length: 13 }, (_, index) => ({ type: index < 3 ? "Interview" : "Coding Practice", score: 90, createdAt: new Date(2026, 0, index + 1).toISOString() }));
  const placementState = { aptitude: { easy: "passed", medium: "passed", hard: "passed" }, coding: { easy: "passed", medium: "passed", hard: "passed" }, interview: { status: "passed" } };
  const progress = getAchievementProgress(history, placementState, new Date(2026, 0, 13, 12));
  assert.equal(progress.earnedCount, 8);
  assert.equal(progress.placementPassed, 7);
  assert.equal(calculateActivityStreak([{ createdAt: "invalid" }]), 0);
});

test("activity streak expires after the one-day grace window", () => {
  const history = [1, 2, 3].map((day) => ({ createdAt: new Date(2026, 7, day, 12).toISOString() }));
  assert.equal(calculateActivityStreak(history, new Date(2026, 7, 3, 18)), 3);
  assert.equal(calculateActivityStreak(history, new Date(2026, 7, 4, 18)), 3);
  assert.equal(calculateActivityStreak(history, new Date(2026, 7, 5, 18)), 0);
});

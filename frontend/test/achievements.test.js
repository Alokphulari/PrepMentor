import test from "node:test";
import assert from "node:assert/strict";
import { calculateActivityStreak, getAchievementProgress } from "../src/utils/achievements.js";

test("achievement progress uses history and the complete Placement state", () => {
  const history = Array.from({ length: 13 }, (_, index) => ({ type: index < 3 ? "Interview" : "Coding Practice", score: 90, createdAt: new Date(2026, 0, index + 1).toISOString() }));
  const placementState = { aptitude: { easy: "passed", medium: "passed", hard: "passed" }, coding: { easy: "passed", medium: "passed", hard: "passed" }, interview: { status: "passed" } };
  const progress = getAchievementProgress(history, placementState, new Date(2026, 0, 13, 12));
  assert.equal(progress.achievements.length, 20);
  assert.ok(progress.achievements.slice(0, 8).every((badge) => badge.earned));
  assert.equal(progress.earnedCount, 12);
  assert.equal(progress.placementPassed, 7);
  assert.equal(calculateActivityStreak([{ createdAt: "invalid" }]), 0);
});

test("new milestones accept current and legacy module names with accurate threshold progress", () => {
  const history = [
    ...Array.from({ length: 24 }, (_, i) => ({ type: i % 2 ? "Coding" : "Coding Practice", score: 85 })),
    ...Array.from({ length: 9 }, () => ({ type: "Aptitude Practice", score: 70 })),
    ...Array.from({ length: 9 }, () => ({ type: "Interview", score: 75 })),
  ];
  const byId = (items, id) => getAchievementProgress(items, {}).achievements.find((badge) => badge.id === id);
  assert.equal(byId(history, "code-craftsman").earned, false);
  assert.equal(byId(history, "code-craftsman").percent, 96);
  assert.equal(byId([...history, { type: "Coding" }], "code-craftsman").earned, true);
  assert.equal(byId(history, "aptitude-ace").earned, false);
  assert.equal(byId([...history, { type: "Aptitude" }], "aptitude-ace").earned, true);
  assert.equal(byId(history, "interview-veteran").earned, false);
  assert.equal(byId([...history, { type: "Interview" }], "interview-veteran").earned, true);
  assert.equal(byId(history, "all-rounder").earned, true);
  assert.equal(byId(history, "consistent-excellence").earned, true);
});

test("missing, invalid, and out-of-range scores cannot unlock scoring milestones", () => {
  const progress = getAchievementProgress([null, { score: null }, {}, { score: "" }, { score: 101 }, { score: -1 }, { score: "not a score" }, { score: 100 }], {});
  assert.equal(progress.achievements.find((badge) => badge.id === "perfect-score").earned, true);
  assert.equal(progress.achievements.find((badge) => badge.id === "high-performer").earned, false);
  assert.equal(progress.achievements.find((badge) => badge.id === "consistent-excellence").earned, false);
  assert.equal(getAchievementProgress([], {}).earnedCount, 0);
  assert.ok(progress.achievements.every((badge) => Number.isFinite(badge.percent) && badge.percent >= 0 && badge.percent <= 100));
});

test("Placement graduates require all actual levels and ignore unrelated passed fields", () => {
  const placement = { aptitude: { easy: "passed", medium: "passed", hard: "failed", extra: "passed" }, coding: { easy: "passed", medium: "available", hard: "locked" } };
  let progress = getAchievementProgress([], placement);
  assert.equal(progress.placementPassed, 3);
  assert.equal(progress.achievements.find((badge) => badge.id === "aptitude-graduate").earned, false);
  placement.aptitude.hard = "passed";
  progress = getAchievementProgress([], placement);
  assert.equal(progress.achievements.find((badge) => badge.id === "aptitude-graduate").earned, true);
  assert.equal(progress.achievements.find((badge) => badge.id === "coding-graduate").earned, false);
  assert.equal(progress.achievements.find((badge) => badge.id === "placement-champion").earned, false);
});

test("activity streak expires after the one-day grace window", () => {
  const history = [1, 2, 3].map((day) => ({ createdAt: new Date(2026, 7, day, 12).toISOString() }));
  assert.equal(calculateActivityStreak(history, new Date(2026, 7, 3, 18)), 3);
  assert.equal(calculateActivityStreak(history, new Date(2026, 7, 4, 18)), 3);
  assert.equal(calculateActivityStreak(history, new Date(2026, 7, 5, 18)), 0);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_PLACEMENT_STATE, getPlacementCompletion, mergePlacementStates, normalizePlacementState, retryFailedPlacementLevel } from "../src/utils/placementProgress.js";

test("Placement normalization preserves a valid sequential journey", () => {
  const state = normalizePlacementState({
    aptitude: { easy: "passed", medium: "passed", hard: "passed" },
    coding: { easy: "passed", medium: "failed", hard: "locked" },
    interview: { status: "locked", whiteboard: "locked" },
  });
  assert.equal(state.coding.medium, "failed");
  assert.equal(state.coding.hard, "locked");
  assert.equal(state.interview.status, "locked");
});

test("Placement normalization prevents skipped and malformed stages", () => {
  const state = normalizePlacementState({
    aptitude: { easy: "unexpected", medium: "passed", hard: "passed" },
    coding: { easy: "passed", medium: "passed", hard: "passed" },
    interview: { status: "passed", whiteboard: "passed" },
  });
  assert.deepEqual(state, DEFAULT_PLACEMENT_STATE);
});

test("Placement synchronization keeps the furthest valid sequential progress", () => {
  const local = normalizePlacementState({
    aptitude: { easy: "passed", medium: "passed", hard: "available" },
  });
  const remote = normalizePlacementState({
    aptitude: { easy: "passed", medium: "available" },
  });
  const merged = mergePlacementStates(local, remote);
  assert.equal(merged.aptitude.medium, "passed");
  assert.equal(merged.aptitude.hard, "available");
  assert.equal(merged.coding.easy, "locked");
});

test("Placement synchronization retains failure and whiteboard completion", () => {
  const failed = mergePlacementStates(
    { aptitude: { easy: "failed" } },
    DEFAULT_PLACEMENT_STATE,
  );
  assert.equal(failed.aptitude.easy, "failed");

  const completed = {
    aptitude: { easy: "passed", medium: "passed", hard: "passed" },
    coding: { easy: "passed", medium: "passed", hard: "passed" },
    interview: { status: "passed", whiteboard: "passed" },
  };
  assert.equal(mergePlacementStates(completed, { ...completed, interview: { status: "passed", whiteboard: "available" } }).interview.whiteboard, "passed");
});

test("Placement completion counts all seven required milestones", () => {
  assert.deepEqual(getPlacementCompletion({
    aptitude: { easy: "passed", medium: "passed", hard: "available" },
  }), { completed: 2, total: 7, percentage: 29 });
});

test("Placement retries reopen only the currently failed level", () => {
  const failed = normalizePlacementState({ aptitude: { easy: "passed", medium: "failed" } });
  assert.equal(retryFailedPlacementLevel(failed, "aptitude", "medium").aptitude.medium, "available");
  assert.equal(retryFailedPlacementLevel(failed, "aptitude", "easy").aptitude.easy, "passed");
  assert.deepEqual(retryFailedPlacementLevel(failed, "unknown", "medium"), failed);
});

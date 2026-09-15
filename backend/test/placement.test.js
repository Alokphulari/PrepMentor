import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_PLACEMENT_STATE,
  validatePlacementState,
  validatePlacementTransition,
} from "../src/placement.js";

function copy(value) {
  return structuredClone(value);
}

test("Placement state follows the complete sequential journey", () => {
  let state = copy(DEFAULT_PLACEMENT_STATE);
  const transitions = [
    (next) => { next.aptitude.easy = "passed"; next.aptitude.medium = "available"; },
    (next) => { next.aptitude.medium = "passed"; next.aptitude.hard = "available"; },
    (next) => { next.aptitude.hard = "passed"; next.coding.easy = "available"; },
    (next) => { next.coding.easy = "passed"; next.coding.medium = "available"; },
    (next) => { next.coding.medium = "passed"; next.coding.hard = "available"; },
    (next) => { next.coding.hard = "passed"; next.interview.status = "available"; },
    (next) => { next.interview.status = "passed"; },
  ];

  for (const applyTransition of transitions) {
    const next = copy(state);
    applyTransition(next);
    state = validatePlacementTransition(state, next);
  }

  assert.equal(state.aptitude.hard, "passed");
  assert.equal(state.coding.hard, "passed");
  assert.equal(state.interview.status, "passed");
});

test("failed available levels can be retried and passed", () => {
  const available = copy(DEFAULT_PLACEMENT_STATE);
  const failed = copy(available);
  failed.aptitude.easy = "failed";
  assert.equal(validatePlacementTransition(available, failed).aptitude.easy, "failed");

  const retried = copy(failed);
  retried.aptitude.easy = "available";
  assert.equal(validatePlacementTransition(failed, retried).aptitude.easy, "available");

  const passed = copy(retried);
  passed.aptitude.easy = "passed";
  passed.aptitude.medium = "available";
  assert.equal(validatePlacementTransition(retried, passed).aptitude.medium, "available");
});

test("locked levels cannot be skipped and passed levels cannot regress", () => {
  const skipped = copy(DEFAULT_PLACEMENT_STATE);
  skipped.aptitude.easy = "passed";
  skipped.aptitude.medium = "passed";
  skipped.aptitude.hard = "available";
  assert.throws(
    () => validatePlacementTransition(DEFAULT_PLACEMENT_STATE, skipped),
    /must be unlocked before it can be attempted/i
  );

  const completedEasy = copy(DEFAULT_PLACEMENT_STATE);
  completedEasy.aptitude.easy = "passed";
  completedEasy.aptitude.medium = "available";
  const regressed = copy(DEFAULT_PLACEMENT_STATE);
  assert.throws(
    () => validatePlacementTransition(completedEasy, regressed),
    /cannot regress after it is passed/i
  );
});

test("unsupported statuses and invalid snapshots are rejected", () => {
  assert.throws(
    () => validatePlacementState({ aptitude: { easy: "complete" } }),
    /unsupported status/i
  );
  assert.throws(
    () => validatePlacementState({ aptitude: { medium: "available" } }),
    /cannot unlock before the previous level is passed/i
  );
});

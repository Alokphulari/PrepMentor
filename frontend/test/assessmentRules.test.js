import assert from "node:assert/strict";
import { test } from "node:test";
import { getAssessmentPercentage, getMinimumCorrectAnswers, hasPassedAssessment, PASS_PERCENTAGE } from "../src/utils/assessmentRules.js";

test("five-question assessments require four correct answers", () => {
  assert.equal(PASS_PERCENTAGE, 70);
  assert.equal(getMinimumCorrectAnswers(5), 4);
  assert.equal(hasPassedAssessment(3, 5), false);
  assert.equal(hasPassedAssessment(4, 5), true);
  assert.equal(getAssessmentPercentage(4, 5), 80);
});

test("assessment scoring handles invalid and out-of-range values safely", () => {
  assert.equal(getAssessmentPercentage(2, 0), 0);
  assert.equal(getAssessmentPercentage("invalid", 5), 0);
  assert.equal(getAssessmentPercentage(8, 5), 100);
  assert.equal(getAssessmentPercentage(-2, 5), 0);
  assert.equal(getMinimumCorrectAnswers("invalid"), 0);
});

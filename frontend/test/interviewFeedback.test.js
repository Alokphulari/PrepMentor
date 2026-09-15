import assert from "node:assert/strict";
import { test } from "node:test";
import { getInterviewFeedback, getInterviewHeadline } from "../src/utils/interviewFeedback.js";

test("interview feedback derives strengths and weakest priorities from metrics", () => {
  const feedback = getInterviewFeedback({ communication: 86, technical: 62, problemSolving: 74, confidence: 35 });
  assert.deepEqual(feedback.strengths, ["Communication is a current strength at 86%.", "Problem solving is a current strength at 74%."]);
  assert.match(feedback.recommendations[0], /^Confidence:/);
  assert.match(feedback.recommendations[1], /^Technical knowledge:/);
});

test("interview feedback safely handles malformed metrics and score headlines", () => {
  const feedback = getInterviewFeedback(null);
  assert.equal(feedback.metrics.every((metric) => metric.value === 0), true);
  assert.equal(feedback.strengths.length, 1);
  assert.equal(getInterviewHeadline(90), "Interview-ready performance.");
  assert.equal(getInterviewHeadline("invalid"), "A useful baseline for your next practice session.");
});

import assert from "node:assert/strict";
import test from "node:test";

import { normalizeAiEvaluation } from "../src/interviewEvaluator.js";

test("AI interview evaluation normalizes semantic metrics and feedback", () => {
  const result = normalizeAiEvaluation({
    score: 82.4,
    metrics: { communication: 80, technical: 84, problemSolving: 83, confidence: 78 },
    strengths: ["Specific example"],
    weaknesses: ["Could quantify impact"],
    recommendations: ["Use the STAR structure"],
  }, { role: "Frontend Developer", type: "Technical" });
  assert.equal(result.score, 82);
  assert.equal(result.metrics.technical, 84);
  assert.equal(result.evaluationMode, "AI semantic interview evaluation");
});

test("AI interview evaluation rejects generic incomplete feedback", () => {
  assert.throws(() => normalizeAiEvaluation({ score: 80, metrics: {} }, {}), /Incomplete/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { performanceEvidence, localPerformanceAnalysis } from "../src/utils/performanceAnalysis.js";
test("performance separates local estimates, rejects invalid scores, and deduplicates history", () => {
  const evidence = performanceEvidence([
    { id: "a", type: "Aptitude", score: 80 },
    { id: "a", type: "Aptitude", score: 80 },
    { id: "b", type: "Interview", score: 100, evaluationMode: "Local deterministic interview rubric" },
    { id: "c", type: "Coding", score: null },
    { id: "d", type: "Coding", score: 90, evidenceType: "self-reported" },
  ]);
  assert.equal(evidence.count, 2); assert.equal(evidence.measuredCount, 1); assert.equal(evidence.localEstimateCount, 1);
  assert.equal(evidence.groups[2].average, null);
  assert.equal(evidence.groups[0].average, 80);
});
test("empty performance history produces useful guidance without invented scores", () => {
  const result = localPerformanceAnalysis(performanceEvidence());
  assert.equal(result.evidence.count, 0);
  assert.equal(result.evidence.movement, null);
  assert.equal(result.recommendations.length, 3);
});

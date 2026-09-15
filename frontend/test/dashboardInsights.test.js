import assert from "node:assert/strict";
import test from "node:test";

import { getDashboardInsights } from "../src/utils/dashboardInsights.js";

test("dashboard insights calculate module averages and the weakest area", () => {
  const insights = getDashboardInsights([
    { type: "Aptitude Practice", score: 80 },
    { type: "Placement Aptitude", score: 60 },
    { type: "Coding Practice", score: 90 },
    { type: "Interview", score: 75 },
  ]);
  assert.deepEqual(insights.performance.map((item) => item.average), [70, 90, 75]);
  assert.equal(insights.weakest.id, "aptitude");
  assert.match(insights.recommendation, /Aptitude/);
});

test("dashboard insights provide honest empty states", () => {
  const insights = getDashboardInsights(null);
  assert.equal(insights.weakest, null);
  assert.ok(insights.performance.every((item) => item.average === null && item.attempts === 0));
});

import assert from "node:assert/strict";
import test from "node:test";
import { buildCareerRoadmap } from "../src/utils/careerRoadmap.js";

test("career roadmaps prioritize the weakest measured topic", () => {
  const roadmap = buildCareerRoadmap({ score: 62, module: "Aptitude", role: "Frontend Developer", topicPerformance: [{ topic: "Ratios", percentage: 55 }, { topic: "Percentages", percentage: 35 }] });
  assert.equal(roadmap.steps.length, 4);
  assert.match(roadmap.steps[0].title, /Percentages/);
  assert.match(roadmap.title, /Frontend Developer/);
});

test("career roadmaps safely normalize malformed scores", () => {
  assert.equal(buildCareerRoadmap({ score: 900 }).band, "advanced");
  assert.equal(buildCareerRoadmap({ score: "invalid" }).band, "foundation");
});

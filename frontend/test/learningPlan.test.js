import assert from "node:assert/strict";
import { test } from "node:test";
import { countLearningWords, getLearningReferences, getWeakLearningTopics, normalizeCompletedTopics, normalizeLearningReflections, normalizeVisitedReferences } from "../src/utils/learningPlan.js";

test("learning plans keep only valid weak topics and prioritize lowest scores", () => {
  const topics = getWeakLearningTopics([
    { topic: "JavaScript", percentage: 65.4 },
    { topic: "Communication", percentage: 82 },
    { topic: "JavaScript", percentage: 40 },
    { topic: "Data Structures", percentage: -5 },
    { topic: "Broken", percentage: "none" },
  ]);
  assert.deepEqual(topics.map(({ topic, percentage }) => [topic, percentage]), [["Data Structures", 0], ["JavaScript", 40]]);
});

test("completed learning topics are deduplicated and limited to the current plan", () => {
  const weakTopics = [{ topic: "JavaScript" }, { topic: "Data Structures" }];
  assert.deepEqual(normalizeCompletedTopics(["JavaScript", "Old topic", "JavaScript"], weakTopics), ["JavaScript"]);
});

test("learning references are safe HTTPS resources and visits are scoped to the plan", () => {
  const weakTopics = [{ topic: "JavaScript", percentage: 40 }];
  assert.deepEqual(normalizeVisitedReferences(["JavaScript", "Old topic", "JavaScript"], weakTopics), ["JavaScript"]);
  assert.ok(getLearningReferences("JavaScript").every((reference) => reference.url.startsWith("https://")));
  assert.match(getLearningReferences("Percentages")[0].url, /Percentages/);
});

test("learning assignments normalize saved responses and count real words", () => {
  const topics = [{ topic: "JavaScript" }];
  assert.deepEqual(normalizeLearningReflections({ JavaScript: "  closures keep state  ", Legacy: "discard" }, topics), { JavaScript: "  closures keep state  " });
  assert.equal(countLearningWords("  closures   keep state\nbetween calls "), 5);
  assert.equal(countLearningWords(null), 0);
});

import test from "node:test";
import assert from "node:assert/strict";
import { dsaProblems, dsaTopics } from "../src/data/dsaRoadmap.js";
import { filterDsaProblems, normalizeDsaProgress } from "../src/utils/dsaProgress.js";

test("DSA roadmap has unique, complete problems ordered within each topic", () => {
  assert.equal(new Set(dsaProblems.map((problem) => problem.id)).size, dsaProblems.length);
  const order = { Easy: 0, Medium: 1, Hard: 2 };
  for (const topic of dsaTopics) {
    const problems = dsaProblems.filter((problem) => problem.topicId === topic.id);
    assert.ok(problems.length >= 3);
    assert.deepEqual(problems.map((problem) => order[problem.difficulty]), problems.map((problem) => order[problem.difficulty]).sort());
  }
  for (const problem of dsaProblems) {
    assert.ok(dsaTopics.some((topic) => topic.id === problem.topicId));
    for (const field of ["id", "title", "description", "input", "output", "constraints", "hint", "pattern", "complexity"]) {
      assert.ok(typeof problem[field] === "string" && problem[field].trim(), `${problem.id}: ${field}`);
    }
  }
  assert.deepEqual(dsaProblems.map((problem) => problem.executionId), dsaProblems.map((problem) => problem.id));
});

test("DSA saved progress restores supported drafts and rejects malformed state", () => {
  const saved = normalizeDsaProgress({ topicId: "graphs", language: "Python", entries: {
    "array-sum": { status: "completed", bookmarked: true, drafts: { Python: "print(1)", JavaScript: "return 1", Ruby: "ignored" }, notes: "Use a running total." },
    "two-sum": { status: "verified", bookmarked: "yes", notes: 42, drafts: { Python: 123 } },
    "unknown-problem": { status: "completed" },
  } });
  assert.equal(saved.topicId, "graphs");
  assert.equal(saved.language, "Python");
  assert.equal(saved.entries["array-sum"].status, "completed");
  assert.deepEqual(saved.entries["array-sum"].drafts, { JavaScript: "return 1", Python: "print(1)" });
  assert.deepEqual(saved.entries["two-sum"], { status: "todo", bookmarked: false, notes: "", drafts: {} });
  assert.equal(saved.entries["unknown-problem"], undefined);
  assert.deepEqual(normalizeDsaProgress(JSON.parse(JSON.stringify(saved))), saved);
  assert.equal(normalizeDsaProgress(null).topicId, "arrays");
});

test("DSA filters combine topic, difficulty, status, bookmarks, and global search", () => {
  const entries = { "array-sum": { status: "completed", bookmarked: true } };
  assert.deepEqual(filterDsaProblems({ topicId: "arrays", difficulty: "Easy", status: "completed", entries }).map((problem) => problem.id), ["array-sum"]);
  assert.equal(filterDsaProblems({ topicId: "arrays", status: "todo", entries }).length, 2);
  assert.equal(filterDsaProblems({ status: "bookmarked", entries }).length, 1);
  assert.equal(filterDsaProblems({ query: "  TOPOLOGICAL " })[0].id, "course-schedule");
  assert.equal(filterDsaProblems({ query: "no matching problem" }).length, 0);
});

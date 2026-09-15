import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeHistoryEntries, normalizeHistoryEntries } from "../src/utils/historyEntries.js";

test("history normalization validates and bounds persisted entries", () => {
  const entries = normalizeHistoryEntries([
    { id: " attempt-1 ", title: " Aptitude Easy ", type: "Aptitude", score: "106.6", duration: "", createdAt: "2026-01-02T10:00:00Z" },
    { title: "Broken date", type: "Coding", score: 80, createdAt: "not-a-date" },
    { title: "Broken score", type: "Coding", score: "nope", createdAt: "2026-01-02" },
    null,
  ]);

  assert.deepEqual(entries, [{
    id: "attempt-1",
    title: "Aptitude Easy",
    type: "Aptitude",
    score: 100,
    duration: "Self-paced",
    createdAt: "2026-01-02T10:00:00.000Z",
  }]);
});

test("history normalization supplies stable legacy ids and rejects non-arrays", () => {
  assert.deepEqual(normalizeHistoryEntries(null), []);
  const [entry] = normalizeHistoryEntries([{ title: "Mock Interview", type: "Interview", score: -3, createdAt: "2026-02-03" }]);
  assert.equal(entry.id, `history-${Date.parse("2026-02-03")}-0`);
  assert.equal(entry.score, 0);
});

test("history merging preserves local attempts and removes server duplicates", () => {
  const server = [
    { id: "shared", title: "Server copy", type: "Coding", score: 82, createdAt: "2026-02-02" },
  ];
  const local = [
    { id: "local-new", title: "Just completed", type: "Aptitude", score: 91, createdAt: "2026-02-03" },
    { id: "shared", title: "Local copy", type: "Coding", score: 70, createdAt: "2026-02-02" },
  ];

  const merged = mergeHistoryEntries(server, local);
  assert.deepEqual(merged.map((entry) => entry.id), ["local-new", "shared"]);
  assert.equal(merged.find((entry) => entry.id === "shared").title, "Server copy");
});

test("history normalization preserves safe roadmap topic performance", () => {
  const [entry] = normalizeHistoryEntries([{
    id: "roadmap-attempt",
    title: "Coding Practice",
    type: "Coding",
    score: 62,
    createdAt: "2026-02-04",
    topicPerformance: [
      { topic: " Dynamic Programming ", percentage: 41.6 },
      { topic: "", percentage: 80 },
      { topic: "Graphs", percentage: 140 },
    ],
  }]);

  assert.deepEqual(entry.topicPerformance, [
    { topic: "Dynamic Programming", percentage: 42 },
    { topic: "Graphs", percentage: 100 },
  ]);
});

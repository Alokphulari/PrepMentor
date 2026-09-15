import assert from "node:assert/strict";
import test from "node:test";
import { getDailyQuestion, getLocalDayKey, normalizeDailyChallenge } from "../src/utils/dailyChallenge.js";

const questions = [
  { id: "a", options: ["1", "2"], answer: "1" },
  { id: "b", options: ["3", "4"], answer: "4" },
];

test("daily challenge is stable for a local calendar day", () => {
  const morning = new Date(2026, 8, 5, 8);
  const evening = new Date(2026, 8, 5, 22);
  assert.equal(getLocalDayKey(morning), "2026-09-05");
  assert.equal(getDailyQuestion(questions, morning).id, getDailyQuestion(questions, evening).id);
});

test("daily challenge restores only today's valid answer", () => {
  const question = questions[0];
  assert.equal(normalizeDailyChallenge({ dayKey: "2026-09-05", questionId: "a", selectedAnswer: "1", recorded: true }, "2026-09-05", question).correct, true);
  assert.equal(normalizeDailyChallenge({ dayKey: "2026-09-04", questionId: "a", selectedAnswer: "1" }, "2026-09-05", question), null);
  assert.equal(normalizeDailyChallenge({ dayKey: "2026-09-05", questionId: "a", selectedAnswer: "invalid" }, "2026-09-05", question), null);
});

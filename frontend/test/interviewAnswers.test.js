import test from "node:test";
import assert from "node:assert/strict";
import { countAnswerWords, countCompletedInterviewAnswers, isInterviewAnswerComplete } from "../src/utils/interviewAnswers.js";

test("interview completion requires twenty real words", () => {
  const shortAnswer = "one two three";
  const completeAnswer = Array.from({ length: 20 }, (_, index) => `word${index}`).join(" ");
  assert.equal(countAnswerWords("  one\n two   three "), 3);
  assert.equal(isInterviewAnswerComplete(shortAnswer), false);
  assert.equal(isInterviewAnswerComplete(completeAnswer), true);
  assert.equal(countCompletedInterviewAnswers([{}, {}], { 0: shortAnswer, 1: completeAnswer }), 1);
});

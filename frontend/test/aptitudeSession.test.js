import assert from "node:assert/strict";
import { test } from "node:test";
import { getAptitudeSession, normalizeAptitudeProgress, normalizeGeneratedAptitudeQuestions, normalizePlacementAptitudeSession, validateAptitudeQuestionBank } from "../src/utils/aptitudeSession.js";

test("aptitude question bank contains valid five-question sessions", () => {
  assert.deepEqual(validateAptitudeQuestionBank(), []);
});

test("aptitude progress restoration bounds indexes, time, and answers", () => {
  assert.deepEqual(normalizeAptitudeProgress({ index: 99, seconds: 9999, answers: { 0: "A", 29: "B", 30: "ignored", unsafe: {} } }, 30, 1800), {
    index: 29,
    seconds: 1800,
    answers: { 0: "A", 29: "B" },
  });
  assert.equal(normalizeAptitudeProgress({ seconds: 0 }, 30, 1800).seconds, 0);
});

test("generated aptitude sessions require 30 to 50 complete questions", () => {
  const generated = Array.from({ length: 30 }, (_, index) => ({ id: `q-${index}`, question: `Question ${index}`, options: ["A", "B", "C", "D"], answer: "A", topic: "Arithmetic" }));
  assert.equal(normalizeGeneratedAptitudeQuestions(generated).length, 30);
  assert.equal(getAptitudeSession({ generatedQuestions: generated }).questions.length, 30);
  assert.deepEqual(normalizeGeneratedAptitudeQuestions(generated.slice(0, 29)), []);
  assert.deepEqual(normalizeGeneratedAptitudeQuestions(generated.map((item, index) => index ? item : { ...item, answer: "missing" })), []);
});

test("aptitude session configuration accepts valid choices and normalizes invalid state", () => {
  const verbal = getAptitudeSession({ category: "verbal", difficulty: "hard" });
  assert.equal(verbal.categoryDetails.title, "Verbal Ability");
  assert.equal(verbal.questions.length, 5);

  const fallback = getAptitudeSession({ category: "unknown", difficulty: "impossible" });
  assert.equal(fallback.category, "quantitative");
  assert.equal(fallback.difficulty, "medium");
  assert.equal(fallback.categoryDetails.title, "Quantitative Aptitude");
});

test("Placement aptitude restoration only accepts a valid session for the active level", () => {
  const questions = Array.from({ length: 30 }, (_, index) => ({
    id: `placement-${index}`,
    question: `Question ${index}`,
    options: ["A", "B", "C", "D"],
    answer: "A",
    topic: "Arithmetic",
  }));
  const restored = normalizePlacementAptitudeSession({
    level: "medium",
    questions,
    questionIndex: 12,
    selectedAnswer: "B",
    score: 7,
    generationSource: "llm",
  }, "medium");

  assert.equal(restored.questions.length, 30);
  assert.equal(restored.questionIndex, 12);
  assert.equal(restored.selectedAnswer, "B");
  assert.equal(restored.score, 7);
  assert.equal(normalizePlacementAptitudeSession({ level: "easy", questions }, "medium"), null);
  assert.equal(normalizePlacementAptitudeSession({ level: "medium", questions: questions.slice(0, 5) }, "medium"), null);
});

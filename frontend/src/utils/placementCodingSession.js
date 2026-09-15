import { normalizeGeneratedAptitudeQuestions } from "./aptitudeSession.js";

const LEVELS = ["easy", "medium", "hard"];

export const PLACEMENT_CODING_SESSION_KEY = "prepmentor_placement_coding_session";

export function normalizePlacementCodingSession(value, expectedLevel) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  if (!LEVELS.includes(expectedLevel) || source.level !== expectedLevel) return null;

  const questions = normalizeGeneratedAptitudeQuestions(source.questions);
  if (!questions.length) return null;

  const questionById = new Map(questions.map((question) => [String(question.id), question]));
  const selectedAnswers = {};
  if (source.selectedAnswers && typeof source.selectedAnswers === "object" && !Array.isArray(source.selectedAnswers)) {
    Object.entries(source.selectedAnswers).forEach(([questionId, answer]) => {
      const question = questionById.get(String(questionId));
      if (question && typeof answer === "string" && question.options.includes(answer)) {
        selectedAnswers[question.id] = answer;
      }
    });
  }

  return {
    level: expectedLevel,
    questions,
    selectedAnswers,
    generationSource: typeof source.generationSource === "string"
      ? source.generationSource.slice(0, 80)
      : "curated",
  };
}

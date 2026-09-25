import { aptitudeCategories, aptitudeQuestions } from "../data/aptitudeQuestions.js";

export const APTITUDE_DIFFICULTIES = ["easy", "medium", "hard"];
export const APTITUDE_SESSION_KEY = "prepmentor_aptitude_practice_session";
export const PLACEMENT_APTITUDE_SESSION_KEY = "prepmentor_placement_aptitude_session";

export function normalizeGeneratedAptitudeQuestions(value) {
  if (!Array.isArray(value) || value.length < 30 || value.length > 50) return [];
  const normalized = [];
  const ids = new Set();
  for (const [index, item] of value.entries()) {
    if (!item || typeof item !== "object" || typeof item.question !== "string" || !item.question.trim()) return [];
    if (!Array.isArray(item.options) || item.options.length !== 4) return [];
    const options = item.options.map((option) => String(option).trim().slice(0, 300));
    const answer = String(item.answer ?? "").trim().slice(0, 300);
    if (options.some((option) => !option) || !options.includes(answer)) return [];
    const candidateId = String(item.id ?? `generated-${index + 1}`).slice(0, 160);
    const id = ids.has(candidateId) ? `${candidateId}-${index + 1}` : candidateId;
    ids.add(id);
    normalized.push({ id, question: item.question.trim().slice(0, 1000), options, answer, topic: typeof item.topic === "string" && item.topic.trim() ? item.topic.trim().slice(0, 160) : "General Aptitude" });
  }
  return normalized;
}

export function normalizeAptitudeProgress(value, questionCount, sessionSeconds) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const total = Math.max(1, Number(questionCount) || 1);
  const duration = Math.max(1, Number(sessionSeconds) || total * 60);
  const requestedSeconds = Number(source.seconds);
  const answers = {};
  if (source.answers && typeof source.answers === "object" && !Array.isArray(source.answers)) {
    Object.entries(source.answers).forEach(([key, answer]) => {
      const index = Number(key);
      if (Number.isInteger(index) && index >= 0 && index < total && typeof answer === "string") answers[index] = answer.slice(0, 300);
    });
  }
  return {
    index: Math.max(0, Math.min(total - 1, Math.round(Number(source.index) || 0))),
    seconds: Number.isFinite(requestedSeconds) ? Math.max(0, Math.min(duration, Math.round(requestedSeconds))) : duration,
    answers,
  };
}

export function normalizePlacementAptitudeSession(value, expectedLevel) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  if (!APTITUDE_DIFFICULTIES.includes(expectedLevel) || source.level !== expectedLevel) return null;

  const remote = typeof source.serverSessionId === "string";
  const questions = normalizeGeneratedAptitudeQuestions(remote && Array.isArray(source.questions) ? source.questions.map((q) => ({ ...q, answer: q.options?.[0] })) : source.questions);
  if (!questions.length) return null;
  if (remote) questions.forEach((q) => { delete q.answer; });

  const questionIndex = Math.max(
    0,
    Math.min(questions.length - 1, Math.round(Number(source.questionIndex) || 0)),
  );
  const score = Math.max(0, Math.min(questionIndex, Math.round(Number(source.score) || 0)));
  const currentOptions = questions[questionIndex].options;
  const selectedAnswer = typeof source.selectedAnswer === "string"
    && currentOptions.includes(source.selectedAnswer)
    ? source.selectedAnswer
    : null;

  return {
    level: expectedLevel,
    ...(remote ? { serverSessionId: source.serverSessionId } : {}),
    questions,
    questionIndex,
    selectedAnswer,
    score,
    answers: Object.fromEntries(Object.entries(source.answers || {}).filter(([key, answer]) => Number.isInteger(Number(key)) && Number(key) >= 0 && Number(key) < questionIndex && questions[Number(key)]?.options.includes(answer))),
    generationSource: typeof source.generationSource === "string"
      ? source.generationSource.slice(0, 80)
      : "curated",
  };
}

export function getAptitudeSession(value) {
  const requested = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const category = aptitudeCategories.some((item) => item.id === requested.category)
    ? requested.category
    : "quantitative";
  const difficulty = APTITUDE_DIFFICULTIES.includes(requested.difficulty)
    ? requested.difficulty
    : "medium";
  const generatedQuestions = normalizeGeneratedAptitudeQuestions(requested.generatedQuestions);
  return {
    category,
    difficulty,
    categoryDetails: aptitudeCategories.find((item) => item.id === category),
    questions: generatedQuestions.length
      ? generatedQuestions
      : aptitudeQuestions[category][difficulty],
    generationSource: requested.generationSource || "curated",
    sessionId: typeof requested.sessionId === "string" ? requested.sessionId.slice(0, 160) : "",
  };
}

export function validateAptitudeQuestionBank() {
  const issues = [];
  aptitudeCategories.forEach(({ id: category }) => {
    APTITUDE_DIFFICULTIES.forEach((difficulty) => {
      const questions = aptitudeQuestions[category]?.[difficulty];
      const label = `${category}.${difficulty}`;
      if (!Array.isArray(questions) || questions.length !== 5) {
        issues.push(`${label} must contain exactly five questions.`);
        return;
      }
      const ids = new Set();
      questions.forEach((question, index) => {
        if (!question || typeof question !== "object") {
          issues.push(`${label}[${index}] must be an object.`);
          return;
        }
        if (ids.has(question.id)) issues.push(`${label} contains duplicate id ${question.id}.`);
        ids.add(question.id);
        if (typeof question.question !== "string" || !question.question.trim()) issues.push(`${label}[${index}] needs question text.`);
        if (!Array.isArray(question.options) || question.options.length !== 4) issues.push(`${label}[${index}] must have four options.`);
        if (!question.options?.includes(question.answer)) issues.push(`${label}[${index}] answer must match an option.`);
        if (typeof question.topic !== "string" || !question.topic.trim()) issues.push(`${label}[${index}] needs a topic.`);
      });
    });
  });
  return issues;
}

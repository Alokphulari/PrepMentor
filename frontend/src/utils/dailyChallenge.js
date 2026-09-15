export const DAILY_CHALLENGE_KEY = "prepmentor_daily_challenge";

export function getLocalDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDailyQuestion(questions, date = new Date()) {
  if (!Array.isArray(questions) || !questions.length) return null;
  const dayNumber = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  return questions[Math.abs(dayNumber) % questions.length];
}

export function normalizeDailyChallenge(value, dayKey, question) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.dayKey !== dayKey) return null;
  if (!question || value.questionId !== question.id) return null;
  const selectedAnswer = typeof value.selectedAnswer === "string" && question.options.includes(value.selectedAnswer)
    ? value.selectedAnswer
    : null;
  if (!selectedAnswer) return null;
  return {
    dayKey,
    questionId: question.id,
    selectedAnswer,
    correct: selectedAnswer === question.answer,
    recorded: Boolean(value.recorded),
  };
}

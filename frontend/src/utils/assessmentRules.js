export const PASS_PERCENTAGE = 70;

export function getAssessmentPercentage(correctAnswers, totalQuestions) {
  const correct = Number(correctAnswers);
  const total = Number(totalQuestions);
  if (!Number.isFinite(correct) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((correct / total) * 100)));
}

export function hasPassedAssessment(correctAnswers, totalQuestions) {
  return getAssessmentPercentage(correctAnswers, totalQuestions) >= PASS_PERCENTAGE;
}

export function getMinimumCorrectAnswers(totalQuestions) {
  const total = Number(totalQuestions);
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.ceil((Math.floor(total) * PASS_PERCENTAGE) / 100);
}

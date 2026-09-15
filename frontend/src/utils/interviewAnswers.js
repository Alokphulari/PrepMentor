export const MIN_INTERVIEW_WORDS = 20;

export function countAnswerWords(value) {
  return typeof value === "string" ? value.trim().split(/\s+/).filter(Boolean).length : 0;
}

export function isInterviewAnswerComplete(value) {
  return countAnswerWords(value) >= MIN_INTERVIEW_WORDS;
}

export function countCompletedInterviewAnswers(questions, answers) {
  if (!Array.isArray(questions) || !answers || typeof answers !== "object") return 0;
  return questions.filter((_, index) => isInterviewAnswerComplete(answers[index])).length;
}

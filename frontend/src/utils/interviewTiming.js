export const INTERVIEW_DURATIONS = [10, 20, 30];

export function normalizeInterviewDuration(value) {
  const duration = Number(value);
  return INTERVIEW_DURATIONS.includes(duration) ? duration : 20;
}

export function getAdaptiveInterviewQuestionCount(duration, random = Math.random) {
  const normalized = normalizeInterviewDuration(duration);
  const ranges = { 10: [3, 5], 20: [5, 7], 30: [7, 8] };
  const [minimum, maximum] = ranges[normalized];
  const sample = Math.max(0, Math.min(0.999999, Number(random()) || 0));
  return minimum + Math.floor(sample * (maximum - minimum + 1));
}

export function getRemainingInterviewSeconds(createdAt, duration, now = Date.now()) {
  const startedAt = Date.parse(createdAt);
  if (!Number.isFinite(startedAt)) return normalizeInterviewDuration(duration) * 60;
  return Math.max(0, (normalizeInterviewDuration(duration) * 60) - Math.floor((Number(now) - startedAt) / 1000));
}

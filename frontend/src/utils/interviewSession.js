import { buildInterviewQuestions } from "../data/interviewQuestions.js";
import { isInterviewAnswerComplete } from "./interviewAnswers.js";
import { normalizeInterviewDuration } from "./interviewTiming.js";

export const INTERVIEW_SESSION_KEY = "prepmentor_interview_session";

function normalizeConfig(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const role = typeof value.role === "string" ? value.role.trim().slice(0, 160) : "";
  const createdAt = typeof value.createdAt === "string" ? value.createdAt.slice(0, 80) : "";
  if (!role || !createdAt) return null;
  return {
    ...value,
    role,
    createdAt,
    experience: typeof value.experience === "string" ? value.experience.slice(0, 100) : "",
    interviewType: ["Technical", "Behavioral", "Mixed"].includes(value.interviewType) ? value.interviewType : "Mixed",
    difficulty: ["Easy", "Medium", "Hard"].includes(value.difficulty) ? value.difficulty : "Medium",
    duration: normalizeInterviewDuration(value.duration),
    questionCount: Math.max(1, Math.min(8, Math.round(Number(value.questionCount) || 5))),
    focusAreas: Array.isArray(value.focusAreas)
      ? value.focusAreas.filter((item) => typeof item === "string").slice(0, 4).map((item) => item.slice(0, 100))
      : [],
  };
}

function normalizeQuestions(value, config) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) return buildInterviewQuestions(config);
  const questions = value.map((item) => ({
    question: typeof item?.question === "string" ? item.question.trim().slice(0, 1500) : "",
    focus: typeof item?.focus === "string" && item.focus.trim()
      ? item.focus.trim().slice(0, 160)
      : typeof item?.topic === "string" && item.topic.trim()
        ? item.topic.trim().slice(0, 160)
        : "General",
  }));
  return questions.every((item) => item.question) ? questions : buildInterviewQuestions(config);
}

export function createInterviewSession(configValue, questionValue, progress = {}) {
  const config = normalizeConfig(configValue);
  if (!config) return null;
  const questions = normalizeQuestions(questionValue, config);
  const answers = {};
  if (progress.answers && typeof progress.answers === "object" && !Array.isArray(progress.answers)) {
    Object.entries(progress.answers).forEach(([key, answer]) => {
      const index = Number(key);
      if (Number.isInteger(index) && index >= 0 && index < questions.length && typeof answer === "string") {
        answers[index] = answer.slice(0, 20_000);
      }
    });
  }
  const requestedIndex = Math.max(0, Math.min(questions.length - 1, Math.round(Number(progress.index) || 0)));
  let unlockedIndex = 0;
  while (unlockedIndex < questions.length - 1 && isInterviewAnswerComplete(answers[unlockedIndex])) {
    unlockedIndex += 1;
  }
  const index = Math.min(requestedIndex, unlockedIndex);
  Object.keys(answers).forEach((key) => {
    if (Number(key) > index) delete answers[key];
  });
  return {
    config,
    questions,
    index,
    answers,
  };
}

export function normalizeInterviewSession(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return createInterviewSession(value.config, value.questions, value);
}

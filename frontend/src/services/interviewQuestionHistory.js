import { getAccountStorageKey, readStorage, writeStorage } from "../utils/storage.js";

const INTERVIEW_QUESTION_HISTORY_KEY = "prepmentor_interview_question_history";

export function getRecentInterviewQuestions() {
  const value = readStorage(getAccountStorageKey(INTERVIEW_QUESTION_HISTORY_KEY), []);
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim().slice(0, 1500)).slice(-60)
    : [];
}

export function rememberInterviewQuestions(questions) {
  const incoming = Array.isArray(questions)
    ? questions.map((item) => String(item?.question || "").trim().slice(0, 1500)).filter(Boolean)
    : [];
  const next = [...new Set([...getRecentInterviewQuestions(), ...incoming])].slice(-60);
  writeStorage(getAccountStorageKey(INTERVIEW_QUESTION_HISTORY_KEY), next);
  return next;
}

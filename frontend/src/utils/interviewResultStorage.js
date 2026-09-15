import { getAccountStorageKey, readStorage, writeStorage } from "./storage.js";

const RESULT_KEY_PREFIX = "prepmentor_interview_result";

export function getInterviewResultStorageKey(id, account = null) {
  const safeId = encodeURIComponent(String(id || "unknown").slice(0, 180));
  return getAccountStorageKey(`${RESULT_KEY_PREFIX}:${safeId}`, account);
}

export function normalizeInterviewResult(value, expectedId = "") {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const id = typeof value.id === "string" ? value.id.trim().slice(0, 180) : "";
  if (!id || (expectedId && id !== expectedId)) return null;
  const score = Number(value.score);
  if (!Number.isFinite(score)) return null;
  return {
    ...value,
    id,
    score: Math.max(0, Math.min(100, Math.round(score))),
    role: typeof value.role === "string" && value.role.trim() ? value.role.trim().slice(0, 160) : "Software Engineer",
    type: typeof value.type === "string" && value.type.trim() ? value.type.trim().slice(0, 80) : "Mixed",
    metrics: value.metrics && typeof value.metrics === "object" && !Array.isArray(value.metrics) ? value.metrics : {},
  };
}

export function readLocalInterviewResult(id, account = null) {
  return normalizeInterviewResult(readStorage(getInterviewResultStorageKey(id, account), null), id);
}

export function saveLocalInterviewResult(result, account = null) {
  const normalized = normalizeInterviewResult(result);
  if (!normalized) return false;
  return writeStorage(getInterviewResultStorageKey(normalized.id, account), normalized);
}

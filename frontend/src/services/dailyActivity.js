import { getAccountStorageKey, readStorage, writeStorage } from "../utils/storage.js";

const DAILY_ACTIVITY_KEY = "prepmentor_daily_question_activity";
export const DAILY_ACTIVITY_UPDATED_EVENT = "prepmentor:daily-activity-updated";

export function getLocalDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getDailyActivity() {
  const value = readStorage(getAccountStorageKey(DAILY_ACTIVITY_KEY), []);
  return Array.isArray(value)
    ? [...new Set(value.filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day)))].sort().slice(-366)
    : [];
}

export function markDailyQuestionActivity(value = new Date()) {
  const day = getLocalDateKey(value);
  if (!day) return getDailyActivity();
  const days = [...new Set([...getDailyActivity(), day])].sort().slice(-366);
  writeStorage(getAccountStorageKey(DAILY_ACTIVITY_KEY), days);
  globalThis.window?.dispatchEvent(new Event(DAILY_ACTIVITY_UPDATED_EVENT));
  return days;
}

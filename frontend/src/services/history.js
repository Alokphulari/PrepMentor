import { getAccountStorageKey, readStorage, writeStorage } from "../utils/storage";
import { mergeHistoryEntries, normalizeHistoryEntries } from "../utils/historyEntries";
import { hasRemoteApi } from "./api";
import { authorizedRequest } from "./authService";

const HISTORY_KEY = "prepmentor_history";
export const HISTORY_UPDATED_EVENT = "prepmentor:history-updated";

function announceHistoryUpdate(entry) {
  globalThis.window?.dispatchEvent(new CustomEvent(HISTORY_UPDATED_EVENT, { detail: entry || null }));
}

export function getHistory() {
  const entries = readStorage(getAccountStorageKey(HISTORY_KEY), []);
  return normalizeHistoryEntries(entries);
}

export function addHistoryEntry(entry, { sync = true } = {}) {
  const nextEntry = {
    id: entry.id || crypto.randomUUID(),
    createdAt: entry.createdAt || new Date().toISOString(),
    ...entry,
  };
  writeStorage(getAccountStorageKey(HISTORY_KEY), [nextEntry, ...getHistory()].slice(0, 100));
  if (hasRemoteApi && sync) {
    authorizedRequest("/api/history", {
      method: "POST",
      expireSession: false,
      body: JSON.stringify(nextEntry),
    }).catch((error) => console.error("Unable to sync history entry:", error));
  }
  announceHistoryUpdate(nextEntry);
  return nextEntry;
}

export async function getSyncedHistory() {
  if (!hasRemoteApi) return getHistory();
  const response = await authorizedRequest("/api/history");
  if (!Array.isArray(response.history)) return getHistory();
  const history = mergeHistoryEntries(response.history, getHistory());
  writeStorage(getAccountStorageKey(HISTORY_KEY), history);
  announceHistoryUpdate();
  return history;
}

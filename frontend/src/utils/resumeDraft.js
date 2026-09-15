export const RESUME_SECTIONS = ["education", "experience", "projects", "certifications", "achievements"];

export function normalizeResumeDraft(value, fallback = {}) {
  const draft = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const normalized = { ...fallback, ...draft };
  RESUME_SECTIONS.forEach((section) => {
    normalized[section] = Array.isArray(draft[section])
      ? draft[section].filter((item) => item && typeof item === "object" && !Array.isArray(item))
      : Array.isArray(fallback[section]) ? fallback[section] : [];
  });
  return normalized;
}

export function shouldUseRemoteResume(localDraft, remoteDraft) {
  if (!remoteDraft || typeof remoteDraft !== "object" || Array.isArray(remoteDraft)) return false;
  if (!localDraft || typeof localDraft !== "object" || Array.isArray(localDraft)) return true;
  const localTimestamp = Date.parse(localDraft.updatedAt);
  const remoteTimestamp = Date.parse(remoteDraft.updatedAt);
  if (!Number.isFinite(localTimestamp)) return true;
  if (!Number.isFinite(remoteTimestamp)) return false;
  return remoteTimestamp >= localTimestamp;
}

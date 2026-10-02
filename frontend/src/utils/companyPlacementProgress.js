import { getAccountStorageKey, readStorage, writeStorage } from "./storage";

const KEY = "prepmentor_company_placement";

export function getCompanyProgress(companyId) {
  const all = readStorage(getAccountStorageKey(KEY), {});
  return all[companyId] || { typing: false, speaking: false };
}

export function completeCompanyStage(companyId, stage) {
  if (!companyId || !["typing", "speaking"].includes(stage)) return;
  const key = getAccountStorageKey(KEY);
  const all = readStorage(key, {});
  writeStorage(key, { ...all, [companyId]: { ...getCompanyProgress(companyId), [stage]: true } });
}

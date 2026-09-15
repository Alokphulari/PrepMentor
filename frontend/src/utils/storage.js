export function readStorage(key, fallback) {
  try {
    const value = globalThis.localStorage?.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error(`Unable to read local data for ${key}:`, error);
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // Storage may be denied entirely; the in-memory fallback can still work.
    }
    return fallback;
  }
}

export function writeStorage(key, value) {
  try {
    if (!globalThis.localStorage) return false;
    globalThis.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Unable to save local data for ${key}:`, error);
    return false;
  }
}

export function getAccountStorageKey(baseKey, account = null) {
  const currentAccount = account || readStorage("prepmentor_user", null);
  const identity = currentAccount?.id || currentAccount?.email;
  return identity
    ? `${baseKey}:${encodeURIComponent(String(identity).trim().toLowerCase())}`
    : `${baseKey}:local`;
}

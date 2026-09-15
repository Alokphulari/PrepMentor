export function createRateLimiter({ limit = 20, windowMs = 15 * 60 * 1000, maxEntries = 10_000, now = Date.now } = {}) {
  const attempts = new Map();

  return function check(key) {
    const currentTime = now();
    const existing = attempts.get(key);
    const record = !existing || existing.resetAt <= currentTime
      ? { count: 0, resetAt: currentTime + windowMs }
      : existing;
    record.count += 1;
    attempts.delete(key);
    attempts.set(key, record);

    if (attempts.size > maxEntries) attempts.delete(attempts.keys().next().value);
    return {
      allowed: record.count <= limit,
      remaining: Math.max(0, limit - record.count),
      retryAfter: Math.max(1, Math.ceil((record.resetAt - currentTime) / 1000)),
    };
  };
}

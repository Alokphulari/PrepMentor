function normalizeTopicPerformance(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const topic = typeof item?.topic === "string" ? item.topic.trim() : "";
    const percentage = Number(item?.percentage);
    if (!topic || !Number.isFinite(percentage)) return [];
    return [{ topic: topic.slice(0, 160), percentage: Math.max(0, Math.min(100, Math.round(percentage))) }];
  }).slice(0, 20);
}

export function normalizeHistoryEntries(value) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const title = typeof entry.title === "string" ? entry.title.trim() : "";
    const type = typeof entry.type === "string" ? entry.type.trim() : "";
    const score = Number(entry.score);
    const timestamp = Date.parse(entry.createdAt);
    if (!title || !type || !Number.isFinite(score) || !Number.isFinite(timestamp)) return [];

    const topicPerformance = normalizeTopicPerformance(entry.topicPerformance);
    return [{
      ...entry,
      id: typeof entry.id === "string" && entry.id.trim()
        ? entry.id.trim()
        : `history-${timestamp}-${index}`,
      title: title.slice(0, 160),
      type: type.slice(0, 80),
      score: Math.max(0, Math.min(100, Math.round(score))),
      duration: typeof entry.duration === "string" && entry.duration.trim()
        ? entry.duration.trim().slice(0, 40)
        : "Self-paced",
      createdAt: new Date(timestamp).toISOString(),
      ...(topicPerformance.length ? { topicPerformance } : {}),
    }];
  }).slice(0, 100);
}

export function mergeHistoryEntries(...collections) {
  const seen = new Set();
  return collections
    .flatMap((collection) => normalizeHistoryEntries(collection))
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .filter((entry) => {
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    })
    .slice(0, 100);
}

const validScore = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
export function performanceEvidence(history = [], interviews = []) {
  const seen = new Set();
  const attempts = history.filter((item) => {
    if (!item || !validScore(item.score) || !/aptitude|coding|interview/i.test(item.type || "") || seen.has(item.id)) return false;
    if (item.id) seen.add(item.id);
    return !["self-reported", "semantic-or-static-review"].includes(item.evidenceType);
  }).slice(0, 100);
  const category = (item) => /interview/i.test(item.type) ? "Interview" : /coding/i.test(item.type) ? "Coding" : "Aptitude";
  const estimated = (item) => /local|rubric/i.test(item.evaluationMode || "") || item.provider === "local" || item.fallbackUsed;
  const groups = ["Aptitude", "Coding", "Interview"].map((name) => {
    const items = attempts.filter((item) => category(item) === name && !estimated(item));
    return { name, count: items.length, average: items.length ? Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length) : null };
  });
  const topics = new Map();
  for (const item of [...attempts].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))) {
    for (const topic of item.topicPerformance || []) {
      if (!topic || typeof topic.topic !== "string" || !validScore(topic.percentage)) continue;
      const key = category(item) + ":" + topic.topic;
      if (!topics.has(key)) topics.set(key, { topic: topic.topic.slice(0, 160), score: topic.percentage, category: category(item), estimated: Boolean(estimated(item)) });
    }
  }
  for (const result of interviews.slice(0, 10)) {
    for (const topic of result.weakTopics || []) {
      const key = "Interview:" + topic?.topic;
      if (typeof topic?.topic === "string" && validScore(topic.score) && !topics.has(key)) topics.set(key, { topic: topic.topic.slice(0, 160), score: topic.score, category: "Interview", estimated: Boolean(estimated(result)) });
    }
  }
  const ordered = attempts.filter((item) => !estimated(item)).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const mean = (items) => items.reduce((sum, item) => sum + item.score, 0) / items.length;
  const movement = ordered.length >= 2 ? Math.round(mean(ordered.slice(-5)) - mean(ordered.slice(0, Math.min(5, ordered.length - 1)))) : null;
  return { count: attempts.length, measuredCount: ordered.length, localEstimateCount: attempts.filter(estimated).length, groups, movement, weakTopics: [...topics.values()].filter((item) => item.score < 70).sort((a, b) => a.score - b.score).slice(0, 10) };
}
export function localPerformanceAnalysis(evidence) {
  const strengths = evidence.groups.filter((item) => item.average >= 70).map((item) => item.name + ": " + item.average + "% average across " + item.count + " attempts.");
  const recommendations = evidence.weakTopics.map((item) => "Review " + item.topic + " (" + item.category + (item.estimated ? ", local estimate" : "") + "), work through an example, then retake a practice assessment.");
  for (const item of evidence.groups.filter((item) => !item.count)) recommendations.push("Complete a measured " + item.name.toLowerCase() + " assessment to establish a baseline.");
  return { provider: "local", fallbackUsed: true, summary: evidence.count ? "Analysis of " + evidence.count + " recorded attempts: " + evidence.measuredCount + " measured results and " + evidence.localEstimateCount + " local estimates. Local interview scores are kept separate from measured averages." : "No assessment evidence yet. Complete a practice session to build your performance analysis.", strengths, recommendations: recommendations.length ? recommendations.slice(0, 10) : ["Practice a harder problem in your strongest category and compare your next result."], evidence, createdAt: new Date().toISOString() };
}

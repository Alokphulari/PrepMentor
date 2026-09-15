const METRICS = [
  ["communication", "Communication", "Use a clear situation-action-result structure and make each answer easy to follow."],
  ["technical", "Technical knowledge", "Explain the underlying concepts and support decisions with concrete technical details."],
  ["problemSolving", "Problem solving", "Talk through alternatives, constraints, and trade-offs before selecting an approach."],
  ["confidence", "Confidence", "Complete every response and state your decisions directly with supporting evidence."],
];

function safeScore(value) {
  const score = Number(value);
  return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
}

export function getInterviewHeadline(score) {
  const value = safeScore(score);
  if (value >= 85) return "Interview-ready performance.";
  if (value >= 70) return "A strong foundation to build on.";
  if (value >= 40) return "Good progress with clear areas to strengthen.";
  return "A useful baseline for your next practice session.";
}

export function getInterviewFeedback(metrics) {
  const source = metrics && typeof metrics === "object" && !Array.isArray(metrics) ? metrics : {};
  const normalizedMetrics = METRICS.map(([key, label, recommendation]) => ({
    key,
    label,
    value: safeScore(source[key]),
    recommendation,
  }));
  const strengths = normalizedMetrics
    .filter((metric) => metric.value >= 70)
    .sort((left, right) => right.value - left.value)
    .map((metric) => `${metric.label} is a current strength at ${metric.value}%.`);
  const focus = normalizedMetrics
    .filter((metric) => metric.value < 70)
    .sort((left, right) => left.value - right.value)
    .slice(0, 2);

  return {
    metrics: normalizedMetrics,
    strengths: strengths.length ? strengths : ["You established a baseline; completing fuller answers will reveal your strongest area."],
    recommendations: focus.length
      ? focus.map((metric) => `${metric.label}: ${metric.recommendation}`)
      : ["Maintain this level by practicing role-specific examples and measurable outcomes."],
  };
}

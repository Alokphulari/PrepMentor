const modules = [
  { id: "aptitude", label: "Aptitude", match: (type) => type.includes("aptitude") || type.includes("daily challenge") },
  { id: "coding", label: "Coding", match: (type) => type.includes("coding") },
  { id: "interview", label: "Interview", match: (type) => type.includes("interview") },
];

export function getDashboardInsights(history) {
  const entries = Array.isArray(history) ? history : [];
  const performance = modules.map((module) => {
    const attempts = entries.filter((entry) => module.match(String(entry?.type || "").toLowerCase()));
    const average = attempts.length
      ? Math.round(attempts.reduce((sum, entry) => sum + Math.max(0, Math.min(100, Number(entry.score) || 0)), 0) / attempts.length)
      : null;
    return { id: module.id, label: module.label, attempts: attempts.length, average };
  });
  const measured = performance.filter((item) => item.average !== null).sort((left, right) => left.average - right.average);
  const weakest = measured[0] || null;
  return {
    performance,
    weakest,
    recommendation: weakest
      ? weakest.average < 70
        ? `Prioritize ${weakest.label.toLowerCase()} practice to bring this area above 70%.`
        : `${weakest.label} is currently your lowest area; maintain it with a short focused session.`
      : "Complete one practice session to unlock a personalized recommendation.",
  };
}

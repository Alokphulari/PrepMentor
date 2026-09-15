function boundedScore(value) {
  const score = Number(value);
  return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
}

export function buildCareerRoadmap({ score, module = "General", topicPerformance = [], role = "Software Engineer" } = {}) {
  const safeScore = boundedScore(score);
  const weakTopics = (Array.isArray(topicPerformance) ? topicPerformance : [])
    .filter((item) => item?.topic && Number.isFinite(Number(item.percentage)))
    .sort((a, b) => Number(a.percentage) - Number(b.percentage))
    .slice(0, 2)
    .map((item) => String(item.topic).slice(0, 80));
  const focus = weakTopics[0] || (String(module).toLowerCase().includes("interview") ? "structured communication" : String(module).toLowerCase().includes("coding") ? "problem-solving patterns" : "core fundamentals");
  const secondary = weakTopics[1] || "timed application";
  const band = safeScore >= 85 ? "advanced" : safeScore >= 70 ? "progressing" : safeScore >= 50 ? "developing" : "foundation";
  const practiceTarget = safeScore >= 85 ? 3 : safeScore >= 70 ? 5 : 7;
  return {
    title: `${role} readiness roadmap`,
    summary: safeScore >= 85 ? "Convert strong performance into interview-ready consistency." : safeScore >= 70 ? "Strengthen the weakest signal, then prove it under time pressure." : "Rebuild the foundation deliberately before increasing difficulty.",
    band,
    steps: [
      { period: "Next 2 days", title: `Learn ${focus}`, task: `Complete one lesson, one video, and a written example for ${focus}.` },
      { period: "Days 3–5", title: `Apply ${secondary}`, task: `Solve ${practiceTarget} focused questions and explain every incorrect answer.` },
      { period: "Week 2", title: `${module} checkpoint`, task: `Repeat a timed ${String(module).toLowerCase()} session and target ${Math.min(95, Math.max(70, safeScore + 10))}% or higher.` },
      { period: "Week 3", title: "Career proof", task: `Add one measurable project or interview story demonstrating ${focus} for a ${role} role.` },
    ],
  };
}

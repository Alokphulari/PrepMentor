function localDayNumber(date) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

export function calculateActivityStreak(history, now = new Date()) {
  const entries = Array.isArray(history) ? history : [];
  const today = localDayNumber(now);
  const days = [...new Set(entries
    .map((item) => new Date(item?.createdAt))
    .filter((date) => Number.isFinite(date.getTime()))
    .map(localDayNumber)
    .filter((day) => day <= today))]
    .sort((left, right) => right - left);
  if (!days.length || today - days[0] > 1) return 0;
  let streak = 1;
  for (let index = 1; index < days.length; index += 1) {
    if (days[index - 1] - days[index] !== 1) break;
    streak += 1;
  }
  return streak;
}

export function getAchievementProgress(history, placementState, now = new Date()) {
  const entries = Array.isArray(history) ? history : [];
  const average = entries.length ? Math.round(entries.reduce((sum, item) => sum + (Number(item.score) || 0), 0) / entries.length) : 0;
  const placementPassed = [...Object.values(placementState?.aptitude || {}), ...Object.values(placementState?.coding || {}), placementState?.interview?.status].filter((status) => status === "passed").length;
  const codingAttempts = entries.filter((item) => item.type === "Coding Practice").length;
  const interviewAttempts = entries.filter((item) => item.type === "Interview").length;
  const streak = calculateActivityStreak(entries, now);
  const achievements = [
    { id: "first-step", title: "First Step", description: "Complete your first practice session.", earned: entries.length >= 1, icon: "sparkles" },
    { id: "practice-regular", title: "Practice Regular", description: "Complete 5 preparation sessions.", earned: entries.length >= 5, icon: "book" },
    { id: "problem-solver", title: "Problem Solver", description: "Submit 10 coding practice attempts.", earned: codingAttempts >= 10, icon: "code" },
    { id: "interview-ready", title: "Interview Ready", description: "Complete 3 mock interviews.", earned: interviewAttempts >= 3, icon: "mic" },
    { id: "high-performer", title: "High Performer", description: "Maintain an average score of at least 80%.", earned: entries.length >= 3 && average >= 80, icon: "target" },
    { id: "on-fire", title: "On Fire", description: "Build a 7-day preparation streak.", earned: streak >= 7, icon: "flame" },
    { id: "placement-climber", title: "Placement Climber", description: "Pass at least 3 Placement stages.", earned: placementPassed >= 3, icon: "trophy" },
    { id: "placement-champion", title: "Placement Champion", description: "Complete the full Placement journey.", earned: placementPassed === 7, icon: "award" },
  ];
  return { achievements, earnedCount: achievements.filter((item) => item.earned).length, average, streak, placementPassed };
}

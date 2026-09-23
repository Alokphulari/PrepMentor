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
  const entries = (Array.isArray(history) ? history : []).filter((entry) => entry && typeof entry === "object");
  const scores = entries.map((entry) => entry.score).filter((value) => value !== null && value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100).map(Number);
  const average = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
  const passed = (module) => ["easy", "medium", "hard"].filter((level) => placementState?.[module]?.[level] === "passed").length;
  const aptitudePassed = passed("aptitude");
  const codingPassed = passed("coding");
  const placementPassed = aptitudePassed + codingPassed + Number(placementState?.interview?.status === "passed");
  const codingAttempts = entries.filter((item) => ["Coding", "Coding Practice"].includes(item.type)).length;
  const aptitudeAttempts = entries.filter((item) => ["Aptitude", "Aptitude Practice"].includes(item.type)).length;
  const interviewAttempts = entries.filter((item) => item.type === "Interview").length;
  const streak = calculateActivityStreak(entries, now);
  const make = (id, title, description, category, icon, current, target, extra = {}) => ({
    id, title, description, category, icon, current: Math.min(current, target), target,
    earned: current >= target, percent: Math.min(100, Math.round(current / target * 100)),
    progressLabel: Math.min(current, target) + " / " + target, ...extra,
  });
  const achievements = [
    make("first-step", "First Step", "Complete your first preparation session.", "Consistency", "sparkles", entries.length, 1),
    make("practice-regular", "Practice Regular", "Complete 5 preparation sessions.", "Consistency", "book", entries.length, 5),
    make("problem-solver", "Problem Solver", "Complete 10 coding attempts.", "Coding", "code", codingAttempts, 10),
    make("interview-ready", "Interview Ready", "Complete 3 mock interviews.", "Interviews", "mic", interviewAttempts, 3),
    make("high-performer", "High Performer", "Average at least 80% across 3 or more scored sessions.", "Performance", "target",
      Math.min(average / 80, scores.length / 3) * 100, 100,
      { progressLabel: average + "% average ? " + Math.min(scores.length, 3) + " / 3 scored sessions" }),
    make("on-fire", "On Fire", "Build a current 7-day preparation streak.", "Consistency", "flame", streak, 7),
    make("placement-climber", "Placement Climber", "Pass at least 3 Placement stages.", "Placement", "trophy", placementPassed, 3),
    make("placement-champion", "Placement Champion", "Pass all 7 stages of your Placement journey.", "Placement", "award", placementPassed, 7),
    make("logic-launch", "Logic Launch", "Complete your first aptitude assessment.", "Aptitude", "brain", aptitudeAttempts, 1),
    make("aptitude-ace", "Aptitude Ace", "Complete 10 aptitude assessments.", "Aptitude", "puzzle", aptitudeAttempts, 10),
    make("hello-code", "Hello, Code!", "Complete your first coding attempt.", "Coding", "terminal", codingAttempts, 1),
    make("code-craftsman", "Code Craftsman", "Build experience with 25 coding attempts.", "Coding", "braces", codingAttempts, 25),
    make("interview-veteran", "Interview Veteran", "Complete 10 mock interviews.", "Interviews", "messages", interviewAttempts, 10),
    make("dedicated-learner", "Dedicated Learner", "Complete 25 preparation sessions.", "Consistency", "graduation", entries.length, 25),
    make("unstoppable", "Unstoppable", "Reach 50 completed preparation sessions.", "Consistency", "rocket", entries.length, 50),
    make("perfect-score", "Perfect Score", "Earn 100% in a scored assessment.", "Performance", "gem", scores.filter((score) => score === 100).length, 1),
    make("consistent-excellence", "Consistent Excellence", "Score at least 80% in 5 assessments.", "Performance", "medal", scores.filter((score) => score >= 80).length, 5),
    make("all-rounder", "All-Rounder", "Complete an aptitude, coding, and interview session.", "Performance", "compass", [aptitudeAttempts, codingAttempts, interviewAttempts].filter(Boolean).length, 3),
    make("aptitude-graduate", "Aptitude Graduate", "Pass easy, medium, and hard Placement aptitude.", "Placement", "shield", aptitudePassed, 3),
    make("coding-graduate", "Coding Graduate", "Pass easy, medium, and hard Placement coding.", "Placement", "crown", codingPassed, 3),
  ];
  return { achievements, earnedCount: achievements.filter((item) => item.earned).length, average, streak, placementPassed };
}

export const VOICE_INTENT_ROUTES = {
  aptitude: "/practice/aptitude",
  placement: "/placement",
  coding: "/coding-interview",
  interview: "/interview/setup",
  resume: "/resume",
  performance: "/performance",
  history: "/history",
  learning: "/learning",
  dashboard: "/dashboard",
};

const intentRules = [
  { intent: "placement", pattern: /placement|assessment round|sequential round/ },
  { intent: "aptitude", pattern: /aptitude|reasoning|quantitative|logical|verbal|math|numerical/ },
  { intent: "coding", pattern: /coding|programming|algorithm|data structure|leetcode|code problem/ },
  { intent: "interview", pattern: /interview|mock interview|hr round|technical round/ },
  { intent: "resume", pattern: /resume|cv|curriculum vitae/ },
  { intent: "performance", pattern: /performance|score|scores|analytics|how am i doing|progress report/ },
  { intent: "history", pattern: /history|past attempts|previous tests|results/ },
  { intent: "learning", pattern: /learning|weak area|weak topic|study plan|remediation|improve/ },
  { intent: "dashboard", pattern: /dashboard|home|go back|main page/ },
];

export function detectVoiceIntent(message) {
  const text = typeof message === "string" ? message.trim().toLowerCase() : "";
  if (!text) return { intent: "empty", route: null };
  const match = intentRules.find((rule) => rule.pattern.test(text));
  return match ? { intent: match.intent, route: VOICE_INTENT_ROUTES[match.intent] } : { intent: "unknown", route: null };
}

export function localVoiceReply(intent, name = "there") {
  const firstName = String(name || "there").trim().split(/\s+/)[0] || "there";
  const replies = {
    aptitude: `Sure, ${firstName}. I’ll take you to Aptitude Practice. You can choose quantitative, logical, or verbal questions.`,
    placement: "Let’s continue your Placement journey. I’ll open the next available assessment stage.",
    coding: "Let’s work on coding. I’ll open the coding practice workspace for you.",
    interview: "Great. I’ll open Mock Interview setup so you can choose your role, focus, and duration.",
    resume: "I’ll open Resume Studio so we can build or analyze your resume.",
    performance: "I’ll show your performance dashboard and recent measured scores.",
    history: "I’ll open your assessment history and saved results.",
    learning: "Let’s focus on improvement. I’ll open the Learning Hub and your weak areas.",
    dashboard: "Taking you back to your PrepMentor dashboard.",
  };
  return replies[intent] || "I can help with aptitude, Placement, coding, mock interviews, resumes, learning, performance, history, or your dashboard. What would you like to do?";
}

export function voiceHelpReply() {
  return "You can say: start aptitude practice, continue Placement, practice coding, start a mock interview, open my resume, show my performance, review history, open learning, or go to the dashboard.";
}

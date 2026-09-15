const technical = [
  { focus: "JavaScript", question: "Explain the difference between synchronous and asynchronous JavaScript with an example." },
  { focus: "React", question: "How would you diagnose and improve unnecessary re-renders in a React application?" },
  { focus: "Data Structures", question: "Choose a data structure for a frequently updated leaderboard and explain the trade-offs." },
  { focus: "System Design", question: "How would you design a notification service that remains reliable during traffic spikes?" },
  { focus: "Databases", question: "When would you add a database index, and what cost does that index introduce?" },
  { focus: "Problem Solving", question: "An API becomes progressively slower during the day. Walk through your investigation." },
  { focus: "Testing", question: "How do you decide what belongs in a unit, integration, or end-to-end test?" },
];

const behavioral = [
  { focus: "Communication", question: "Tell me about a time you explained a technical decision to a non-technical stakeholder." },
  { focus: "Leadership", question: "Describe a situation where you took ownership without being asked." },
  { focus: "Collaboration", question: "Tell me about a disagreement with a teammate and how you resolved it." },
  { focus: "Adaptability", question: "Describe a time requirements changed late in a project. How did you respond?" },
  { focus: "Growth", question: "What is a piece of difficult feedback you received, and what changed afterward?" },
  { focus: "Prioritization", question: "How do you prioritize when several important tasks have the same deadline?" },
  { focus: "Impact", question: "Which project are you most proud of, and how did you measure its impact?" },
];

const promptAngles = [
  "Use a recent project as evidence.",
  "Explain the trade-offs you would discuss with your team.",
  "Describe how you would validate that your approach worked.",
  "Include one failure mode and how you would handle it.",
];

const interviewContexts = [
  "Assume the product has a growing user base.",
  "Answer as if the interviewer asks for a concrete production example.",
  "Consider a cross-functional team with a tight delivery deadline.",
  "Frame the response for an entry-level hiring panel.",
  "Include the signal or metric you would monitor afterward.",
  "State the first clarifying question you would ask before deciding.",
];

function shuffle(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function buildInterviewQuestions(config = {}) {
  const safeConfig = config && typeof config === "object" && !Array.isArray(config) ? config : {};
  const role = typeof safeConfig.role === "string" && safeConfig.role.trim()
    ? safeConfig.role.trim().slice(0, 160)
    : "software";
  const exclusions = new Set(Array.isArray(safeConfig.excludedQuestions) ? safeConfig.excludedQuestions.map((item) => String(item).trim()) : []);
  const introductionOptions = [
    `Introduce yourself for a ${role} role and connect your experience to the position.`,
    `Give me your concise professional introduction for this ${role} opportunity and explain why it fits your next step.`,
    `Walk me through the experience that best prepares you for a ${role} position.`,
    `How would you introduce your background and strongest contribution as a ${role}?`,
  ];
  const introductionText = shuffle(introductionOptions).find((question) => !exclusions.has(question)) || `${introductionOptions[0]} Focus on a different recent experience.`;
  const introduction = { focus: "Introduction", question: introductionText };
  const source = safeConfig.interviewType === "Technical" ? technical : safeConfig.interviewType === "Behavioral" ? behavioral : technical.flatMap((item, index) => [item, behavioral[index]]).filter(Boolean);
  const focusAreas = Array.isArray(safeConfig.focusAreas) ? safeConfig.focusAreas : [];
  const candidates = source.flatMap((item) => promptAngles.flatMap((angle) => interviewContexts.map((context) => ({ ...item, question: `${item.question} ${angle} ${context}` }))));
  const available = candidates.filter((item) => !exclusions.has(item.question));
  const prioritized = [...shuffle(available.filter((item) => focusAreas.includes(item.focus))), ...shuffle(available.filter((item) => !focusAreas.includes(item.focus)))];
  const requestedCount = Number(safeConfig.questionCount);
  const questionCount = Number.isInteger(requestedCount) && requestedCount >= 1
    ? Math.min(requestedCount, 8)
    : 5;
  return [introduction, ...prioritized].slice(0, questionCount);
}

export const interviewFocusAreas = ["JavaScript", "React", "Data Structures", "System Design", "Databases", "Communication", "Leadership", "Problem Solving"];

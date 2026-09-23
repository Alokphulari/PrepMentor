import { readFileSync } from "node:fs";

export const questionBank = JSON.parse(readFileSync(new URL("../data/interviewQuestions.json", import.meta.url), "utf8"));
const clamp = (number) => Math.max(0, Math.min(100, Math.round(number || 0)));
const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const levels = ["easy", "medium", "hard"];
const behavioral = new Set(["HR", "Behavioral"]);
const unique = (values) => [...new Set(values)];

function overlaps(left, right) {
  const a = new Set(normalize(left).split(" "));
  const b = new Set(normalize(right).split(" "));
  return [...a].filter((word) => b.has(word)).length / Math.max(1, new Set([...a, ...b]).size) >= 0.72;
}

export function getFollowUpQuestion(question, turns = []) {
  const entry = questionBank.find((item) => item.id === question.id || item.question === question.question);
  const followUp = entry?.followUps.find((item) => !turns.some((turn) => overlaps(turn.question, item)));
  return followUp ? { ...entry, id: `${entry.id}-follow-up`, question: followUp, isFollowUp: true } : null;
}

export function generateQuestion(config = {}, turns = []) {
  const previous = turns.at(-1);
  let difficulty = levels.includes(config.difficulty?.toLowerCase()) ? config.difficulty.toLowerCase() : "medium";
  if (previous) {
    const lastLevel = levels.indexOf(previous.difficulty || difficulty);
    const score = previous.answerEvaluation?.score ?? 50;
    difficulty = levels[Math.max(0, Math.min(2, lastLevel + (score >= 75 ? 1 : score < 40 ? -1 : 0)))];
  }
  const focusAreas = (config.focusAreas || []).map(normalize);
  const role = normalize(config.role);
  const desiredBehavioral = config.interviewType === "Behavioral" || (config.interviewType === "Mixed" && turns.length % 4 === 3);
  const available = questionBank.filter((item) => !turns.some((turn) => turn.id === item.id || overlaps(turn.question, item.question)));
  const usedCategories = (category) => turns.filter((turn) => turn.category === category).length;
  const rank = (item) => {
    const category = normalize(item.category);
    const focus = focusAreas.some((area) => area === category || (area === "communication" && behavioral.has(item.category)) || (area === "data structures" && item.category === "Problem Solving"));
    const roleMatch = role.includes("frontend") ? ["Frontend", "JavaScript", "React", "HTML", "CSS"].includes(item.category)
      : role.includes("backend") ? ["Node.js", "Express", "MongoDB", "DBMS", "OOP"].includes(item.category)
      : role.includes("full stack") ? ["MERN", "JavaScript", "React", "Node.js", "Express", "MongoDB"].includes(item.category)
      : role.includes("data") ? ["DBMS", "MongoDB", "Problem Solving"].includes(item.category)
      : role.includes("devops") ? ["Operating Systems", "Computer Networks", "Problem Solving"].includes(item.category)
      : ["OOP", "DBMS", "Operating Systems", "Computer Networks", "Problem Solving", "Project"].includes(item.category);
    return (behavioral.has(item.category) === desiredBehavioral ? 100 : 0) + (focus ? 25 : 0) +
      (roleMatch ? 12 : 0) + (item.difficulty === difficulty ? 16 : 0) - usedCategories(item.category) * 8;
  };
  available.sort((a, b) => rank(b) - rank(a) || a.id.localeCompare(b.id));
  // The bank has over 200 questions; sessions are capped at 20 turns.
  const selected = available[0];
  if (!selected) throw new Error("The local interview question bank is exhausted.");
  const followUp = previous?.answerEvaluation?.score < 40 && !previous.isFollowUp ? getFollowUpQuestion(previous, turns) : null;
  const question = followUp && !turns.some((turn) => overlaps(turn.question, followUp.question)) ? { ...followUp, difficulty: "easy" } : selected;
  return { ...question, focus: question.category, topic: question.category, source: "local", provider: "local", fallbackUsed: true, isFollowUp: Boolean(question.isFollowUp) };
}

export function evaluateAnswer(current) {
  const entry = questionBank.find((item) => item.id === current.id || item.question === current.question);
  // For a Gemini-authored question use its own content, never unrelated bank keywords.
  const keywords = current.keywords || entry?.keywords || unique(normalize(current.question).split(" ").filter((word) => word.length > 4 && !["explain", "would", "could", "about", "describe", "which"].includes(word)));
  const answer = normalize(current.transcript ?? current.answer);
  const words = answer.split(" ").filter(Boolean);
  const matched = keywords.filter((keyword) => (` ${answer} `).includes(` ${normalize(keyword)} `));
  const coverage = matched.length / Math.max(1, keywords.length);
  const length = Math.min(1, words.length / 60);
  const detail = /\b(because|therefore|example|however|tradeoff|trade off|result|tested|measured)\b/.test(answer) ? 1 : 0;
  const completeness = clamp((coverage * 0.65 + length * 0.25 + detail * 0.1) * 100);
  const technicalScore = clamp(coverage * 100);
  const communicationScore = clamp((length * 0.5 + Math.min(1, unique(words).length / 30) * 0.3 + detail * 0.2) * 100);
  const relevanceScore = clamp(coverage * 85 + (matched.length ? 15 * length : 0));
  const problemSolving = clamp(coverage * 60 + detail * 25 + (matched.length ? length * 15 : 0));
  const overallScore = clamp(technicalScore * 0.35 + communicationScore * 0.2 + relevanceScore * 0.3 + completeness * 0.15);
  const missing = keywords.filter((keyword) => !matched.includes(keyword));
  const strengths = matched.length ? [`Mentioned relevant concepts: ${matched.join(", ")}.`] : ["Submitted an answer for review."];
  const improvements = [missing.length ? `Explain these concepts in context: ${missing.join(", ")}.` : "Explain a tradeoff and test your approach with an edge case."];
  if (!detail) improvements.push("Add a concrete example and explain why your approach works.");
  const feedback = `Local rubric: ${matched.length} of ${keywords.length} expected concepts mentioned. Keyword coverage estimates relevance; it does not verify factual correctness.`;
  return {
    technicalScore, communicationScore, relevanceScore, overallScore, score: overallScore,
    technicalAccuracy: technicalScore, technicalCorrectness: technicalScore, communication: communicationScore,
    relevance: relevanceScore, reasoning: problemSolving, problemSolving, completeness,
    clarity: communicationScore, specificity: completeness, feedback, strengths, improvements,
    weakTopics: overallScore < 70 ? [current.category || current.focus || "Answer structure"] : [],
    idealAnswer: `Review guide: explain ${keywords.join(", ") || "the central concept"}, give a concrete example, and discuss constraints and tradeoffs.`,
    source: "Local deterministic rubric", provider: "local", fallbackUsed: true,
  };
}

export function calculateFinalScore(evaluations) {
  const average = (key) => clamp(evaluations.reduce((total, item) => total + (Number(item[key]) || 0), 0) / Math.max(1, evaluations.length));
  return { score: average("score"), metrics: { technical: average("technicalAccuracy"), communication: average("communication"), problemSolving: average("problemSolving"), answerRelevance: average("relevance"), confidence: average("communication") } };
}

export function generateFeedback(payload, fallback = {}) {
  const questions = payload.questions || [];
  const questionFeedback = questions.map((question, index) => {
    const answer = String(payload.answers?.[index] || "");
    const evaluation = question.answerEvaluation || evaluateAnswer({ ...question, transcript: answer });
    return { ...evaluation, turnNumber: index + 1, question: question.question, answer, candidateAnswer: answer, betterApproach: (evaluation.improvements || []).join(" ") };
  });
  const strengths = unique(questionFeedback.flatMap((item) => item.strengths || [])).slice(0, 5);
  const improvements = unique(questionFeedback.flatMap((item) => item.improvements || [])).slice(0, 5);
  const weakTopics = unique(questionFeedback.flatMap((item) => item.weakTopics || [])).map((topic) => {
    const related = questionFeedback.filter((item) => item.weakTopics?.includes(topic));
    return { topic, score: calculateFinalScore(related).score, reason: "Review the missing concepts and support your answer with examples." };
  });
  return { ...fallback, ...calculateFinalScore(questionFeedback), role: payload.config?.role || fallback.role,
    type: payload.config?.interviewType || fallback.type, strengths, weaknesses: improvements,
    recommendations: improvements, nextSteps: improvements, weakTopics, questionFeedback,
    questionsAsked: questions.map((item) => item.question), evaluationMode: "Local deterministic interview rubric",
    summary: "Report compiled from saved answer scores. Local scores estimate concept coverage, relevance and answer structure; they are not Gemini semantic evaluations or proof of correctness.",
    provider: "local", fallbackUsed: true,
  };
}

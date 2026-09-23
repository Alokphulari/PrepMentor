import { PASS_PERCENTAGE } from "./assessmentRules.js";

export function getWeakLearningTopics(value, fallback = []) {
  const source = Array.isArray(value) && value.length ? value : fallback;
  const topics = new Map();
  source.forEach((item) => {
    if (!item || typeof item !== "object" || typeof item.topic !== "string" || !item.topic.trim()) return;
    const percentage = Number(item.percentage);
    if (!Number.isFinite(percentage)) return;
    const topic = item.topic.trim().slice(0, 160);
    const score = Math.max(0, Math.min(100, Math.round(percentage)));
    if (score >= PASS_PERCENTAGE) return;
    const existing = topics.get(topic);
    if (!existing || score < existing.percentage) topics.set(topic, { ...item, topic, percentage: score });
  });
  return [...topics.values()].sort((left, right) => left.percentage - right.percentage);
}

export function normalizeCompletedTopics(value, weakTopics) {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(weakTopics.map((item) => item.topic));
  return [...new Set(value.filter((topic) => typeof topic === "string" && allowed.has(topic)))];
}

export function normalizeVisitedReferences(value, weakTopics) {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(weakTopics.map((item) => item.topic));
  return [...new Set(value.filter((topic) => typeof topic === "string" && allowed.has(topic)))];
}

export function countLearningWords(value) {
  return typeof value === "string" ? value.trim().split(/\s+/).filter(Boolean).length : 0;
}

export function normalizeLearningReflections(value, weakTopics) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const allowed = new Set(weakTopics.map((item) => item.topic));
  return Object.fromEntries(Object.entries(value).flatMap(([topic, response]) => {
    if (!allowed.has(topic) || typeof response !== "string") return [];
    return [[topic, response.slice(0, 3000)]];
  }));
}

export function getLearningReferences(topic) {
  const query = encodeURIComponent(typeof topic === "string" ? topic.trim().slice(0, 160) : "learning");
  const name = String(topic || "").toLowerCase();
  if (name.includes("javascript") || name.includes("programming")) {
    return [
      { title: "Guide · MDN JavaScript", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide" },
      { title: "Video · freeCodeCamp JavaScript", url: "https://www.youtube.com/watch?v=jS4aFq5-91M" },
      { title: "Assignment · JavaScript exercises", url: "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/" },
      { title: "Reference · JavaScript language", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference" },
    ];
  }
  if (name.includes("data structure") || name.includes("algorithm") || name.includes("sorting") || name.includes("complexity")) {
    return [
      { title: "Course · MIT Algorithms", url: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/" },
      { title: "Visual lesson · VisuAlgo", url: "https://visualgo.net/en" },
      { title: "Video · Algorithms playlist", url: "https://www.youtube.com/@freecodecamp/search?query=data%20structures%20algorithms" },
      { title: "Assignment · HackerRank practice", url: "https://www.hackerrank.com/domains/algorithms" },
    ];
  }
  if (name.includes("python")) return [
    { title: "Guide · Official Python tutorial", url: "https://docs.python.org/3/tutorial/" },
    { title: "Video · Python lessons", url: "https://www.youtube.com/@freecodecamp/search?query=python" },
    { title: "Assignment · Python exercises", url: "https://www.hackerrank.com/domains/python" },
    { title: "Practice · Exercism Python", url: "https://exercism.org/tracks/python" },
  ];
  if (name.includes("java")) return [
    { title: "Guide · Official Java learning path", url: "https://dev.java/learn/" },
    { title: "Video · Java lessons", url: "https://www.youtube.com/@freecodecamp/search?query=java" },
    { title: "Assignment · Java exercises", url: "https://www.hackerrank.com/domains/java" },
    { title: "Practice · Exercism Java", url: "https://exercism.org/tracks/java" },
  ];
  return [
    { title: `Lesson · Khan Academy: ${topic}`, url: `https://www.khanacademy.org/search?page_search_query=${query}` },
    { title: `Reading · OpenStax: ${topic}`, url: `https://openstax.org/search?query=${query}` },
    { title: `Video · ${topic}`, url: `https://www.youtube.com/results?search_query=${query}+tutorial` },
    { title: `Assignment · ${topic} practice`, url: `https://www.khanacademy.org/search?page_search_query=${query}+practice` },
  ];
}

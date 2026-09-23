import { dsaProblems, dsaTopics } from "../data/dsaRoadmap.js";
import { CODING_LANGUAGES } from "./codingLanguages.js";

export function normalizeDsaProgress(value) {
  const source = value && typeof value === "object" ? value : {};
  const entries = {};
  for (const problem of dsaProblems) {
    const saved = source.entries?.[problem.id];
    if (!saved || typeof saved !== "object") continue;
    const drafts = {};
    for (const language of CODING_LANGUAGES) {
      if (typeof saved.drafts?.[language] === "string") drafts[language] = saved.drafts[language].slice(0, 50000);
    }
    entries[problem.id] = {
      status: ["todo", "in-progress", "completed"].includes(saved.status) ? saved.status : "todo",
      bookmarked: saved.bookmarked === true,
      notes: typeof saved.notes === "string" ? saved.notes.slice(0, 6000) : "",
      drafts,
    };
  }
  return {
    topicId: dsaTopics.some((topic) => topic.id === source.topicId) ? source.topicId : dsaTopics[0].id,
    language: CODING_LANGUAGES.includes(source.language) ? source.language : "JavaScript",
    entries,
  };
}

export function filterDsaProblems({ topicId, query = "", difficulty = "All", status = "All", entries = {} }) {
  const search = query.trim().toLowerCase();
  return dsaProblems.filter((problem) => (!topicId || problem.topicId === topicId)
    && (!search || `${problem.title} ${problem.pattern}`.toLowerCase().includes(search))
    && (difficulty === "All" || problem.difficulty === difficulty)
    && (status === "All" || (status === "bookmarked" ? entries[problem.id]?.bookmarked : (entries[problem.id]?.status || "todo") === status)));
}

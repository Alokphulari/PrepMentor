import { CODING_LANGUAGES } from "./codingLanguages.js";

const difficulties = ["Easy", "Medium", "Hard"];
const filters = ["All", ...difficulties];
const CATALOG_SIZE = 1000;
const BATCH_SIZE = 30;

function text(value, fallback, limit) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, limit) : fallback;
}

function templates(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([language, code]) => CODING_LANGUAGES.includes(language) && typeof code === "string").map(([language, code]) => [language, code.slice(0, 100_000)]));
}

function tokens(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([language, entries]) => CODING_LANGUAGES.includes(language) && Array.isArray(entries)).map(([language, entries]) => [language, entries.filter((entry) => typeof entry === "string").slice(0, 10).map((entry) => entry.slice(0, 100))]));
}

export function normalizeCodingProblems(value) {
  if (!Array.isArray(value) || !value.length || value.length > 50) return [];
  const ids = new Set();
  const normalized = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return [];
    const id = text(item.id, "", 160);
    if (!id || ids.has(id)) return [];
    ids.add(id);
    const difficulty = difficulties.includes(item.difficulty) ? item.difficulty : "Medium";
    normalized.push({
      id,
      title: text(item.title, "Coding problem", 160),
      question: text(item.question, item.description || "Solve this coding problem.", 1000),
      description: text(item.description, item.question || "Solve this coding problem.", 1000),
      topic: text(item.topic, "Problem Solving", 160),
      difficulty,
      constraints: Array.isArray(item.constraints) ? item.constraints.filter((entry) => typeof entry === "string").slice(0, 8).map((entry) => entry.slice(0, 300)) : [],
      example: text(item.example, "Create a small example and verify the result.", 1000),
      hints: Array.isArray(item.hints) ? item.hints.filter((entry) => typeof entry === "string").slice(0, 4).map((entry) => entry.slice(0, 500)) : [],
      templates: templates(item.templates),
      tokens: tokens(item.tokens),
    });
  }
  return normalized;
}

export function normalizeCodingWorkspaceState(value, fallbackProblems) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const restoredProblems = normalizeCodingProblems(source.problems);
  const problems = restoredProblems.length ? restoredProblems : fallbackProblems;
  const problemId = problems.some((item) => item.id === source.problemId) ? source.problemId : problems[0].id;
  return {
    problems,
    problemId,
    language: CODING_LANGUAGES.includes(source.language) ? source.language : "JavaScript",
    filter: filters.includes(source.filter) ? source.filter : "All",
    catalogOffset: Number.isInteger(source.catalogOffset) && source.catalogOffset >= -30 && source.catalogOffset <= 999 ? source.catalogOffset : -30,
    catalogSource: ["curated", "llm", "catalog-fallback"].includes(source.catalogSource) ? source.catalogSource : "curated",
    hint: Math.max(0, Math.min(4, Math.round(Number(source.hint) || 0))),
  };
}

export function getCodingCatalogBatch(currentOffset = -BATCH_SIZE, requestedOffset) {
  const hasRequestedOffset = Number.isInteger(requestedOffset);
  const offset = hasRequestedOffset
    ? Math.max(0, Math.min(CATALOG_SIZE - 1, requestedOffset))
    : currentOffset < 0 || currentOffset + BATCH_SIZE >= CATALOG_SIZE
      ? 0
      : currentOffset + BATCH_SIZE;
  return {
    offset,
    count: Math.min(BATCH_SIZE, CATALOG_SIZE - offset),
  };
}

export function needsCodingDifficultyBatch(problems, difficulty) {
  if (difficulty === "All") return false;
  if (!difficulties.includes(difficulty) || !Array.isArray(problems)) return false;
  return !problems.some((problem) => problem?.difficulty === difficulty);
}

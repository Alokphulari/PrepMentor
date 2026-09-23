import { isConfigured, structuredCompletion } from "./ai/aiClient.js";
const kinds = new Set(["aptitude", "coding", "interview"]);
const difficulties = new Set(["easy", "medium", "hard"]);
const languages = new Set(["JavaScript", "Python", "Java", "C++", "C", "C#", "Go", "TypeScript"]);

function text(value, fallback, limit = 120) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, limit) : fallback;
}

export function normalizeGenerationRequest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !kinds.has(value.kind)) {
    throw new Error("Question generation requires aptitude, coding, or interview kind.");
  }
  const count = Math.max(1, Math.min(50, Math.round(Number(value.count) || 30)));
  return {
    kind: value.kind,
    count,
    difficulty: difficulties.has(String(value.difficulty).toLowerCase()) ? String(value.difficulty).toLowerCase() : "medium",
    category: text(value.category, "general"),
    role: text(value.role, "Software Engineer", 160),
    language: languages.has(value.language) ? value.language : "JavaScript",
    offset: Math.max(0, Math.min(999, Math.round(Number(value.offset) || 0))),
    excludedQuestions: Array.isArray(value.excludedQuestions)
      ? value.excludedQuestions.filter((item) => typeof item === "string" && item.trim()).slice(-60).map((item) => item.trim().slice(0, 1000))
      : [],
    previousQuestion: value.kind === "interview" ? text(value.previousQuestion, "", 1500) : "",
    previousAnswer: value.kind === "interview" ? text(value.previousAnswer, "", 4000) : "",
  };
}

function extractJson(content) {
  const source = String(content || "").replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed = JSON.parse(source);
  const questions = Array.isArray(parsed) ? parsed : parsed?.questions;
  if (!Array.isArray(questions)) throw new Error("The model did not return a question array.");
  return questions;
}

function validateQuestions(items, config) {
  return items.slice(0, config.count).map((item, index) => {
    if (!item || typeof item !== "object" || typeof item.question !== "string") throw new Error("The model returned an invalid question.");
    if (!item.question.trim()) throw new Error("Empty generated question.");
    const common = { id: `${config.kind}-${config.offset + index + 1}`, question: item.question.trim().slice(0, 1000), difficulty: config.difficulty };
    if (config.kind === "aptitude") {
      const options = Array.isArray(item.options) && item.options.length === 4 && item.options.every((option) => typeof option === "string" && option.trim() && option.length <= 1000) ? item.options : [];
      if (options.length !== 4 || new Set(options).size !== 4 || !options.includes(String(item.answer))) throw new Error("The model returned an invalid aptitude answer.");
      if (typeof item.topic !== "string" || !item.topic.trim() || typeof item.explanation !== "string" || !item.explanation.trim()) throw new Error("Incomplete aptitude question.");
      return { ...common, options, answer: String(item.answer), topic: text(item.topic, config.category), explanation: text(item.explanation, "", 2000) };
    }
    if (config.kind === "interview") return { ...common, focus: text(item.focus, config.role) };
    if (!["title", "description", "example", "topic"].every((key) => typeof item[key] === "string" && item[key].trim()) || !Array.isArray(item.constraints) || !item.constraints.length || !Array.isArray(item.hints)) throw new Error("Incomplete coding problem.");
    return {
      ...common,
      title: text(item.title, `Coding problem ${config.offset + index + 1}`, 160),
      topic: text(item.topic, "Problem Solving"),
      description: text(item.description, item.question, 1000),
      constraints: Array.isArray(item.constraints) ? item.constraints.map(String).slice(0, 8) : [],
      example: text(item.example, "Create and explain a correct solution.", 1000),
      hints: Array.isArray(item.hints) ? item.hints.map(String).slice(0, 4) : [],
      language: config.language,
    };
  });
}


export function isLlmConfigured() {
  return isConfigured();
}

export async function generateQuestions(value) {
  const config = normalizeGenerationRequest(value);
  if (!isLlmConfigured()) {
    const error = new Error("LLM generation is not configured. Set LLM_API_KEY on the backend.");
    error.status = 503;
    throw error;
  }
  const questions = await structuredCompletion('Create accurate assessment content. Return {questions: [...]} with exactly the requested count. Aptitude entries require question, exactly four distinct options, answer matching one option, topic and explanation. Interview entries require question and focus. Coding entries require title, question, topic, description, constraints, example and hints.', config, (value) => validateQuestions(extractJson(JSON.stringify(value)), config));
  if (questions.length !== config.count) throw new Error("The model returned fewer questions than requested.");
  return { questions, source: "llm", catalogSize: config.kind === "coding" ? 1000 : null };
}

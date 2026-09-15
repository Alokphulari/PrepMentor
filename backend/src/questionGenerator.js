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
    const common = { id: `${config.kind}-${config.offset + index + 1}`, question: item.question.trim().slice(0, 1000), difficulty: config.difficulty };
    if (config.kind === "aptitude") {
      const options = Array.isArray(item.options) ? item.options.map(String).slice(0, 4) : [];
      if (options.length !== 4 || !options.includes(String(item.answer))) throw new Error("The model returned an invalid aptitude answer.");
      return { ...common, options, answer: String(item.answer), topic: text(item.topic, config.category) };
    }
    if (config.kind === "interview") return { ...common, focus: text(item.focus, config.role) };
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

function promptFor(config) {
  const format = config.kind === "aptitude"
    ? "question, exactly four string options, answer matching one option, topic"
    : config.kind === "interview"
      ? "question, focus"
      : "title, question, topic, description, constraints (array), example, hints (array)";
  const exclusions = config.kind === "interview" && config.excludedQuestions.length
    ? ` Do not repeat or closely paraphrase these recently asked questions: ${JSON.stringify(config.excludedQuestions)}.`
    : "";
  const adaptiveContext = config.kind === "interview" && config.previousAnswer
    ? ` This is a live interview follow-up. Previous question: ${JSON.stringify(config.previousQuestion)}. Candidate answer: ${JSON.stringify(config.previousAnswer)}. Ask a natural next question that probes a specific claim, missing detail, trade-off, or relevant deeper skill from that answer. Do not praise, evaluate, or reveal an ideal answer.`
    : "";
  return `Generate ${config.count} distinct ${config.difficulty} ${config.kind} questions for PrepMentor. Category: ${config.category}. Role: ${config.role}. Programming language: ${config.language}. Start catalog position: ${config.offset + 1}. Favor common placement and interview questions, avoid duplicates, and return ONLY a JSON array.${adaptiveContext}${exclusions} Each object must contain: ${format}.`;
}

export function isLlmConfigured() {
  return Boolean(process.env.LLM_API_KEY);
}

export async function generateQuestions(value) {
  const config = normalizeGenerationRequest(value);
  if (!isLlmConfigured()) {
    const error = new Error("LLM generation is not configured. Set LLM_API_KEY on the backend.");
    error.status = 503;
    throw error;
  }
  const baseUrl = (process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.LLM_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || "gpt-4.1-mini",
      temperature: 0.8,
      max_tokens: 12000,
      messages: [
        { role: "system", content: "You create accurate assessment content and output strict JSON only." },
        { role: "user", content: promptFor(config) },
      ],
    }),
    signal: AbortSignal.timeout(80000),
  });
  if (!response.ok) throw new Error(`The configured LLM returned status ${response.status}.`);
  const payload = await response.json();
  const questions = validateQuestions(extractJson(payload.choices?.[0]?.message?.content), config);
  if (questions.length !== config.count) throw new Error("The model returned fewer questions than requested.");
  return { questions, source: "llm", catalogSize: config.kind === "coding" ? 1000 : null };
}

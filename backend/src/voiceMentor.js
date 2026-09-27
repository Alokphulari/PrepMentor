import { interviewCompletion } from "./ai/interviewProvider.js";
import { validateSchema } from "./ai/interviewSchemas.js";

const intents = ["aptitude", "placement", "coding", "interview", "resume", "performance", "history", "learning", "dashboard", "help", "none"];
const voiceMentorSchema = {
  type: "object",
  properties: {
    reply: { type: "string" },
    intent: { type: "string", enum: intents },
  },
  required: ["reply", "intent"],
  additionalProperties: false,
};

function text(value, fallback, limit) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") throw new Error("Voice mentor fields must be text values.");
  return value.trim().slice(0, limit) || fallback;
}

export function normalizeVoiceMentorRequest(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Voice mentor request must be an object.");
  const context = payload.context && typeof payload.context === "object" && !Array.isArray(payload.context) ? payload.context : {};
  return {
    message: text(payload.message, "", 600),
    context: {
      path: text(context.path, "/dashboard", 160),
      role: text(context.role, "", 120),
      name: text(context.name, "", 80),
    },
  };
}

export function normalizeVoiceMentorResponse(value) {
  validateSchema(value, voiceMentorSchema);
  return { reply: value.reply.trim().slice(0, 1000), intent: value.intent };
}

export async function voiceMentorReply(payload, generate = interviewCompletion) {
  const request = normalizeVoiceMentorRequest(payload);
  if (!request.message) throw new Error("Tell me what you would like to do.");
  return generate(
    "You are PrepMentor's concise, friendly voice mentor. Help the authenticated learner navigate this career preparation app. Answer in one or two natural sentences suitable for speech. Choose exactly one intent from aptitude, placement, coding, interview, resume, performance, history, learning, dashboard, help, or none. Use an app intent only when the learner clearly wants that module. Never claim an action is complete; say what the app can open next. If the request is unclear, use help or none. Do not give exam answers, bypass proctoring, or request secrets.",
    request,
    normalizeVoiceMentorResponse,
    { schema: voiceMentorSchema, timeoutMs: 12000, retries: 0 },
  );
}


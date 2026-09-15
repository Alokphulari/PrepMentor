import http from "node:http";
import { pathToFileURL } from "node:url";
import { appendHistory, authenticate, getHistory, login, publicUser, register, revokeSession, saveProfile } from "./auth.js";
import { getPlacementState, savePlacementState } from "./placement.js";
import { getResume, saveResume } from "./resume.js";
import { getInterviewResult, saveInterviewResult } from "./interviewResults.js";
import { createRateLimiter } from "./rateLimit.js";
import { generateQuestions, isLlmConfigured } from "./questionGenerator.js";
import { synthesizeSpeech, transcribeSpeech } from "./speechTranscription.js";
import { evaluateInterviewSemantically } from "./interviewEvaluator.js";
import { reviewCode } from "./codeReviewer.js";

const port = Number(process.env.PORT) || 4000;
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

function commonHeaders() {
  return {
    "Access-Control-Allow-Origin": clientOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
    "Access-Control-Max-Age": "600",
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    Vary: "Origin",
  };
}

function send(response, status, payload, headers = {}) {
  response.writeHead(status, {
    ...commonHeaders(),
    "Content-Type": "application/json; charset=utf-8",
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

function redirect(response, location) {
  response.writeHead(302, {
    ...commonHeaders(),
    Location: location,
  });
  response.end();
}

async function readJson(request, maximumSize = 1_000_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maximumSize) throw new Error("Request body is too large.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function interviewText(value, fallback, limit) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") throw new Error("Interview configuration must contain text values.");
  return value.trim().slice(0, limit) || fallback;
}

function evaluateInterview(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Interview payload must be an object.");
  }
  const { config = {}, questions = [], answers = {} } = payload;
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("Interview configuration must be an object.");
  }
  if (!Array.isArray(questions) || questions.length === 0 || questions.length > 20) {
    throw new Error("Interview sessions require between 1 and 20 questions.");
  }
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    throw new Error("Interview answers must be an object.");
  }
  const wordCounts = questions.map((_, index) =>
    String(answers[index] || "").slice(0, 10_000).trim().split(/\s+/).filter(Boolean).length
  );
  const answered = wordCounts.filter((count) => count >= 20).length;
  const completion = clamp((answered / questions.length) * 100);
  const depth = clamp(
    (wordCounts.reduce((sum, count) => sum + Math.min(count, 80), 0) /
      questions.length) *
      1.25
  );
  const score = clamp(completion * 0.65 + depth * 0.35);
  const interviewTypes = new Set(["Technical", "Behavioral", "Mixed"]);
  const requestedType = interviewText(config.interviewType, "Mixed", 40);
  return {
    score,
    role: interviewText(config.role, "Software Engineer", 160),
    type: interviewTypes.has(requestedType) ? requestedType : "Mixed",
    metrics: {
      communication: clamp(depth * 0.9 + completion * 0.1),
      technical: clamp(score * 0.92),
      problemSolving: clamp(score * 0.96),
      confidence: completion,
    },
  };
}

async function handleRequest(request, response, checkAuthRateLimit, checkGenerationRateLimit) {
  if (request.method === "OPTIONS") return send(response, 204, {});
  if (request.method === "GET" && request.url === "/") {
    return redirect(response, clientOrigin);
  }
  if (request.method === "GET" && request.url === "/api") {
    return send(response, 200, {
      name: "PrepMentor API",
      status: "running",
      frontend: clientOrigin,
      health: "/api/health",
    });
  }
  if (request.method === "GET" && request.url === "/api/health") {
    return send(response, 200, { status: "ok", service: "prepmentor-backend", questionGeneration: isLlmConfigured() ? "llm" : "offline", speech: isLlmConfigured() ? "ai" : "browser-only", timestamp: new Date().toISOString() });
  }
  if (request.method === "POST" && request.url === "/api/questions/generate") {
    const user = await authenticate(request);
    if (!user) return send(response, 401, { message: "Authentication required." });
    const rateLimit = checkGenerationRateLimit(user.id);
    if (!rateLimit.allowed) {
      return send(response, 429, { message: "Question generation limit reached. Use the offline catalog or try again later." }, {
        "Retry-After": String(rateLimit.retryAfter),
        "X-RateLimit-Remaining": "0",
      });
    }
    try {
      return send(response, 200, await generateQuestions(await readJson(request)), {
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      });
    } catch (error) {
      return send(response, error.status || 502, { message: error.message || "Unable to generate questions." });
    }
  }
  if (request.method === "POST" && request.url === "/api/code/review") {
    const user = await authenticate(request);
    if (!user) return send(response, 401, { message: "Authentication required." });
    const rateLimit = checkGenerationRateLimit(`code-review:${user.id}`);
    if (!rateLimit.allowed) {
      return send(response, 429, { message: "AI code review limit reached. Use static checks or try again later." }, {
        "Retry-After": String(rateLimit.retryAfter),
        "X-RateLimit-Remaining": "0",
      });
    }
    try {
      return send(response, 200, await reviewCode(await readJson(request)), {
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      });
    } catch (error) {
      return send(response, error.status || 400, { message: error.message || "Unable to review code." });
    }
  }
  if (request.method === "POST" && request.url === "/api/speech/transcribe") {
    const user = await authenticate(request);
    if (!user) return send(response, 401, { message: "Authentication required." });
    try {
      return send(response, 200, await transcribeSpeech(await readJson(request, 8_500_000)));
    } catch (error) {
      return send(response, error.status || 400, { message: error.message || "Unable to transcribe audio." });
    }
  }
  if (request.method === "POST" && request.url === "/api/speech/synthesize") {
    const user = await authenticate(request);
    if (!user) return send(response, 401, { message: "Authentication required." });
    try {
      return send(response, 200, await synthesizeSpeech(await readJson(request)));
    } catch (error) {
      return send(response, error.status || 400, { message: error.message || "Unable to synthesize speech." });
    }
  }
  if (request.method === "POST" && ["/api/auth/register", "/api/auth/login"].includes(request.url)) {
    const clientAddress = request.socket.remoteAddress || "unknown";
    const rateLimit = checkAuthRateLimit(`${clientAddress}:${request.url}`);
    if (!rateLimit.allowed) {
      return send(response, 429, { message: "Too many authentication attempts. Please try again later." }, {
        "Retry-After": String(rateLimit.retryAfter),
        "X-RateLimit-Remaining": "0",
      });
    }
  }
  if (request.method === "POST" && request.url === "/api/auth/register") {
    try {
      return send(response, 201, await register(await readJson(request)));
    } catch (error) {
      return send(response, error.status || 400, { message: error.message });
    }
  }
  if (request.method === "POST" && request.url === "/api/auth/login") {
    try {
      return send(response, 200, await login(await readJson(request)));
    } catch (error) {
      return send(response, error.status || 400, { message: error.message });
    }
  }
  if (request.method === "GET" && request.url === "/api/auth/me") {
    const user = await authenticate(request);
    return user ? send(response, 200, { user: publicUser(user) }) : send(response, 401, { message: "Authentication required." });
  }
  if (request.method === "POST" && request.url === "/api/auth/logout") {
    revokeSession(request);
    return send(response, 200, { message: "Signed out successfully." });
  }
  if (request.method === "PATCH" && request.url === "/api/profile") {
    const user = await authenticate(request);
    if (!user) return send(response, 401, { message: "Authentication required." });
    try {
      return send(response, 200, { user: await saveProfile(user.id, await readJson(request)) });
    } catch (error) {
      return send(response, 400, { message: error.message || "Unable to save profile." });
    }
  }
  if (request.method === "GET" && request.url === "/api/history") {
    const user = await authenticate(request);
    return user ? send(response, 200, { history: await getHistory(user.id) }) : send(response, 401, { message: "Authentication required." });
  }
  if (request.method === "POST" && request.url === "/api/history") {
    let entry;
    try {
      entry = await readJson(request);
    } catch (error) {
      return send(response, 400, { message: error.message || "Invalid history payload." });
    }
    const user = await authenticate(request);
    if (!user) return send(response, 401, { message: "Authentication required." });
    try {
      return send(response, 201, { entry: await appendHistory(user.id, entry) });
    } catch (error) {
      return send(response, 400, { message: error.message || "Unable to save history." });
    }
  }
  if (request.method === "GET" && request.url === "/api/placement") {
    const user = await authenticate(request);
    return user ? send(response, 200, { placementState: await getPlacementState(user.id) }) : send(response, 401, { message: "Authentication required." });
  }
  if (request.method === "PUT" && request.url === "/api/placement") {
    const user = await authenticate(request);
    if (!user) return send(response, 401, { message: "Authentication required." });
    try {
      return send(response, 200, { placementState: await savePlacementState(user.id, await readJson(request)) });
    } catch (error) {
      return send(response, 400, { message: error.message || "Unable to save Placement progress." });
    }
  }
  if (request.method === "GET" && request.url === "/api/resume") {
    const user = await authenticate(request);
    return user ? send(response, 200, { resume: await getResume(user.id) }) : send(response, 401, { message: "Authentication required." });
  }
  if (request.method === "PUT" && request.url === "/api/resume") {
    const user = await authenticate(request);
    if (!user) return send(response, 401, { message: "Authentication required." });
    try {
      return send(response, 200, { resume: await saveResume(user.id, await readJson(request)) });
    } catch (error) {
      return send(response, 400, { message: error.message || "Unable to save resume." });
    }
  }
  if (request.method === "POST" && request.url === "/api/interviews/evaluate") {
    const user = await authenticate(request);
    if (!user) return send(response, 401, { message: "Authentication required." });
    try {
      const payload = await readJson(request);
      const rubric = evaluateInterview(payload);
      const evaluation = await evaluateInterviewSemantically(payload, rubric);
      const result = await saveInterviewResult(user.id, evaluation, `${Math.max(1, Math.min(180, Number(payload.config?.duration) || 30))} min`);
      return send(response, 200, {
        result,
      });
    } catch (error) {
      return send(response, 400, { message: error.message || "Invalid interview payload." });
    }
  }
  if (request.method === "GET" && request.url.startsWith("/api/interviews/")) {
    const user = await authenticate(request);
    if (!user) return send(response, 401, { message: "Authentication required." });
    const resultId = decodeURIComponent(request.url.slice("/api/interviews/".length));
    const result = await getInterviewResult(user.id, resultId);
    return result
      ? send(response, 200, { result })
      : send(response, 404, { message: "Interview result not found." });
  }
  return send(response, 404, { message: "API route not found." });
}

export function createAppServer() {
  const checkAuthRateLimit = createRateLimiter();
  const checkGenerationRateLimit = createRateLimiter({ limit: 20, windowMs: 60 * 60 * 1000 });
  return http.createServer((request, response) => {
    handleRequest(request, response, checkAuthRateLimit, checkGenerationRateLimit).catch((error) => {
      console.error("Unhandled API request error:", error);
      if (!response.headersSent) {
        send(response, 500, { message: "The server could not complete this request." });
      } else {
        response.destroy();
      }
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createAppServer().listen(port, () => {
    console.log(`PrepMentor API listening on http://localhost:${port}`);
  });
}

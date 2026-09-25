import { interviewHealth } from "../services/interviewAIService.js";
import { interviewConfigured, interviewProviderConfig } from "./ai/interviewProvider.js";
import { googleLogin } from "./auth.js";
import { databaseStatus } from "./userStore.js";
import { isConfigured } from "./ai/aiClient.js";
import { startInterviewSession, getInterviewSession, answerInterviewSession, completeInterviewRemediation } from "./interviewSessions.js";
import { publicCodingProblems, runCode, completeCodingRemediation } from "./codingAssessment.js";
import { analyzeResume, getSkillBaseline } from "./resumeAnalysis.js";
import { personalizedPlan } from "./personalization.js";
import http from "node:http";
import { pathToFileURL } from "node:url";
import { appendHistory, authenticate, getHistory, login, publicUser, register, revokeSession, saveProfile } from "./auth.js";
import { getPlacementState, savePlacementState } from "./placement.js";
import { getResume, saveResume } from "./resume.js";
import { getInterviewResult, saveInterviewResult } from "./interviewResults.js";
import { createRateLimiter } from "./rateLimit.js";
import { generateQuestions, isLlmConfigured } from "./questionGenerator.js";
import { synthesizeSpeech, transcribeSpeech, speechConfigured } from "./speechTranscription.js";
import { evaluateInterviewSemantically } from "./interviewEvaluator.js";
import { reviewCode } from "./codeReviewer.js";
import { analyzePerformance } from "./performanceAnalysis.js";
import { startAptitude, submitAptitude, finalPlacementReport } from "./placementAssessments.js";

const port = Number(process.env.PORT) || 4000;
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

function commonHeaders(origin) {
  const localOrigins = ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"];
  const allowedOrigin = process.env.NODE_ENV !== "production" && localOrigins.includes(origin) ? origin : clientOrigin;
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
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
    ...commonHeaders(response.req?.headers.origin),
    "Content-Type": "application/json; charset=utf-8",
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

function redirect(response, location) {
  response.writeHead(302, {
    ...commonHeaders(response.req?.headers.origin),
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
  const interviewTypes = new Set(["Technical", "Behavioral", "Mixed"]);
  const requestedType = interviewText(config.interviewType, "Mixed", 40);
  return {
    role: interviewText(config.role, "Software Engineer", 160),
    type: interviewTypes.has(requestedType) ? requestedType : "Mixed",

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
  if (request.method === "GET" && request.url === "/api/interview/health") return send(response, 200, interviewHealth());
  if (request.method === "GET" && request.url === "/api/health") {
    const database = await databaseStatus();
    return send(response, database === "unavailable" ? 503 : 200, { database, interview: { ...interviewHealth(), provider: interviewProviderConfig().provider, llm: interviewConfigured(), stt: speechConfigured("stt"), tts: speechConfigured("tts") }, llm: isConfigured(), stt: speechConfigured("stt"), tts: speechConfigured("tts"), codeExecution: Boolean(process.env.JUDGE0_BASE_URL), googleAuth: Boolean(process.env.GOOGLE_CLIENT_ID), googleClientId: process.env.GOOGLE_CLIENT_ID || null, status: database === "unavailable" ? "degraded" : "ok", service: "prepmentor-backend", questionGeneration: isLlmConfigured() ? "llm" : "offline", speech: speechConfigured("stt") || speechConfigured("tts") ? "ai" : "browser-only", timestamp: new Date().toISOString() });
  }
  const sessionMatch = request.url.match(/^\/api\/interview-sessions\/([a-zA-Z0-9-]+)(\/answer)?$/);
  const featurePaths = ["/api/interview-remediation","/api/interview-sessions", "/api/code/problems", "/api/code/run", "/api/code/submit", "/api/code/remediation", "/api/resume/analyze", "/api/baseline", "/api/learning/plan", "/api/career-roadmap", "/api/career-roadmap/generate"];
  if (featurePaths.includes(request.url) || ["/api/performance/analyze", "/api/placement/aptitude/start", "/api/placement/aptitude/submit", "/api/placement/report"].includes(request.url) || sessionMatch) {
    const user = await authenticate(request);
    if (!user) return send(response, 401, { message: "Authentication required." });
    if (request.method === "POST" || ["/api/learning/plan", "/api/career-roadmap", "/api/career-roadmap/generate"].includes(request.url)) {
      const rate = checkGenerationRateLimit(request.url + ":" + user.id);
      if (!rate.allowed) return send(response, 429, { message: "Request limit reached. Try again later." }, { "Retry-After": String(rate.retryAfter) });
    }
    try {
      if (request.method === "POST" && request.url === "/api/performance/analyze") return send(response, 200, { analysis: await analyzePerformance(user.id) });
      if (request.method === "POST" && request.url === "/api/placement/aptitude/start") return send(response, 200, await startAptitude(user.id, await readJson(request)));
      if (request.method === "POST" && request.url === "/api/placement/aptitude/submit") return send(response, 200, await submitAptitude(user.id, await readJson(request)));
      if (request.method === "GET" && request.url === "/api/placement/report") return send(response, 200, await finalPlacementReport(user.id));
      if (request.method === "POST" && request.url === "/api/interview-remediation") return send(response, 200, {placementState:await completeInterviewRemediation(user.id,await readJson(request))});
      if (request.method === "GET" && request.url === "/api/code/problems") return send(response, 200, { problems: publicCodingProblems() });
      if (request.method === "GET" && request.url === "/api/baseline") return send(response, 200, await getSkillBaseline(user.id));
      if (request.method === "POST" && request.url === "/api/resume/analyze") return send(response, 200, { analysis: await analyzeResume(user.id, await readJson(request, 7200000)) });
      if (["GET", "POST"].includes(request.method) && ["/api/learning/plan", "/api/career-roadmap", "/api/career-roadmap/generate"].includes(request.url)) return send(response, 200, { plan: await personalizedPlan(user.id, request.url.startsWith("/api/career-roadmap") ? "roadmap" : "learning", request.method === "POST") });
      if (request.method === "POST" && ["/api/code/run", "/api/code/submit"].includes(request.url)) return send(response, 200, await runCode(user.id, await readJson(request, 100000), request.url.endsWith("submit")));
      if (request.method === "POST" && request.url === "/api/code/remediation") return send(response, 200, { placementState: await completeCodingRemediation(user.id, await readJson(request)) });
      if (request.method === "POST" && request.url === "/api/interview-sessions") return send(response, 201, { session: await startInterviewSession(user.id, await readJson(request)) });
      if (sessionMatch && request.method === "GET" && !sessionMatch[2]) return send(response, 200, { session: await getInterviewSession(user.id, sessionMatch[1]) });
      if (sessionMatch && request.method === "POST" && sessionMatch[2]) return send(response, 200, { session: await answerInterviewSession(user.id, sessionMatch[1], await readJson(request)) });
      return send(response, 405, { message: "Method not allowed." });
    } catch (error) { return send(response, error.status || 400, { code: error.code, message: error.status === 500 ? "Storage is unavailable." : error.message || "Unable to complete this request." }); }
  }
  if (request.method === "POST" && request.url === "/api/auth/google") {
    const rate = checkAuthRateLimit("google:" + request.socket.remoteAddress);
    if (!rate.allowed) return send(response, 429, { message: "Too many sign-in attempts." });
    try { return send(response, 200, await googleLogin(await readJson(request))); }
    catch (error) { return send(response, error.status || 400, { message: error.message }); }
  }
  if (request.method === "POST" && ["/api/speech/transcribe", "/api/speech/synthesize", "/api/interviews/evaluate"].includes(request.url)) {
    const user = await authenticate(request);
    if (!user) return send(response, 401, { message: "Authentication required." });
    const rate = checkGenerationRateLimit(request.url + ":" + user.id);
    if (!rate.allowed) return send(response, 429, { message: "AI request limit reached. Try again later." }, { "Retry-After": String(rate.retryAfter) });
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
      // This legacy endpoint accepts client questions, not trusted stored turns.
      // Never let supplied scores, provider labels, or keywords become evidence.
      payload.questions = payload.questions.map((item) => ({ question: interviewText(item?.question, "Interview question", 2000) }));
      const evaluation = await evaluateInterviewSemantically(payload, rubric);
      const result = await saveInterviewResult(user.id, evaluation, `${Math.max(1, Math.min(180, Number(payload.config?.duration) || 30))} min`);
      return send(response, 200, {
        result,
      });
    } catch (error) {
      return send(response, error.status || 400, { code: error.code, message: error.message || "Invalid interview payload." });
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
  const checkGenerationRateLimit = createRateLimiter({ limit: 120, windowMs: 60 * 60 * 1000 });
  return http.createServer((request, response) => {
    handleRequest(request, response, checkAuthRateLimit, checkGenerationRateLimit).catch((error) => {
      console.error("API request failed:", error.status || 500);
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

import { findUserById } from "../src/userStore.js";
import { geminiMock } from "./helpers/geminiMock.js";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createAppServer } from "../src/server.js";

let server;
let baseUrl;
let testDirectory;

before(async () => {
  testDirectory = await mkdtemp(join(tmpdir(), "prepmentor-api-"));
  process.env.PREPMENTOR_DATA_FILE = join(testDirectory, "users.json");
  server = createAppServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await rm(testDirectory, { recursive: true, force: true });
  delete process.env.PREPMENTOR_DATA_FILE;
});

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const body = await response.json();
  return { response, body };
}

test("health endpoint reports service readiness", async () => {
  const { response, body } = await request("/api/health");
  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
  assert.equal(body.service, "prepmentor-backend");
  assert.ok(["llm", "offline"].includes(body.questionGeneration));
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.match(response.headers.get("content-security-policy"), /default-src 'none'/);
});

test("CORS preflight advertises supported authenticated methods", async () => {
  const response = await fetch(`${baseUrl}/api/placement`, { method: "OPTIONS" });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:5173");
  assert.match(response.headers.get("access-control-allow-methods"), /PUT/);
  assert.match(response.headers.get("access-control-allow-headers"), /Authorization/i);
});

test("root directs browser traffic to the frontend", async () => {
  const response = await fetch(`${baseUrl}/`, { redirect: "manual" });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "http://localhost:5173");
});

test("question generation requires authentication", async () => {
  const generated = await request("/api/questions/generate", {
    method: "POST",
    body: JSON.stringify({ kind: "aptitude", count: 30 }),
  });
  assert.equal(generated.response.status, 401);
});

test("code review requires authentication", async () => {
  const reviewed = await request("/api/code/review", {
    method: "POST",
    body: JSON.stringify({ code: "return 1;", problem: "Return one", language: "JavaScript" }),
  });
  assert.equal(reviewed.response.status, 401);
});

test("speech transcription is authenticated and fails safely when unconfigured", async () => {
  const unauthenticated = await request("/api/speech/transcribe", {
    method: "POST",
    body: JSON.stringify({ audio: "YQ==", mimeType: "audio/webm" }),
  });
  assert.equal(unauthenticated.response.status, 401);

  const registered = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "Voice Student", email: "voice@example.test", password: "StrongPass123!" }),
  });
  const authorization = `Bearer ${registered.body.token}`;
  const previousKey = process.env.LLM_API_KEY;
  delete process.env.LLM_API_KEY;
  try {
    const response = await request("/api/speech/transcribe", {
      method: "POST",
      headers: { Authorization: authorization },
      body: JSON.stringify({ audio: "YQ==", mimeType: "audio/webm" }),
    });
    assert.equal(response.response.status, 503);
    assert.match(response.body.message, /not configured/i);
  } finally {
    if (previousKey) process.env.LLM_API_KEY = previousKey;
  }
});

test("speech synthesis is authenticated and fails safely when unconfigured", async () => {
  const unauthenticated = await request("/api/speech/synthesize", {
    method: "POST",
    body: JSON.stringify({ input: "Tell me about yourself." }),
  });
  assert.equal(unauthenticated.response.status, 401);

  const registered = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "Speech Student", email: "speech@example.test", password: "StrongPass123!" }),
  });
  const previousKey = process.env.LLM_API_KEY;
  delete process.env.LLM_API_KEY;
  try {
    const response = await request("/api/speech/synthesize", {
      method: "POST",
      headers: { Authorization: `Bearer ${registered.body.token}` },
      body: JSON.stringify({ input: "Tell me about yourself." }),
    });
    assert.equal(response.response.status, 503);
    assert.match(response.body.message, /not configured/i);
  } finally {
    if (previousKey) process.env.LLM_API_KEY = previousKey;
  }
});

test("authentication endpoints rate-limit repeated attempts", async () => {
  const limitedServer = createAppServer();
  await new Promise((resolve) => limitedServer.listen(0, "127.0.0.1", resolve));
  const limitedAddress = limitedServer.address();
  const limitedBaseUrl = `http://127.0.0.1:${limitedAddress.port}`;
  const attempts = [];
  try {
    for (let index = 0; index < 21; index += 1) {
      const response = await fetch(`${limitedBaseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "rate-limit@example.test", password: "incorrect" }),
      });
      attempts.push({ response, body: await response.json() });
    }
  } finally {
    await new Promise((resolve, reject) => limitedServer.close((error) => error ? reject(error) : resolve()));
  }
  assert.equal(attempts[19].response.status, 401);
  assert.equal(attempts[20].response.status, 429);
  assert.ok(Number(attempts[20].response.headers.get("retry-after")) > 0);
  assert.equal(attempts[20].response.headers.get("x-ratelimit-remaining"), "0");
});

test("authentication and profile flow protects user data", async () => {
  const credentials = { name: "Test Student", email: "student@example.test", password: "StrongPass123!" };
  const registered = await request("/api/auth/register", { method: "POST", body: JSON.stringify(credentials) });
  assert.equal(registered.response.status, 201);
  assert.ok(registered.body.token);
  assert.equal(registered.body.user.email, credentials.email);
  assert.equal("passwordHash" in registered.body.user, false);

  const duplicate = await request("/api/auth/register", { method: "POST", body: JSON.stringify(credentials) });
  assert.equal(duplicate.response.status, 409);

  const rejected = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ email: credentials.email, password: "wrong-password" }) });
  assert.equal(rejected.response.status, 401);

  const loggedIn = await request("/api/auth/login", { method: "POST", body: JSON.stringify(credentials) });
  assert.equal(loggedIn.response.status, 200);
  const authorization = `Bearer ${loggedIn.body.token}`;

  const unauthenticated = await request("/api/auth/me");
  assert.equal(unauthenticated.response.status, 401);
  const current = await request("/api/auth/me", { headers: { Authorization: authorization } });
  assert.equal(current.response.status, 200);
  assert.equal(current.body.user.name, credentials.name);

  const profile = await request("/api/profile", { method: "PATCH", headers: { Authorization: authorization }, body: JSON.stringify({ targetRole: "Frontend Developer", profileCompleted: true, passwordHash: "must-not-be-written" }) });
  assert.equal(profile.response.status, 200);
  assert.equal(profile.body.user.targetRole, "Frontend Developer");
  assert.equal("passwordHash" in profile.body.user, false);

  const invalidProfile = await request("/api/profile", { method: "PATCH", headers: { Authorization: authorization }, body: JSON.stringify({ name: { unsafe: true } }) });
  assert.equal(invalidProfile.response.status, 400);

  const historyEntry = { id: "attempt-1", title: "Quantitative Aptitude", type: "Practice", score: 84, duration: "12 min", createdAt: new Date().toISOString(), topicPerformance: [{ topic: "Percentages", percentage: 64 }] };
  const savedHistory = await request("/api/history", { method: "POST", headers: { Authorization: authorization }, body: JSON.stringify(historyEntry) });
  assert.equal(savedHistory.response.status, 201);
  assert.equal(savedHistory.body.entry.score, 84);
  const duplicateHistory = await request("/api/history", { method: "POST", headers: { Authorization: authorization }, body: JSON.stringify(historyEntry) });
  assert.equal(duplicateHistory.response.status, 201);
  const history = await request("/api/history", { headers: { Authorization: authorization } });
  assert.equal(history.response.status, 200);
  assert.equal(history.body.history.length, 1);
  assert.equal(history.body.history[0].id, historyEntry.id);
  assert.deepEqual(history.body.history[0].topicPerformance, historyEntry.topicPerformance);

  const safeHistoryDate = await request("/api/history", { method: "POST", headers: { Authorization: authorization }, body: JSON.stringify({ title: "Logical Reasoning", type: "Practice", score: 140, createdAt: "not-a-date" }) });
  assert.equal(safeHistoryDate.response.status, 201);
  assert.equal(safeHistoryDate.body.entry.score, 100);
  assert.equal(Number.isFinite(Date.parse(safeHistoryDate.body.entry.createdAt)), true);

  const concurrentResponses = await Promise.all(Array.from({ length: 10 }, (_, index) => request("/api/history", {
    method: "POST",
    headers: { Authorization: authorization },
    body: JSON.stringify({ id: `concurrent-${index}`, title: `Concurrent attempt ${index}`, type: "Practice", score: 70 + index }),
  })));
  assert.deepEqual(
    concurrentResponses.map(({ response, body }) => ({ status: response.status, message: body.message })),
    Array.from({ length: 10 }, () => ({ status: 201, message: undefined }))
  );
  const concurrentHistory = await request("/api/history", { headers: { Authorization: authorization } });
  assert.equal(concurrentHistory.body.history.filter((entry) => entry.id.startsWith("concurrent-")).length, 10);

  const initialPlacement = await request("/api/placement", { headers: { Authorization: authorization } });
  assert.equal(initialPlacement.response.status, 200);
  assert.equal(initialPlacement.body.placementState.aptitude.easy, "available");
  assert.equal(initialPlacement.body.placementState.coding.easy, "locked");

  const skippedPlacement = await request("/api/placement", {
    method: "PUT",
    headers: { Authorization: authorization },
    body: JSON.stringify({ coding: { easy: "available" } }),
  });
  assert.equal(skippedPlacement.response.status, 400);

  const validPlacement = await request("/api/placement", {
    method: "PUT",
    headers: { Authorization: authorization },
    body: JSON.stringify({
      aptitude: { easy: "passed", medium: "available", hard: "locked" },
      coding: { easy: "locked", medium: "locked", hard: "locked" },
      interview: { status: "locked", whiteboard: "locked" },
    }),
  });
  assert.equal(validPlacement.response.status, 400);
  const aptitude = await request("/api/placement/aptitude/start", { method: "POST", headers: { Authorization: authorization }, body: JSON.stringify({ level: "easy" }) });
  const privateSession = (await findUserById(registered.body.user.id)).aptitudeSession;
  const submitted = await request("/api/placement/aptitude/submit", { method: "POST", headers: { Authorization: authorization }, body: JSON.stringify({ sessionId: aptitude.body.id, answers: Object.fromEntries(privateSession.questions.map((q,i) => [i,q.answer])) }) });
  assert.equal(submitted.response.status, 200);
  assert.equal(submitted.body.placementState.aptitude.medium, "available");

  const jumpedPlacement = await request("/api/placement", {
    method: "PUT",
    headers: { Authorization: authorization },
    body: JSON.stringify({
      aptitude: { easy: "passed", medium: "passed", hard: "passed" },
      coding: { easy: "available", medium: "locked", hard: "locked" },
      interview: { status: "locked", whiteboard: "locked" },
    }),
  });
  assert.equal(jumpedPlacement.response.status, 400);

  const regressedPlacement = await request("/api/placement", {
    method: "PUT",
    headers: { Authorization: authorization },
    body: JSON.stringify({
      aptitude: { easy: "available", medium: "locked", hard: "locked" },
      coding: { easy: "locked", medium: "locked", hard: "locked" },
      interview: { status: "locked", whiteboard: "locked" },
    }),
  });
  assert.equal(regressedPlacement.response.status, 400);
  const unchangedPlacement = await request("/api/placement", { headers: { Authorization: authorization } });
  assert.equal(unchangedPlacement.body.placementState.aptitude.easy, "passed");
  assert.equal(unchangedPlacement.body.placementState.aptitude.medium, "available");

  const invalidResume = await request("/api/resume", {
    method: "PUT",
    headers: { Authorization: authorization },
    body: JSON.stringify([]),
  });
  assert.equal(invalidResume.response.status, 400);
  const resumeDraft = {
    name: "Test Student",
    email: credentials.email,
    summary: "Frontend developer focused on accessible product experiences.",
    skills: "React, JavaScript",
    education: [{ title: "B.Tech", subtitle: "Example University", date: "2026", description: "Computer Science" }],
    experience: [],
    projects: [{ title: "PrepMentor", subtitle: "React", date: "2026", description: "Interview preparation workspace" }],
  };
  const savedResume = await request("/api/resume", {
    method: "PUT",
    headers: { Authorization: authorization },
    body: JSON.stringify(resumeDraft),
  });
  assert.equal(savedResume.response.status, 200);
  assert.equal(savedResume.body.resume.projects[0].title, "PrepMentor");
  const loadedResume = await request("/api/resume", { headers: { Authorization: authorization } });
  assert.equal(loadedResume.response.status, 200);
  assert.equal(loadedResume.body.resume.skills, "React, JavaScript");

  const signedOut = await request("/api/auth/logout", { method: "POST", headers: { Authorization: authorization } });
  assert.equal(signedOut.response.status, 200);
  const revokedSession = await request("/api/auth/me", { headers: { Authorization: authorization } });
  assert.equal(revokedSession.response.status, 401);
});

test("interview evaluation validates input and persists semantic metrics", async (context) => {
  const originalEnv = { ...process.env };
  context.after(() => { process.env = originalEnv; });
  const credentials = { name: "Interview Student", email: "interview@example.test", password: "StrongPass123!" };
  const registered = await request("/api/auth/register", { method: "POST", body: JSON.stringify(credentials) });
  const authorization = `Bearer ${registered.body.token}`;

  const unauthenticated = await request("/api/interviews/evaluate", { method: "POST", body: "{}" });
  assert.equal(unauthenticated.response.status, 401);
  const invalid = await request("/api/interviews/evaluate", { method: "POST", headers: { Authorization: authorization }, body: "{}" });
  assert.equal(invalid.response.status, 400);
  const oversized = await request("/api/interviews/evaluate", { method: "POST", headers: { Authorization: authorization }, body: JSON.stringify({ questions: Array(21).fill({ question: "Question" }), answers: {} }) });
  assert.equal(oversized.response.status, 400);
  const malformedConfig = await request("/api/interviews/evaluate", { method: "POST", headers: { Authorization: authorization }, body: JSON.stringify({ config: { role: { unsafe: true } }, questions: [{ question: "Question" }], answers: {} }) });
  assert.equal(malformedConfig.response.status, 400);
  const localFetch = globalThis.fetch;
  const mocked = geminiMock(context);
  const providerFetch = globalThis.fetch;
  mocked.mock.restore();
  context.mock.method(globalThis, "fetch", (url, options) => String(url).includes("generativelanguage.googleapis.com") ? providerFetch(url, options) : localFetch(url, options));
  const valid = await request("/api/interviews/evaluate", {
    method: "POST",
    headers: { Authorization: authorization },
    body: JSON.stringify({
      config: { role: "Frontend Developer", interviewType: "Technical" },
      questions: [{ question: "Explain rendering." }],
      answers: { 0: "I would begin by measuring the render path with profiling tools, isolate the component updates, verify state ownership, and then optimize only the measured bottleneck." },
    }),
  });
  assert.equal(valid.response.status, 200);
  assert.equal(valid.body.result.role, "Frontend Developer");
  assert.ok(valid.body.result.id);
  assert.equal(typeof valid.body.result.metrics.communication, "number");

  const loaded = await request(`/api/interviews/${valid.body.result.id}`, { headers: { Authorization: authorization } });
  assert.equal(loaded.response.status, 200);
  assert.equal(loaded.body.result.id, valid.body.result.id);
  assert.equal(loaded.body.result.evaluationMode, "AI semantic interview evaluation");
  const interviewHistory = await request("/api/history", { headers: { Authorization: authorization } });
  const savedInterviewAttempt = interviewHistory.body.history.find((entry) => entry.id === valid.body.result.id);
  assert.ok(savedInterviewAttempt.topicPerformance.some((item) => item.topic === "Communication"));
  assert.ok(savedInterviewAttempt.topicPerformance.every((item) => item.percentage >= 0 && item.percentage <= 100));
  assert.equal(savedInterviewAttempt.type, "Interview");
  assert.equal(savedInterviewAttempt.score, valid.body.result.score);

  const otherAccount = await request("/api/auth/register", { method: "POST", body: JSON.stringify({ name: "Other Student", email: "other@example.test", password: "StrongPass123!" }) });
  const privateResult = await request(`/api/interviews/${valid.body.result.id}`, { headers: { Authorization: `Bearer ${otherAccount.body.token}` } });
  assert.equal(privateResult.response.status, 404);

  const missing = await request("/api/interviews/missing-result", { headers: { Authorization: authorization } });
  assert.equal(missing.response.status, 404);
});

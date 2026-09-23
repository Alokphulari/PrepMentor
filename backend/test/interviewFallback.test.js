import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { withInterviewFallback } from "../services/interviewAIService.js";
import { questionBank, generateQuestion, evaluateAnswer } from "../services/localInterviewService.js";
import { startInterviewSession, answerInterviewSession, getInterviewSession, nextInterviewQuestion } from "../src/interviewSessions.js";
import { createUser, findUserById } from "../src/userStore.js";
import { createAppServer } from "../src/server.js";
import { speechConfigured, synthesizeSpeech, transcribeSpeech } from "../src/speechTranscription.js";
import { geminiMock } from "./helpers/geminiMock.js";

test("bank coverage, unique IDs, fields and adaptive role/focus selection", () => {
  const minimums = { Frontend: 20, JavaScript: 20, React: 20, HTML: 8, CSS: 7, MERN: 20, "Node.js": 8, Express: 7, MongoDB: 15, DBMS: 15, OOP: 15, "Operating Systems": 10, "Computer Networks": 10, HR: 10, Behavioral: 10, Project: 15, "Problem Solving": 10 };
  for (const [category, count] of Object.entries(minimums)) assert.ok(questionBank.filter((item) => item.category === category).length >= count, category);
  assert.equal(new Set(questionBank.map((item) => item.id)).size, questionBank.length);
  assert.equal(new Set(questionBank.map((item) => item.question)).size, questionBank.length);
  questionBank.forEach((item) => {
    assert.ok(item.role && item.question && item.keywords.length && item.followUps.length);
    assert.ok(["easy", "medium", "hard"].includes(item.difficulty));
  });
  const config = { role: "Frontend Developer", difficulty: "medium", interviewType: "Technical", focusAreas: ["React"] };
  const first = generateQuestion(config);
  assert.equal(first.category, "React");
  assert.equal(first.difficulty, "medium");
  const strong = generateQuestion(config, [{ ...first, answerEvaluation: { score: 90 } }]);
  assert.equal(strong.difficulty, "hard");
  const weak = generateQuestion(config, [{ ...first, answerEvaluation: { score: 20 } }]);
  assert.equal(weak.difficulty, "easy");
  assert.equal(weak.isFollowUp, true);
  assert.notEqual(weak.question, first.question);
  assert.ok(["HR", "Behavioral"].includes(generateQuestion({ interviewType: "Behavioral" }).category));
  const unrelated = evaluateAnswer({ ...first, transcript: "banana ".repeat(200) });
  assert.equal(unrelated.technicalScore, 0);
  assert.equal(unrelated.relevanceScore, 0);
  assert.ok(unrelated.overallScore < 30);
  const relevant = evaluateAnswer({ ...first, transcript: `${first.keywords.join(" ")} because this example explains the result. `.repeat(8) });
  assert.ok(relevant.overallScore > unrelated.overallScore);
});

test("provider deadline, one retry, recovery and safe diagnostics", async (context) => {
  const logs = context.mock.method(console, "warn", () => {});
  const saved = process.env.INTERVIEW_DEMO_MODE;
  delete process.env.INTERVIEW_DEMO_MODE;
  try {
    for (const status of [429, 500, 502, 503, 504]) {
      let calls = 0;
      const result = await withInterviewFallback(async () => { calls++; throw Object.assign(new Error("secret-key-must-not-leak"), { status }); }, () => ({ question: "Local question" }), { configured: true, retryDelayMs: 1 });
      assert.equal(calls, 2);
      assert.equal(result.provider, "local");
      assert.equal(result.success, true);
    }
    for (const error of [new TypeError("network failed"), Object.assign(new Error("invalid JSON"), { code: "AI_INVALID_RESPONSE" })]) {
      let calls = 0;
      await withInterviewFallback(async () => { calls++; throw error; }, () => ({}), { configured: true, retryDelayMs: 1 });
      assert.equal(calls, 2);
    }
    let calls = 0;
    const recovered = await withInterviewFallback(async () => { if (++calls === 1) throw { status: 503 }; return { question: "Recovered" }; }, () => assert.fail("unnecessary fallback"), { configured: true, retryDelayMs: 1 });
    assert.equal(calls, 2);
    assert.equal(recovered.fallbackUsed, false);
    let signal;
    const started = Date.now();
    const timeout = await withInterviewFallback((limits) => { signal = limits.signal; return new Promise(() => {}); }, () => ({ question: "Still usable" }), { configured: true, timeoutMs: 30 });
    assert.equal(timeout.provider, "local");
    assert.ok(signal.aborted);
    assert.ok(Date.now() - started < 500);
    assert.ok(!JSON.stringify(logs.mock.calls).includes("secret-key-must-not-leak"));
  } finally {
    if (saved === undefined) delete process.env.INTERVIEW_DEMO_MODE; else process.env.INTERVIEW_DEMO_MODE = saved;
  }
});

test("missing keys, disabled provider and demo mode each complete a persisted 20-question interview without external calls", async (context) => {
  const env = { ...process.env };
  const directory = await mkdtemp(join(tmpdir(), "prepmentor-fallback-"));
  try {
    process.env.PREPMENTOR_DATA_FILE = join(directory, "users.json");
    delete process.env.MONGODB_URI; delete process.env.NODE_ENV;
    context.mock.method(globalThis, "fetch", () => assert.fail("No external calls allowed"));
    for (const mode of ["missing-key", "disabled", "demo"]) {
      process.env.INTERVIEW_DEMO_MODE = String(mode === "demo");
      process.env.INTERVIEW_AI_PROVIDER = mode === "disabled" ? "disabled" : "gemini";
      process.env.GEMINI_API_KEY = mode === "missing-key" ? "" : "test-only";
      await createUser({ id: mode, email: `${mode}@example.test` });
      let session = await startInterviewSession(mode, { role: "Frontend Developer", focusAreas: ["React", "JavaScript"], difficulty: "medium" });
      const startedAt = session.startedAt;
      const questions = new Set();
      for (let index = 0; index < 20; index++) {
        assert.equal(session.providerUsed, "local");
        assert.ok(!questions.has(session.currentQuestion.question));
        questions.add(session.currentQuestion.question);
        session = await answerInterviewSession(mode, session.id, { turnIndex: index, version: session.version, transcript: `${session.currentQuestion.keywords.join(" ")} because this example explains the result. `.repeat(8) });
        session = await getInterviewSession(mode, session.id);
        assert.equal(session.turns.length, index + 1);
        assert.equal(session.startedAt, startedAt);
      }
      assert.equal(session.status, "completed");
      assert.equal(session.answers.length, 20);
      assert.equal(session.scores.length, 20);
      assert.equal(session.questionsAsked.length, 20);
      assert.equal(session.result.questionFeedback.length, 20);
      assert.equal(session.result.provider, "local");
      assert.ok(Number.isFinite(session.result.metrics.answerRelevance));
      assert.ok(session.result.strengths.length && session.result.recommendations.length);
      assert.equal((await findUserById(mode)).history.length, 1);
      assert.equal((await answerInterviewSession(mode, session.id, {})).result.id, session.result.id);
    }
    assert.equal(speechConfigured("stt"), false);
    assert.equal(speechConfigured("tts"), false);
    await assert.rejects(transcribeSpeech({}), { status: 503 });
    await assert.rejects(synthesizeSpeech({ input: "Question" }), { status: 503 });
  } finally { process.env = env; await rm(directory, { recursive: true, force: true }); }
});

test("Gemini works initially, then quota failure switches once and preserves questions and answers", async (context) => {
  const env = { ...process.env };
  const directory = await mkdtemp(join(tmpdir(), "prepmentor-mixed-"));
  try {
    process.env.PREPMENTOR_DATA_FILE = join(directory, "users.json");
    delete process.env.MONGODB_URI; delete process.env.NODE_ENV; delete process.env.INTERVIEW_DEMO_MODE;
    const provider = geminiMock(context);
    await createUser({ id: "mixed", email: "mixed@example.test" });
    let session = await startInterviewSession("mixed", {});
    assert.equal(session.currentQuestion.provider, "gemini");
    session = await answerInterviewSession("mixed", session.id, { turnIndex: 0, transcript: "First answer" });
    const first = session.turns[0];
    provider.mock.mockImplementation(async () => new Response(JSON.stringify({ error: { code: 429, message: "Quota exceeded" } }), { status: 429 }));
    const before = provider.mock.callCount();
    session = await answerInterviewSession("mixed", session.id, { turnIndex: 1, transcript: "Preserve this answer" });
    assert.equal(provider.mock.callCount() - before, 2);
    assert.equal(session.fallbackUsed, true);
    assert.deepEqual(session.turns[0], first);
    assert.equal(session.turns[1].transcript, "Preserve this answer");
    provider.mock.mockImplementation(() => assert.fail("Session must stay local"));
    session = await answerInterviewSession("mixed", session.id, { turnIndex: 2, transcript: "Final answer", finish: true });
    assert.equal(session.result.provider, "local");
    assert.equal(session.result.questionFeedback[0].provider, "gemini");
    assert.equal(session.result.questionFeedback[1].provider, "local");
    assert.equal(session.status, "completed");
  } finally { process.env = env; await rm(directory, { recursive: true, force: true }); }
});

test("interview health is public, secret-free, and CORS supports both development ports only in development", async () => {
  const env = { ...process.env };
  const server = createAppServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/interview/health`;
  try {
    process.env.GEMINI_API_KEY = "secret-never-return";
    process.env.INTERVIEW_DEMO_MODE = "true";
    process.env.NODE_ENV = "development";
    for (const origin of ["http://localhost:5173", "http://localhost:5174"]) {
      const response = await fetch(url, { headers: { Origin: origin } });
      assert.equal(response.headers.get("access-control-allow-origin"), origin);
      const health = await response.json();
      assert.deepEqual(health, { interviewService: "ready", geminiConfigured: true, fallbackEngine: true, demoMode: true });
      assert.ok(!JSON.stringify(health).includes(process.env.GEMINI_API_KEY));
    }
    process.env.NODE_ENV = "production";
    assert.notEqual((await fetch(url, { headers: { Origin: "http://localhost:5174" } })).headers.get("access-control-allow-origin"), "http://localhost:5174");
  } finally { process.env = env; await new Promise((resolve) => server.close(resolve)); }
});

test("invalid credentials, malformed JSON, network outage and repeated Gemini questions still reach a fresh question", async (context) => {
  const env = { ...process.env };
  try {
    delete process.env.INTERVIEW_DEMO_MODE;
    process.env.INTERVIEW_AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-only";
    const provider = context.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ error: { code: 401, message: "Invalid key" } }), { status: 401 }));
    const config = { role: "Frontend Developer", difficulty: "medium" };
    assert.equal((await nextInterviewQuestion(config, [])).provider, "local");
    assert.equal(provider.mock.callCount(), 1);
    provider.mock.mockImplementation(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "not JSON" }] } }] })));
    assert.equal((await nextInterviewQuestion(config, [])).fallbackUsed, true);
    provider.mock.mockImplementation(async () => { throw new TypeError("Network unavailable"); });
    assert.equal((await nextInterviewQuestion(config, [])).fallbackUsed, true);
    const old = { question: "Explain closures", focus: "JavaScript" };
    const repeated = await nextInterviewQuestion(config, [old], async (_instruction, _data, validate) => validate(old));
    assert.equal(repeated.provider, "local");
    assert.notEqual(repeated.question, old.question);
  } finally { process.env = env; }
});

test("an unresponsive Gemini client reaches question one within the eight-second deadline", async () => {
  const env = { ...process.env };
  try {
    delete process.env.INTERVIEW_DEMO_MODE;
    process.env.INTERVIEW_AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-only";
    const started = Date.now();
    let calls = 0;
    const question = await nextInterviewQuestion({ role: "Frontend Developer", difficulty: "medium" }, [], undefined, {}, {
      client: { models: { generateContent: () => { calls++; return new Promise(() => {}); } } },
    });
    assert.equal(question.provider, "local");
    assert.equal(calls, 1);
    assert.ok(Date.now() - started >= 7800);
    assert.ok(Date.now() - started < 11000);
  } finally { process.env = env; }
});

test("local Placement preserves locks, hides assessment hints, and passes using the existing score threshold", async () => {
  const env = { ...process.env };
  const directory = await mkdtemp(join(tmpdir(), "prepmentor-local-placement-"));
  try {
    process.env.PREPMENTOR_DATA_FILE = join(directory, "users.json");
    process.env.INTERVIEW_DEMO_MODE = "true";
    delete process.env.MONGODB_URI; delete process.env.NODE_ENV;
    for (const status of ["locked", "failed", "passed", "available"]) {
      await createUser({ id: status, email: `${status}@example.test`, placementState: { interview: { status } } });
      if (status !== "available") {
        await assert.rejects(startInterviewSession(status, { mode: "placement" }), { status: 403 });
        continue;
      }
      const session = await startInterviewSession(status, { mode: "placement" });
      assert.equal(session.scores, undefined);
      assert.equal(session.currentQuestion.keywords, undefined);
      const entry = questionBank.find((item) => item.question === session.currentQuestion.question);
      const finished = await answerInterviewSession(status, session.id, { turnIndex: 0, version: 0, finish: true, transcript: `${entry.keywords.join(" ")} because this example explains the result. `.repeat(10) });
      assert.ok(finished.result.score >= 80);
      assert.equal(finished.result.provider, "local");
      assert.equal((await findUserById(status)).placementState.interview.status, "passed");
    }
  } finally { process.env = env; await rm(directory, { recursive: true, force: true }); }
});

test("legacy report endpoint never trusts client-supplied scores or provider labels during fallback", async () => {
  const env = { ...process.env };
  const directory = await mkdtemp(join(tmpdir(), "prepmentor-report-fallback-"));
  process.env.PREPMENTOR_DATA_FILE = join(directory, "users.json");
  process.env.INTERVIEW_DEMO_MODE = "true";
  delete process.env.MONGODB_URI; delete process.env.NODE_ENV;
  const server = createAppServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    const registration = await fetch(`${url}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Test Student", email: "fallback-report@example.test", password: "Test-passphrase-123!" }) });
    const { token } = await registration.json();
    assert.ok(token);
    const response = await fetch(`${url}/api/interviews/evaluate`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ config: { role: "Frontend Developer" }, questions: [{ question: "Explain closures", keywords: ["banana"], answerEvaluation: { score: 100, provider: "gemini", technicalAccuracy: 100 } }], answers: { 0: "banana banana banana" } }),
    });
    assert.equal(response.status, 200);
    const { result } = await response.json();
    assert.equal(result.provider, "local");
    assert.equal(result.questionFeedback[0].provider, "local");
    assert.equal(result.metrics.technical, 0);
    assert.ok(result.score < 30);
  } finally { await new Promise((resolve) => server.close(resolve)); process.env = env; await rm(directory, { recursive: true, force: true }); }
});

import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createUser, findUserById, mutateUser } from "../src/userStore.js";
import { startAptitude, submitAptitude, finalPlacementReport } from "../src/placementAssessments.js";
import { savePlacementState, DEFAULT_PLACEMENT_STATE } from "../src/placement.js";
import { normalizeExecution, runCode, executeTests, publicCodingProblems } from "../src/codingAssessment.js";
import { analyzePerformance } from "../src/performanceAnalysis.js";
import { reviewCode } from "../src/codeReviewer.js";
import { startInterviewSession } from "../src/interviewSessions.js";
import { EXECUTION_LANGUAGES, PROGRAM_STARTERS } from "../../frontend/src/utils/executionLanguages.js";
const env = { ...process.env };
let directory;
before(async () => {
  directory = await mkdtemp(join(tmpdir(), "prepmentor-demo-"));
  process.env.PREPMENTOR_DATA_FILE = join(directory, "users.json");
  delete process.env.MONGODB_URI; delete process.env.NODE_ENV;
  delete process.env.JUDGE0_BASE_URL; delete process.env.GEMINI_API_KEY;
  process.env.INTERVIEW_AI_PROVIDER = "gemini";
});
after(async () => { process.env = env; await rm(directory, { recursive: true, force: true }); });
async function student(id) { await createUser({ id, email: id + "@test.example", placementState: structuredClone(DEFAULT_PLACEMENT_STATE), history: [] }); }
test("aptitude hides answers, restores the session, rejects forged state, and submits exactly once", async () => {
  await student("apt");
  const session = await startAptitude("apt", { level: "easy" });
  assert.equal(session.questions.length, 30);
  assert.ok(session.questions.every((q) => !Object.hasOwn(q, "answer")));
  assert.equal((await startAptitude("apt", { level: "easy" })).id, session.id);
  await assert.rejects(startAptitude("apt", { level: "hard" }), { status: 403 });
  await assert.rejects(submitAptitude("apt", { sessionId: session.id, answers: {} }), /every question/);
  const forged = structuredClone(DEFAULT_PLACEMENT_STATE); forged.aptitude.easy = "passed"; forged.aptitude.medium = "available";
  await assert.rejects(savePlacementState("apt", forged), /server-side/);
  const privateSession = (await findUserById("apt")).aptitudeSession;
  const answers = Object.fromEntries(privateSession.questions.map((q,i) => [i,q.answer]));
  const result = await submitAptitude("apt", { sessionId: session.id, answers });
  assert.equal(result.correct, 30);
  assert.equal(result.placementState.aptitude.medium, "available");
  const repeated = await submitAptitude("apt", { sessionId: session.id, answers });
  assert.equal(repeated.entry.id, result.entry.id);
  assert.equal((await findUserById("apt")).history.length, 1);
});
test("aptitude ownership, expiry, failure, retake, and final-report gates", async () => {
  await student("fail"); await student("other");
  const session = await startAptitude("fail", { level: "easy" });
  await assert.rejects(submitAptitude("other", { sessionId: session.id, answers: {} }), { status: 404 });
  const stored = (await findUserById("fail")).aptitudeSession;
  const answers = Object.fromEntries(stored.questions.map((q,i) => [i,q.options.find((a) => a !== q.answer)]));
  const result = await submitAptitude("fail", { sessionId: session.id, answers });
  assert.equal(result.passed, false);
  assert.equal(result.placementState.coding.easy, "locked");
  await assert.rejects(finalPlacementReport("fail"), { status: 403 });
  const retry = structuredClone(result.placementState); retry.aptitude.easy = "available";
  await savePlacementState("fail", retry);
  const restarted = await startAptitude("fail", { level: "easy" });
  assert.notEqual(restarted.id, session.id);
  await mutateUser("fail", (u) => ({ aptitudeSession: { ...u.aptitudeSession, expiresAt: new Date(0).toISOString() } }));
  await assert.rejects(submitAptitude("fail", { sessionId: restarted.id, answers }), { status: 409 });
});
test("practice shortcuts and invalid interview prerequisites cannot bypass placement", async () => {
  assert.throws(() => normalizeExecution({ code: "x", language: "Python", problemId: "single-number", mode: "placement" }), { status: 403 });
  await student("bypass");
  await mutateUser("bypass", () => ({ placementState: { ...structuredClone(DEFAULT_PLACEMENT_STATE), interview: { status: "available", whiteboard: "locked" } } }));
  await assert.rejects(startInterviewSession("bypass", { mode: "placement" }), /cannot unlock/);
});
test("all editor languages have execution mappings and complete-program starters", () => {
  assert.deepEqual(Object.keys(EXECUTION_LANGUAGES), Object.keys(PROGRAM_STARTERS));
  for (const language of Object.keys(EXECUTION_LANGUAGES)) {
    assert.equal(normalizeExecution({ code: "x", language, problemId: "array-sum" }).languageId, EXECUTION_LANGUAGES[language]);
    assert.ok(publicCodingProblems().every((p) => p.languages.includes(language)));
  }
});
test("Judge0 outage and malformed results never record scores", async () => {
  await student("judge");
  const value = { code: "print(1)", language: "Python", problemId: "array-sum" };
  await assert.rejects(runCode("judge", value, true), /unavailable/);
  await assert.rejects(runCode("judge", value, true, async () => ({ passedTests: 0, totalTests: 0 })), /invalid test/);
  assert.equal((await findUserById("judge")).history.length, 0);
});
test("Judge0 uses RapidAPI auth, polls queued submissions, and decodes diagnostics", async () => {
  process.env.JUDGE0_BASE_URL = "https://judge.test";
  process.env.JUDGE0_API_KEY = "test-only";
  process.env.JUDGE0_RAPIDAPI_HOST = "judge.test";
  let polls = 0;
  const result = await executeTests(normalizeExecution({ code: "bad", language: "C", problemId: "array-sum" }), false, async (_url, options) => {
    assert.equal(options.headers["X-RapidAPI-Key"], "test-only");
    assert.equal(options.headers["X-RapidAPI-Host"], "judge.test");
    if (options.method === "POST") { assert.equal(JSON.parse(options.body).enable_network, false); return { ok: true, json: async () => ({ token: "safe-token" }) }; }
    return { ok: true, json: async () => ++polls === 1 ? { status: { id: 2 } } : { status: { id: 6 }, compile_output: Buffer.from("Syntax error").toString("base64") } };
  });
  assert.equal(result.sampleResults[0].compilation, "Syntax error");
  assert.equal(result.passedTests, 0);
  delete process.env.JUDGE0_BASE_URL;
});
test("performance analysis uses recorded evidence and recovers from invalid AI output", async () => {
  await student("analysis");
  await mutateUser("analysis", () => ({ history: [{ id: "a", type: "Aptitude", score: 40, topicPerformance: [{ topic: "Ratios", percentage: 40 }] }] }));
  const local = await analyzePerformance("analysis", async () => { throw new Error("invalid response"); });
  assert.equal(local.provider, "local"); assert.equal(local.evidence.count, 1);
  assert.ok(local.recommendations.some((s) => s.includes("Ratios")));
  const ai = await analyzePerformance("analysis", async (_instruction, evidence, validate) => {
    assert.equal(evidence.weakTopics[0].topic, "Ratios");
    return validate({ summary: "Ratios need practice.", strengths: [], recommendations: ["Practice ratios."] });
  });
  assert.equal(ai.provider, "gemini"); assert.equal(ai.fallbackUsed, false);
});
test("code review fallback does not invent execution scores", async () => {
  const result = await reviewCode({ code: "print(1)", problem: "Sum input", language: "Python" }, async () => { throw new Error("offline"); });
  assert.equal(result.provider, "local"); assert.equal(result.score, null);
  assert.match(result.mode, /not executed/);
});

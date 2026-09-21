import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { providerConfig, providerRequest, structuredCompletion } from "../src/ai/aiClient.js";
import { createUser, findUserById, mutateUser } from "../src/userStore.js";
import { createMongoRepository } from "../src/mongoRepository.js";
import { normalizeExecution, publicCodingProblems, executeTests, runCode, completeCodingRemediation } from "../src/codingAssessment.js";
import { nextInterviewQuestion, startInterviewSession, getInterviewSession, answerInterviewSession } from "../src/interviewSessions.js";
import { validateResumeUpload, validateResumeAnalysis, analyzeResume, getSkillBaseline } from "../src/resumeAnalysis.js";
import { googleLogin } from "../src/auth.js";
import { DEFAULT_PLACEMENT_STATE, savePlacementState } from "../src/placement.js";
import { normalizeAudioPayload, transcribeSpeech, synthesizeSpeech } from "../src/speechTranscription.js";
import { measuredWeakTopics } from "../src/personalization.js";

let directory;
const env = { ...process.env };
before(async () => {
  directory = await mkdtemp(join(tmpdir(), "prepmentor-features-"));
  process.env.PREPMENTOR_DATA_FILE = join(directory, "users.json");
  for (const key of ["MONGODB_URI", "OPENAI_API_KEY", "LLM_API_KEY", "OPENROUTER_API_KEY", "NODE_ENV"]) delete process.env[key];
  await createUser({ id: "student", email: "student@example.test", placementState: structuredClone(DEFAULT_PLACEMENT_STATE), history: [] });
});
after(async () => { process.env = env; await rm(directory, { recursive: true, force: true }); });

test("provider configuration separates OpenRouter LLM and OpenAI speech", () => {
  const values = { AI_PROVIDER: "openrouter", OPENROUTER_API_KEY: "router", OPENAI_API_KEY: "speech", OPENAI_LLM_MODEL: "text", OPENAI_STT_MODEL: "audio" };
  assert.equal(providerConfig("llm", values).key, "router");
  assert.equal(providerConfig("stt", values).key, "speech");
});
test("missing AI credentials never call provider", async () => {
  await assert.rejects(providerRequest("/chat/completions", { fetchImpl: () => assert.fail("must not call") }), /not configured/);
});
test("AI retries transient failures but not malformed requests", async () => {
  process.env.OPENAI_API_KEY = "test-only"; process.env.OPENAI_LLM_MODEL = "test-model";
  let calls = 0;
  await providerRequest("/chat/completions", { fetchImpl: async () => ({ ok: ++calls === 2, status: 503 }) });
  assert.equal(calls, 2);
  calls = 0;
  await assert.rejects(providerRequest("/chat/completions", { fetchImpl: async () => { calls++; return { ok: false, status: 400 }; } }));
  assert.equal(calls, 1);
  delete process.env.OPENAI_API_KEY;
});
test("provider timeout is bounded and sanitized", async () => {
  process.env.OPENAI_API_KEY = "test-only";
  await assert.rejects(providerRequest("/chat/completions", { retries: 0, timeoutMs: 5, fetchImpl: async () => { throw new DOMException("secret provider detail", "TimeoutError"); } }), /unavailable or timed out/);
  delete process.env.OPENAI_API_KEY;
});
test("malformed structured output is rejected", async () => {
  process.env.OPENAI_API_KEY = "test-only";
  await assert.rejects(structuredCompletion("JSON", {}, (value) => value, { fetchImpl: async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: "not json" } }] }) }) }));
  delete process.env.OPENAI_API_KEY;
});
test("audio rejects malformed canonical base64", () => {
  assert.throws(() => normalizeAudioPayload({ audio: "YQ", mimeType: "audio/webm" }), /base64/);
});
test("STT and TTS use configured models and validate provider responses", async (context) => {
  process.env.OPENAI_API_KEY = "test-only"; process.env.OPENAI_STT_MODEL = "stt-test"; process.env.OPENAI_TTS_MODEL = "tts-test";
  context.mock.method(globalThis, "fetch", async (url, options) => {
    if (url.endsWith("transcriptions")) { assert.equal(options.body.get("model"), "stt-test"); return { ok: true, json: async () => ({ text: "A recorded answer" }) }; }
    assert.equal(JSON.parse(options.body).model, "tts-test");
    return { ok: true, arrayBuffer: async () => Buffer.from("audio") };
  });
  assert.equal((await transcribeSpeech({ audio: Buffer.from("audio").toString("base64"), mimeType: "audio/ogg" })).transcript, "A recorded answer");
  assert.equal((await synthesizeSpeech({ input: "Question?" })).mimeType, "audio/mpeg");
  delete process.env.OPENAI_API_KEY;
});
test("adaptive context is bounded and includes recent answers and role", async () => {
  const turns = Array.from({ length: 12 }, (_, i) => ({ question: `Question ${i}`, transcript: `Answer ${i}` }));
  const result = await nextInterviewQuestion({ role: "Backend Developer" }, turns, async (instruction, data, validate) => {
    assert.match(instruction, /professional interviewer/); assert.equal(data.recentConversation.length, 6); assert.equal(data.recentConversation[5].transcript, "Answer 11");
    return validate({ question: "How did you measure query latency?", focus: "Databases" });
  });
  assert.equal(result.source, "llm");
});
test("interview sessions enforce ownership, persist turns and final fallback", async () => {
  const session = await startInterviewSession("student", { role: "Backend Developer" });
  await assert.rejects(getInterviewSession("other-user", session.id), /not found/);
  const next = await answerInterviewSession("student", session.id, { turnIndex: 0, transcript: "I used an index to reduce the number of records scanned by the query and measured latency before and after." });
  assert.equal(next.turns.length, 1); assert.ok(next.turns[0].answerEndedAt);
  await assert.rejects(answerInterviewSession("student", session.id, { turnIndex: 0, transcript: "duplicate" }), /already changed/);
  const final = await answerInterviewSession("student", session.id, { turnIndex: 1, transcript: "I compared a realistic dataset with different index choices and measured latency under concurrent load before choosing the final implementation.", finish: true });
  assert.equal(final.status, "completed"); assert.match(final.result.evaluationMode, /rubric/);
  assert.ok((await findUserById("student")).history.some((item) => item.id === final.result.id));
});
test("placement interview is blocked before coding pass", async () => {
  await assert.rejects(startInterviewSession("student", { mode: "placement" }), /Complete Placement Coding/);
});
test("hidden tests never appear in public problem catalog", () => {
  const catalog = publicCodingProblems();
  assert.equal(catalog.length, 3); assert.ok(catalog.every((problem) => !Object.hasOwn(problem, "hidden")));
  assert.equal(JSON.stringify(catalog).includes("pwwkew"), false);
});
test("sandbox validates code sizes and supported languages", () => {
  assert.throws(() => normalizeExecution({ code: "x".repeat(50001), language: "Python", problemId: "array-sum" }), /50 KB/);
  assert.throws(() => normalizeExecution({ code: "x", language: "Shell", problemId: "array-sum" }), /Unsupported/);
});
test("Judge0 sample and hidden execution return only safe aggregate results", async () => {
  process.env.JUDGE0_BASE_URL = "https://judge.example.test";
  let submissions = 0;
  const mock = async (url, options) => {
    if (options.method === "POST") { submissions++; const body = JSON.parse(options.body); assert.equal(body.enable_network, false); assert.ok(body.expected_output); return { ok: true, json: async () => ({ token: "test-token" }) }; }
    return { ok: true, json: async () => ({ status: { id: 3 }, time: "0.01", memory: 100, stdout: "hidden-output", stderr: "hidden-input" }) };
  };
  const input = normalizeExecution({ code: "print(1)", language: "Python", problemId: "array-sum" });
  assert.equal((await executeTests(input, false, mock)).totalTests, 1);
  const result = await executeTests(input, true, mock);
  assert.equal(result.passedTests, 5); assert.equal(submissions, 6);
  assert.equal(JSON.stringify(result).includes("hidden-"), false);
});
test("Judge0 outage records no fake execution score", async () => {
  const before = (await findUserById("student")).history.length;
  await assert.rejects(runCode("student", { code: "x", language: "JavaScript", problemId: "array-sum" }, true, async () => { throw new Error("Unavailable"); }));
  assert.equal((await findUserById("student")).history.length, before);
});
test("coding fail requires remediation and all three passes unlock interview", async () => {
  await mutateUser("student", () => ({ placementState: { aptitude: { easy: "passed", medium: "passed", hard: "passed" }, coding: { easy: "available", medium: "locked", hard: "locked" }, interview: { status: "locked", whiteboard: "locked" } } }));
  const request = { code: "x", language: "Python", problemId: "array-sum", mode: "placement" };
  const failed = await runCode("student", request, true, async () => ({ passedTests: 1, totalTests: 5, status: "failed", runtime: 1, memory: 1 }));
  assert.equal(failed.placementState.coding.easy, "failed");
  await assert.rejects(runCode("student", request, true), /remediation/);
  await assert.rejects(completeCodingRemediation("student", { level: "easy", reflection: "done" }), /20 words/);
  await completeCodingRemediation("student", { level: "easy", reflection: "I learned how to sum an array using a loop and checked empty input negative numbers and larger values with a worked example." });
  for (const problemId of ["array-sum", "longest-distinct", "minimum-coins"]) await runCode("student", { ...request, problemId }, true, async () => ({ passedTests: 5, totalTests: 5, status: "passed", runtime: 1, memory: 1 }));
  assert.equal((await findUserById("student")).placementState.interview.status, "available");
});
test("client placement snapshots cannot invent coding passes", async () => {
  await createUser({ id: "new", email: "new@example.test", placementState: structuredClone(DEFAULT_PLACEMENT_STATE) });
  await assert.rejects(savePlacementState("new", { ...DEFAULT_PLACEMENT_STATE, coding: { easy: "passed", medium: "available", hard: "locked" } }), /server-side/);
});
test("resume upload rejects mismatched content and oversized files", () => {
  assert.throws(() => validateResumeUpload({ fileName: "resume.pdf", mimeType: "application/pdf", data: Buffer.from("not pdf").toString("base64") }), /must match/);
  assert.throws(() => validateResumeUpload({ fileName: "resume.pdf", data: "A".repeat(7000001) }), /5 MB/);
});
test("resume analysis validates evidence and stores source-labelled baseline", async () => {
  const generated = { personalInfo: { name: "Student", email: null, phone: null, location: null }, skills: ["JavaScript"], technologies: [], education: [], experience: [], projects: [], certifications: [], strengths: ["Project evidence"], missingAreas: [], targetRoles: [], baseline: { programming: 40, webDevelopment: 30, coreCS: null, problemSolving: null, interviewReadiness: null } };
  assert.equal(validateResumeAnalysis(generated).baseline.coreCS, null);
  assert.throws(() => validateResumeAnalysis({ ...generated, baseline: { programming: "high" } }));
  const analysis = await analyzeResume("student", { fileName: "../../resume.pdf", mimeType: "application/pdf", data: Buffer.from("%PDF-test").toString("base64") }, async () => "JavaScript project", async (_instruction, _data, validate) => validate(generated));
  assert.equal(analysis.fileName.includes("/"), false); assert.match(analysis.source, /estimate/);
  assert.equal((await getSkillBaseline("student")).categories.find((item) => item.category === "programming").latestScore, 100);
});
test("Mongo repository uses ownership identifiers and retries optimistic conflicts", async () => {
  let document = { id: "mongo-user", email: "mongo@test", version: 0 }, replacements = 0;
  const repo = createMongoRepository({ findOne: async (query) => query.id === document.id ? structuredClone(document) : null, replaceOne: async (_query, next) => { if (++replacements === 1) return { modifiedCount: 0 }; document = next; return { modifiedCount: 1 }; } });
  assert.equal(await repo.findUserById("someone-else"), null);
  assert.equal((await repo.mutateUser("mongo-user", () => ({ name: "Updated" }))).name, "Updated");
  assert.equal(replacements, 2);
});
test("Google token verification rejects invalid tokens and unverified emails", async () => {
  process.env.GOOGLE_CLIENT_ID = "test-client";
  await assert.rejects(googleLogin({ credential: "invalid" }, async () => { throw new Error("bad signature"); }), /verification failed/);
  await assert.rejects(googleLogin({ credential: "invalid" }, async () => ({ sub: "123", email: "x@test", email_verified: false })), /verification failed/);
});
test("weak topics are derived from latest results without fabricated defaults", () => {
  assert.deepEqual(measuredWeakTopics([]), []);
  assert.deepEqual(measuredWeakTopics([{ type: "Coding", topicPerformance: [{ topic: "Arrays", percentage: 90 }] }, { type: "Coding", topicPerformance: [{ topic: "Arrays", percentage: 20 }] }]), []);
});

test("roadmap rejects malformed AI output and uses stored multi-assessment evidence", async (context) => {
  const { personalizedPlan } = await import("../src/personalization.js");
  await createUser({id:"roadmap-student",email:"roadmap@test.example",targetRole:"Backend Developer",skills:["JavaScript"],resumeAnalysis:{skills:["SQL"],baseline:{programming:60}},history:[{id:"daily",type:"Daily Challenge",score:100},{id:"a",type:"Aptitude",title:"Aptitude",score:55,createdAt:"2026-09-19",topicPerformance:[{topic:"Ratios",percentage:55}]},{id:"c",type:"Coding",title:"Coding",score:85,createdAt:"2026-09-18"}],interviewResults:[{score:70,weakTopics:[{topic:"Indexes",score:50}]}]});
  process.env.OPENAI_API_KEY="test-only"; process.env.OPENAI_LLM_MODEL="mock";
  let supplied, calls=0;
  context.mock.method(globalThis,"fetch",async(_url,options)=>{calls++;supplied=JSON.parse(JSON.parse(options.body).messages[1].content);return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({steps:"invalid"})}}]})};});
  try {
    const plan=await personalizedPlan("roadmap-student","roadmap");
    assert.match(plan.source,/fallback/);
    assert.equal(supplied.role,"Backend Developer");
    assert.equal(supplied.aptitudePerformance[0].score,55);
    assert.equal(supplied.codingPerformance[0].score,85);
    assert.equal(supplied.interviewPerformance[0].score,70);
    assert.equal(supplied.resumeAnalysis.skills[0],"SQL");
    assert.equal(supplied.results.some((item)=>item.type==="Daily Challenge"),false);
    assert.ok(plan.steps[0].tasks.some((item)=>item.includes("Ratios")));
    assert.equal((await personalizedPlan("roadmap-student","roadmap")).id,plan.id);
    assert.equal(calls,1);
  } finally {delete process.env.OPENAI_API_KEY;}
});

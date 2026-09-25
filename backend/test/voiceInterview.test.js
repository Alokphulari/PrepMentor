import { audioFixture } from "./helpers/audioFixtures.js";
import { geminiMock } from "./helpers/geminiMock.js";
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { structuredCompletion } from "../src/ai/aiClient.js";
import { normalizeAudioPayload, requireSpeechCapability } from "../src/speechTranscription.js";
import { createUser, findUserById, mutateUser } from "../src/userStore.js";
import { startInterviewSession, answerInterviewSession, getInterviewSession } from "../src/interviewSessions.js";

const response = (text) => ({ ok: true, json: async () => ({ status: "completed", output: [{ type: "reasoning" }, { type: "message", content: [{ type: "output_text", text }] }] }) });
test("OpenAI uses Responses, rejects malformed JSON and incomplete results; OpenRouter uses chat", async () => {
  const saved = { ...process.env };
  try {
    process.env.AI_PROVIDER = "openai";
    process.env.INTERVIEW_AI_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "test-only";
    process.env.OPENAI_LLM_MODEL = "configured-model";
    const options = { fetchImpl: async (url, request) => {
      assert.ok(url.endsWith("/responses"));
      const body = JSON.parse(request.body);
      assert.equal(body.store, false);
      assert.equal(body.text.format.type, "json_object");
      assert.match(body.input[0].content, /untrusted/);
      assert.equal(body.temperature, undefined);
      return response('{"score":80}');
    } };
    assert.equal((await structuredCompletion("Evaluate", {}, (value) => value, options)).score, 80);
    await assert.rejects(structuredCompletion("Evaluate", {}, (value) => value, { fetchImpl: async () => response("bad json") }), /invalid structured/);
    await assert.rejects(structuredCompletion("Evaluate", {}, (value) => value, { fetchImpl: async () => ({ ok: true, json: async () => ({ status: "incomplete" }) }) }), /did not complete/);
    process.env.AI_PROVIDER = "openrouter";
    process.env.OPENROUTER_API_KEY = "test-only";
    process.env.OPENROUTER_LLM_MODEL = "router-model";
    assert.equal(await structuredCompletion("Evaluate", {}, (value) => value.ok, { fetchImpl: async (url, request) => {
      assert.ok(url.endsWith("/chat/completions"));
      assert.equal(JSON.parse(request.body).model, "router-model");
      return { ok: true, json: async () => ({ choices: [{ message: { content: '{"ok":true}' } }] }) };
    } }), true);
  } finally { process.env = saved; }
});
test("STT and TTS configuration are independent and MIME parameters normalize safely", () => {
  const saved = { ...process.env };
  try {
    process.env.INTERVIEW_AI_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "test-only";
    delete process.env.LLM_TRANSCRIPTION_MODEL; delete process.env.LLM_TTS_MODEL;
    process.env.OPENAI_STT_MODEL = "transcription"; delete process.env.OPENAI_TTS_MODEL;
    assert.doesNotThrow(() => requireSpeechCapability("stt"));
    assert.throws(() => requireSpeechCapability("tts"), { status: 503 });
    delete process.env.OPENAI_STT_MODEL; process.env.OPENAI_TTS_MODEL = "speech";
    assert.throws(() => requireSpeechCapability("stt"), { status: 503 });
    assert.doesNotThrow(() => requireSpeechCapability("tts"));
    for (const mimeType of ["audio/webm", "audio/webm;codecs=opus", "audio/ogg", "audio/mp4", " AUDIO/WEBM ;codecs=opus"]) {
      assert.equal(normalizeAudioPayload({ mimeType, audio: audioFixture(mimeType.toLowerCase()).toString("base64") }).mimeType, mimeType.split(";")[0].trim().toLowerCase());
    }
  } finally { process.env = saved; }
});
test("sessions survive 20 dynamic turns, reject stale submissions, expire after an answer and complete placement during an AI outage using local scores", async (context) => {
  const saved = { ...process.env };
  const directory = await mkdtemp(join(tmpdir(), "prepmentor-voice-"));
  try {
    process.env.PREPMENTOR_DATA_FILE = join(directory, "users.json");
    delete process.env.MONGODB_URI; delete process.env.NODE_ENV;
    process.env.AI_PROVIDER = "openai"; process.env.OPENAI_API_KEY = "test-only"; process.env.OPENAI_LLM_MODEL = "test-model";
    let outage = false;
    geminiMock(context, { fail: () => outage });
    await createUser({ id: "student", email: "voice@test", placementState: { aptitude: { easy: "passed", medium: "passed", hard: "passed" }, coding: { easy: "passed", medium: "passed", hard: "passed" }, interview: { status: "available", whiteboard: "locked" } } });
    let session = await startInterviewSession("student", { role: "Software Engineer", mode: "practice" });
    assert.equal(session.currentQuestion.question, "Explain topic1");
    for (let index = 0; index < 20; index++) {
      session = await answerInterviewSession("student", session.id, { turnIndex: index, transcript: "Concise relevant answer" });
      assert.equal(session.turns.length, index + 1);
      assert.equal((await getInterviewSession("student", session.id)).turns.length, index + 1);
      if (index < 19) {
        assert.equal(session.status, "active");
        assert.ok(session.turns.at(-1).answerEvaluation);
        assert.notEqual(session.currentQuestion.question, session.turns.at(-1).question);
        await assert.rejects(answerInterviewSession("student", session.id, { turnIndex: index, transcript: "Duplicate" }), { status: 409 });
      }
    }
    assert.equal(session.turns.length, 20);
    assert.equal(session.status, "completed");
    assert.equal(session.result.questionFeedback.length, 20);
    assert.equal((await answerInterviewSession("student", session.id, { turnIndex: 19 })).result.id, session.result.id);
    let timed = await startInterviewSession("student", { duration: 10 });
    await mutateUser("student", (user) => ({ interviewSessions: user.interviewSessions.map((item) => item.id === timed.id ? { ...item, startedAt: new Date(Date.now() - 601000).toISOString() } : item) }));
    timed = await answerInterviewSession("student", timed.id, { turnIndex: 0, transcript: "Current response" });
    assert.equal(timed.status, "completed");
    const gated = await startInterviewSession("student", { mode: "placement" });
    const next = await answerInterviewSession("student", gated.id, { turnIndex: 0, transcript: "word ".repeat(80) });
    assert.equal(next.turns[0].answerEvaluation, undefined);
    outage = true;
    const backup = await answerInterviewSession("student", gated.id, { turnIndex: 1, transcript: "word ".repeat(80), finish: true });
    assert.equal(backup.status, "completed");
    assert.equal(backup.result.provider, "local");
    assert.equal((await getInterviewSession("student", gated.id)).turns.length, 2);
    assert.equal((await findUserById("student")).placementState.interview.status, "failed");
    outage = false;
    const final = await answerInterviewSession("student", gated.id, { turnIndex: 1, transcript: "A valid answer", finish: true });
    assert.equal(final.result.id, backup.result.id);
    assert.equal((await findUserById("student")).placementState.interview.status, "failed");
  } finally { process.env = saved; await rm(directory, { recursive: true, force: true }); }
});


test("Judge0 reports sample diagnostics and hides all hidden-test output for compile, runtime and timeout failures", async () => {
  const { executeTests, normalizeExecution } = await import("../src/codingAssessment.js");
  const saved = { ...process.env };
  try {
    process.env.JUDGE0_BASE_URL = "https://judge.example.test";
    process.env.JUDGE0_API_KEY = "test-only";
    delete process.env.JUDGE0_RAPIDAPI_HOST;
    const input = normalizeExecution({ code: "broken", language: "Python", problemId: "array-sum" });
    for (const status of [5, 6, 7, 11]) {
      const mock = async (_url, options) => {
        assert.equal(options.headers["X-Auth-Token"], "test-only");
        assert.equal(options.headers["X-RapidAPI-Key"], undefined);
        return { ok: true, json: async () => options.method === "POST" ? { token: "test-token" } : { status: { id: status }, stdout: Buffer.from("output").toString("base64"), compile_output: Buffer.from("compiler message").toString("base64"), stderr: Buffer.from("error details").toString("base64") } };
      };
      const sample = await executeTests(input, false, mock);
      assert.equal(sample.passedTests, 0);
      assert.equal(sample.sampleResults[0].compilation, "compiler message");
      const hidden = await executeTests(input, true, mock);
      assert.equal(hidden.sampleResults, undefined);
      assert.equal(JSON.stringify(hidden).includes("error details"), false);
    }
  } finally { process.env = saved; }
});

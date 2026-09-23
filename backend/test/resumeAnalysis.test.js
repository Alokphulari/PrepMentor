import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createUser, findUserById } from "../src/userStore.js";
import { analyzeResume, validateResumeUpload } from "../src/resumeAnalysis.js";

const originalEnv = { ...process.env };
let directory;
const output = {
  personalInfo: { name: "Test Student", email: null, phone: null, location: null },
  skills: ["JavaScript"], technologies: [], education: [], experience: [], projects: [],
  certifications: [], strengths: ["Project evidence"], missingAreas: [], targetRoles: [],
  baseline: { programming: 40, webDevelopment: null, coreCS: null, problemSolving: null, interviewReadiness: null },
};
const upload = { fileName: "resume.pdf", mimeType: "", data: Buffer.from("%PDF-test").toString("base64") };
before(async () => {
  directory = await mkdtemp(join(tmpdir(), "prepmentor-resume-"));
  process.env.PREPMENTOR_DATA_FILE = join(directory, "users.json");
  delete process.env.MONGODB_URI;
  delete process.env.NODE_ENV;
  await createUser({ id: "resume-test", email: "resume@example.test" });
});
after(async () => { process.env = originalEnv; await rm(directory, { recursive: true, force: true }); });

test("upload accepts missing browser MIME while rejecting mismatched signatures", () => {
  assert.equal(validateResumeUpload(upload).type, "pdf");
  assert.equal(validateResumeUpload({ ...upload, mimeType: "application/octet-stream" }).type, "pdf");
  assert.throws(() => validateResumeUpload({ ...upload, mimeType: "text/html" }), /must match/);
  assert.throws(() => validateResumeUpload({ ...upload, fileName: "resume.docx" }), /must match/);
});

test("resume upload uses configured Gemini and persists usable analysis", async (context) => {
  process.env.INTERVIEW_AI_PROVIDER = "gemini";
  process.env.GEMINI_API_KEY = "test-only";
  process.env.GEMINI_INTERVIEW_MODEL = "test-resume-model";
  let calls = 0;
  context.mock.method(globalThis, "fetch", async (_url, options) => {
    calls++;
    const body = JSON.parse(options.body);
    assert.match(body.systemInstruction.parts[0].text, /Extract only facts/);
    assert.equal(body.generationConfig.responseMimeType, "application/json");
    assert.deepEqual(body.generationConfig.responseJsonSchema.properties.baseline.properties.programming.type, ["number", "null"]);
    assert.equal(JSON.parse(body.contents[0].parts[0].text).resume, "JavaScript project");
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(output) }] }, finishReason: "STOP" }] }), { headers: { "Content-Type": "application/json" } });
  });
  const result = await analyzeResume("resume-test", upload, async () => "JavaScript project");
  assert.equal(calls, 1);
  assert.deepEqual(result.skills, ["JavaScript"]);
  assert.equal((await findUserById("resume-test")).resumeAnalysis.id, result.id);
});

test("quota failure stays an error and preserves previous analysis", async () => {
  const previous = (await findUserById("resume-test")).resumeAnalysis;
  await assert.rejects(analyzeResume("resume-test", upload, async () => "New resume", async () => {
    throw Object.assign(new Error("secret provider response"), { status: 429 });
  }), (error) => error.status === 429 && /quota/.test(error.message) && !/secret/.test(error.message));
  assert.deepEqual((await findUserById("resume-test")).resumeAnalysis, previous);
});

test("current builder edits are analyzed without requiring a stale server draft", async () => {
  const result = await analyzeResume("resume-test", { manual: true, resume: { name: "Updated name", skills: "JavaScript" } }, undefined, async (_instruction, data, validate) => {
    assert.equal(JSON.parse(data.resume).name, "Updated name");
    return validate(output);
  });
  assert.equal(result.fileName, "Builder resume");
});

test("empty document stops before AI calls and retains saved analysis", async () => {
  const previous = (await findUserById("resume-test")).resumeAnalysis.id;
  await assert.rejects(analyzeResume("resume-test", upload, async () => " ", async () => assert.fail("AI must not run")), /No text/);
  assert.equal((await findUserById("resume-test")).resumeAnalysis.id, previous);
});

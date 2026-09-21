import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAppServer } from "../src/server.js";

test("authenticated workflow persists resume, coding, adaptive interview, report and plans", async (context) => {
  const originalEnv = { ...process.env };
  const directory = await mkdtemp(join(tmpdir(), "prepmentor-workflow-"));
  process.env.PREPMENTOR_DATA_FILE = join(directory, "users.json");
  delete process.env.MONGODB_URI; delete process.env.NODE_ENV;
  process.env.OPENAI_API_KEY = "mock-not-a-real-key";
  process.env.OPENAI_LLM_MODEL = "mock-model";
  process.env.OPENAI_BASE_URL = "https://ai.example.test/v1";
  process.env.JUDGE0_BASE_URL = "https://judge.example.test";
  const fetchLocal = globalThis.fetch;
  let questionNumber = 0;
  let answerEvaluations = 0;
  let roadmapGenerations = 0;
  context.mock.method(globalThis, "fetch", async (url, options) => {
    if (String(url).startsWith("http://127.0.0.1:")) return fetchLocal(url, options);
    if (String(url).startsWith(process.env.JUDGE0_BASE_URL)) return { ok: true, json: async () => options.method === "POST" ? { token: "mock-token" } : { status: { id: 3 }, time: "0.01", memory: 512 } };
    assert.ok(String(url).startsWith(process.env.OPENAI_BASE_URL), "No real external providers may be called");
    const body = JSON.parse(options.body);
    assert.match(body.messages[0].content, /untrusted data/);
    const instruction = body.messages[0].content;
    const data = JSON.parse(body.messages[1].content);
    let value;
    if (instruction.startsWith("Extract only")) value = { personalInfo: { name: "Student", email: null, phone: null, location: null }, skills: ["JavaScript"], technologies: [], education: [], experience: [], projects: ["Web project"], certifications: [], strengths: ["Project evidence"], missingAreas: [], targetRoles: ["Developer"], baseline: { programming: 50, webDevelopment: 50, coreCS: null, problemSolving: null, interviewReadiness: null } };
    else if (instruction.startsWith("Evaluate the CURRENT")) { answerEvaluations++; value = { score: 72, technicalAccuracy: 70, relevance: 85, communication: 80, reasoning: 65, strengths: ["Relevant explanation"], improvements: ["Explain write overhead"], feedback: "Compare the costs explicitly", idealAnswer: "I measure reads and writes under representative load before choosing an index." }; }
    else if (instruction.startsWith("Act as")) value = { question: `Describe index trade-off ${++questionNumber}?`, focus: "Databases" };
    else if (instruction.startsWith("Evaluate the FULL")) value = { score: 85, metrics: { communication: 85, technical: 85, problemSolving: 85, confidence: 80, answerRelevance: 90 }, strengths: ["Specific examples"], weaknesses: ["Write costs"], recommendations: ["Review indexing costs"], weakTopics: [{ topic: "Index costs", score: 55, reason: "Missing overhead analysis" }], questionFeedback: data.questions.map((item) => ({ question: item.question, score: 85, feedback: "Relevant explanation", betterApproach: "Include write costs" })) };
    else if (instruction.startsWith("Create a personalized career")) { roadmapGenerations++; value = { role: data.role, readinessSummary: "Good foundation", currentStrengths: ["Coding"], gaps: ["Index costs"], steps: [{ period: "Week 1", title: "Database trade-offs", tasks: ["Compare read and write workloads"], successMetric: "Explain three index costs" }] }; }
    else if (instruction.startsWith("Create learning")) value = { learningPlan: data.weakTopics.map((item) => ({ topic: item.topic, priority: "high", explanation: "Review measured gaps", tasks: ["Explain an example"], practiceGoal: "Reach 80%" })) };
    else assert.fail("Unexpected provider operation");
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(value) } }] }) };
  });
  const server = createAppServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let token;
  const request = async (path, method = "GET", body, overrideToken = token) => {
    const response = await fetchLocal(base + path, { method, headers: { "Content-Type": "application/json", ...(overrideToken ? { Authorization: `Bearer ${overrideToken}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  try {
    assert.equal((await request("/api/code/problems")).status, 401);
    const registered = await request("/api/auth/register", "POST", { name: "Student", email: "student@workflow.test", password: "test-password-123" });
    assert.equal(registered.status, 201); token = registered.body.token;
    const second = await request("/api/auth/register", "POST", { name: "Other", email: "other@workflow.test", password: "test-password-123" });
    assert.equal((await request("/api/profile", "PATCH", { profileCompleted: true, targetRole: "Backend Developer" })).status, 200);
    assert.equal((await request("/api/resume", "PUT", { name: "Student", skills: "JavaScript", projects: [{ title: "Web project" }] })).status, 200);
    assert.equal((await request("/api/resume/analyze", "POST", { manual: true })).body.analysis.source, "AI resume evidence estimate");
    assert.equal((await request("/api/baseline")).body.categories[0].estimate, 50);
    let state = (await request("/api/placement")).body.placementState;
    assert.equal((await request("/api/code/submit", "POST", { code: "x", language: "Python", problemId: "array-sum", mode: "placement" })).status, 403);
    for (const level of ["easy", "medium", "hard"]) {
      state.aptitude[level] = "passed";
      if (level === "hard") state.coding.easy = "available";
      else state.aptitude[level === "easy" ? "medium" : "hard"] = "available";
      const saved = await request("/api/placement", "PUT", state);
      assert.equal(saved.status, 200);
    }
    for (const problemId of ["array-sum", "longest-distinct", "minimum-coins"]) {
      const result = await request("/api/code/submit", "POST", { code: "mock program; never executed locally", language: "Python", problemId, mode: "placement" });
      assert.equal(result.status, 200); assert.equal(result.body.score, 100);
      assert.equal(JSON.stringify(result.body).includes("expected_output"), false);
    }
    assert.equal((await request("/api/placement")).body.placementState.interview.status, "available");
    const started = await request("/api/interview-sessions", "POST", { role: "Backend Developer", mode: "placement" });
    assert.equal(started.status, 201);
    const id = started.body.session.id;
    assert.equal((await request(`/api/interview-sessions/${id}`, "GET", undefined, second.body.token)).status, 404);
    const first = await request(`/api/interview-sessions/${id}/answer`, "POST", { turnIndex: 0, transcript: "I examined query patterns and used indexes to improve read latency while measuring the effects of additional storage and write overhead." });
    assert.equal(first.body.session.turns.length, 1);
    assert.equal(answerEvaluations, 1);
    assert.equal(first.body.session.turns[0].answerEvaluation, undefined);
    assert.equal(JSON.stringify((await request(`/api/interview-sessions/${id}`)).body).includes("idealAnswer"), false);
    assert.notEqual(first.body.session.currentQuestion.question, started.body.session.currentQuestion.question);
    const final = await request(`/api/interview-sessions/${id}/answer`, "POST", { turnIndex: 1, transcript: "I compared representative workloads and measured latency percentiles before and after each change with concurrent readers and writers to avoid misleading conclusions.", finish: true });
    assert.equal(final.status, 200);
    const result = final.body.session.result;
    assert.equal(result.questionFeedback.length, 2);
    assert.equal(answerEvaluations, 2);
    assert.ok(result.questionFeedback.every((item)=>item.answer && item.idealAnswer));
    assert.equal((await request(`/api/interviews/${result.id}`, "GET", undefined, second.body.token)).status, 404);
    assert.equal((await request("/api/placement")).body.placementState.interview.status, "passed");
    assert.equal((await request("/api/learning/plan")).body.plan.learningPlan[0].topic, "Index costs");
    assert.equal((await request("/api/career-roadmap")).body.plan.source, "AI personalized plan");
    const cached = (await request("/api/career-roadmap")).body.plan;
    await request("/api/history", "POST", { id: "daily-one", type: "Daily Challenge", title: "Daily question", score: 100, createdAt: new Date().toISOString() });
    assert.equal((await request("/api/career-roadmap")).body.plan.id, cached.id);
    assert.equal(roadmapGenerations, 1);
    assert.equal((await request("/api/career-roadmap/generate", "POST", {})).status, 200);
    assert.equal(roadmapGenerations, 2);
    const relog = await request("/api/auth/login", "POST", { email: "student@workflow.test", password: "test-password-123" });
    token = relog.body.token;
    assert.equal((await request("/api/history")).body.history.length, 5);
    assert.equal((await request(`/api/interview-sessions/${id}`)).body.session.status, "completed");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    process.env = originalEnv;
    await rm(directory, { recursive: true, force: true });
  }
});

import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { findUserById, mutateUser } from "./userStore.js";
import { DEFAULT_PLACEMENT_STATE } from "./placement.js";
import { withSessionLock } from "./interviewSessions.js";

const languages = { JavaScript: 63, Python: 71, Java: 62, "C++": 54 };
const problems = [
  { id: "array-sum", difficulty: "easy", title: "Array sum", topic: "Arrays", description: "Read n followed by n integers from standard input. Print their sum. 0 <= n <= 100000; each value is between -1000000 and 1000000. Use a 64-bit sum.", samples: [{ input: "3\n1 2 3\n", output: "6\n" }], hidden: [{ input: "0\n", output: "0\n" }, { input: "4\n-5 2 -3 6\n", output: "0\n" }, { input: "1\n-9\n", output: "-9\n" }, { input: "5\n1000000 1000000 1000000 1000000 1000000\n", output: "5000000\n" }, { input: "3\n9 7 5\n", output: "21\n" }] },
  { id: "longest-distinct", difficulty: "medium", title: "Longest distinct substring", topic: "Sliding Window", description: "Read one line of lowercase English letters (possibly empty, length <= 100000). Print the length of the longest substring containing no repeated character.", samples: [{ input: "abcabcbb\n", output: "3\n" }], hidden: [{ input: "\n", output: "0\n" }, { input: "bbbbb\n", output: "1\n" }, { input: "pwwkew\n", output: "3\n" }, { input: "dvdf\n", output: "3\n" }, { input: "abcdefghijklmnopqrstuvwxyz\n", output: "26\n" }] },
  { id: "minimum-coins", difficulty: "hard", title: "Minimum coin change", topic: "Dynamic Programming", description: "Read n and target, then n positive coin denominations. Print the minimum coins needed to make target, or -1 if impossible. Coins may be reused. 1 <= n <= 100; 0 <= target <= 10000; denominations <= 10000.", samples: [{ input: "3 11\n1 2 5\n", output: "3\n" }], hidden: [{ input: "1 3\n2\n", output: "-1\n" }, { input: "2 0\n2 5\n", output: "0\n" }, { input: "3 6\n1 3 4\n", output: "2\n" }, { input: "2 14\n3 7\n", output: "2\n" }, { input: "2 9\n2 4\n", output: "-1\n" }] },
];
export function publicCodingProblems() {
  return problems.map(({ hidden, ...problem }) => ({ ...problem, languages: Object.keys(languages) }));
}
export function normalizeExecution(value) {
  if (!value || typeof value.code !== "string" || !value.code.trim() || Buffer.byteLength(value.code) > 50000) throw new Error("Provide source code of at most 50 KB.");
  if (!Object.hasOwn(languages, value.language)) throw new Error("Unsupported execution language.");
  const problem = problems.find((item) => item.id === value.problemId);
  if (!problem) throw new Error("Unknown coding problem.");
  return { code: value.code, languageId: languages[value.language], problem, mode: value.mode === "placement" ? "placement" : "practice" };
}
export async function executeTests(input, hidden, fetchImpl = globalThis.fetch) {
  const base = process.env.JUDGE0_BASE_URL?.replace(/\/$/, "");
  if (!base) throw Object.assign(new Error("Code execution is unavailable. Configure Judge0 on the server."), { status: 503 });
  const headers = { "Content-Type": "application/json", ...(process.env.JUDGE0_API_KEY ? { "X-Auth-Token": process.env.JUDGE0_API_KEY, "X-RapidAPI-Key": process.env.JUDGE0_API_KEY } : {}) };
  if (process.env.JUDGE0_RAPIDAPI_HOST) headers["X-RapidAPI-Host"] = process.env.JUDGE0_RAPIDAPI_HOST;
  const tests = hidden ? input.problem.hidden : input.problem.samples;
  let passedTests = 0, runtime = 0, memory = 0;
  const statuses = [];
  const deadline = Date.now() + 50000;
  for (const test of tests) {
    try {
      const response = await fetchImpl(`${base}/submissions?base64_encoded=true&wait=false`, { method: "POST", headers, signal: AbortSignal.timeout(8000), body: JSON.stringify({ language_id: input.languageId, source_code: Buffer.from(input.code).toString("base64"), stdin: Buffer.from(test.input).toString("base64"), expected_output: Buffer.from(test.output).toString("base64"), cpu_time_limit: 2, wall_time_limit: 5, memory_limit: 128000, enable_network: false }) });
      if (!response.ok) throw new Error();
      const { token } = await response.json();
      if (typeof token !== "string" || !/^[a-zA-Z0-9-]+$/.test(token)) throw new Error();
      let result;
      do {
        if (Date.now() >= deadline) throw new Error();
        const poll = await fetchImpl(`${base}/submissions/${token}?base64_encoded=true&fields=status,time,memory`, { headers, signal: AbortSignal.timeout(8000) });
        if (!poll.ok) throw new Error();
        result = await poll.json();
        if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].includes(result.status?.id)) throw new Error();
        if (result.status.id <= 2) await delay(250);
      } while (result.status.id <= 2);
      if (result.status.id === 13 || result.status.id === 14) throw new Error();
      if (result.status.id === 3) passedTests += 1;
      runtime += Math.max(0, Number(result.time) || 0);
      memory = Math.max(memory, Number(result.memory) || 0);
      statuses.push(result.status.id);
    } catch { throw Object.assign(new Error("Code execution is temporarily unavailable or timed out. No score was recorded."), { status: 503 }); }
  }
  return { passedTests, totalTests: tests.length, status: passedTests === tests.length ? "passed" : "failed", runtime, memory, failureReason: statuses.includes(6) ? "Compilation failed. Check your program and selected language." : statuses.includes(5) ? "Time limit exceeded." : passedTests < tests.length ? "One or more tests failed." : null };
}
export async function runCode(userId, value, submit, runner = executeTests) {
  const input = normalizeExecution(value);
  return withSessionLock(`coding:${userId}`, async () => {
    const user = await findUserById(userId);
    const level = input.problem.difficulty;
    if (input.mode === "placement" && user.placementState?.coding?.[level] !== "available") throw Object.assign(new Error("This Placement coding level is locked or requires remediation."), { status: 403 });
    const result = await runner(input, submit);
    if (!submit) return result;
    const score = Math.round(result.passedTests / result.totalTests * 100);
    const entry = { id: randomUUID(), type: "Coding", evidenceType: "server-assessment", title: `${input.mode === "placement" ? "Placement" : "Practice"} Coding ${level}`, mode: input.mode, difficulty: level, score, duration: "Self-paced", createdAt: new Date().toISOString(), topicPerformance: [{ topic: input.problem.topic, percentage: score }] };
    const updated = await mutateUser(userId, (current) => {
      const placementState = structuredClone(current.placementState || DEFAULT_PLACEMENT_STATE);
      if (input.mode === "placement") {
        if (placementState.coding[level] !== "available") throw new Error("Coding level changed during submission.");
        placementState.coding[level] = score >= 80 ? "passed" : "failed";
        if (score >= 80) {
          if (level === "hard") placementState.interview.status = "available";
          else placementState.coding[level === "easy" ? "medium" : "hard"] = "available";
        }
      }
      return { placementState, history: [entry, ...(current.history || [])].slice(0, 100), codingRemediation: input.mode === "placement" && score < 80 ? { level, topic: input.problem.topic, completed: false } : current.codingRemediation };
    });
    return { ...result, score, entry, placementState: updated.placementState };
  });
}
export async function completeCodingRemediation(userId, value) {
  if (typeof value.reflection !== "string" || value.reflection.length > 10000 || value.reflection.trim().split(/\s+/).length < 20) throw new Error("Explain your learning and a worked example in at least 20 words.");
  const user = await mutateUser(userId, (current) => {
    const task = current.codingRemediation;
    if (!task || task.level !== value.level || current.placementState.coding[task.level] !== "failed") throw new Error("No matching failed coding assessment.");
    return { codingRemediation: { ...task, completed: true, reflection: value.reflection, completedAt: new Date().toISOString() }, placementState: { ...current.placementState, coding: { ...current.placementState.coding, [task.level]: "available" } } };
  });
  return user.placementState;
}

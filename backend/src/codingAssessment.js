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
// Each roadmap exercise has one visible example and a different private case.
// Programs read the input exactly as shown and print the expected output.
const addPracticeProblem = (id, difficulty, title, topic, description, sample, hidden) => problems.push({
  id, difficulty, title, topic, description, samples: [sample], hidden: [hidden],
});

addPracticeProblem("move-zeroes", "easy", "Move zeroes", "Arrays", "Read n, then n integers. Print the reordered integers separated by spaces.", { input: "5\n0 1 0 3 12\n", output: "1 3 12 0 0\n" }, { input: "4\n0 0 1 0\n", output: "1 0 0 0\n" });
addPracticeProblem("maximum-subarray", "medium", "Maximum subarray", "Arrays", "Read n, then n integers. Print the largest contiguous-subarray sum.", { input: "9\n-2 1 -3 4 -1 2 1 -5 4\n", output: "6\n" }, { input: "3\n-5 -2 -7\n", output: "-2\n" });
addPracticeProblem("valid-anagram", "easy", "Valid anagram", "Strings", "Read two lowercase strings, one per line. Print true or false.", { input: "anagram\nnagaram\n", output: "true\n" }, { input: "rat\ncar\n", output: "false\n" });
addPracticeProblem("two-sum", "easy", "Two sum", "Strings", "Read n and target, then n integers. Print the two matching indices in ascending order.", { input: "4 9\n2 7 11 15\n", output: "0 1\n" }, { input: "3 6\n3 2 4\n", output: "1 2\n" });
addPracticeProblem("group-anagrams", "medium", "Group anagrams", "Strings", "Read n, then n lowercase words. Print each anagram group as its words separated by spaces, with groups ordered by first appearance.", { input: "5\neat tea tan ate nat\n", output: "eat tea ate\ntan nat\n" }, { input: "3\na a b\n", output: "a a\nb\n" });
addPracticeProblem("valid-palindrome", "easy", "Valid palindrome", "Two pointers", "Read one line. Ignore non-alphanumeric characters and case; print true or false.", { input: "A man, a plan, a canal: Panama\n", output: "true\n" }, { input: "race a car\n", output: "false\n" });
addPracticeProblem("trapping-water", "hard", "Trapping rain water", "Two pointers", "Read n, then n nonnegative heights. Print trapped water.", { input: "12\n0 1 0 2 1 0 1 3 2 1 2 1\n", output: "6\n" }, { input: "3\n3 0 3\n", output: "3\n" });
addPracticeProblem("binary-search", "easy", "Binary search", "Binary search", "Read n and target, then sorted integers. Print its index or -1.", { input: "6 9\n-1 0 3 5 9 12\n", output: "4\n" }, { input: "4 2\n1 3 5 7\n", output: "-1\n" });
addPracticeProblem("merge-intervals", "medium", "Merge intervals", "Binary search", "Read n, then n start/end pairs. Print merged pairs, one pair per line.", { input: "4\n1 3\n2 6\n8 10\n10 12\n", output: "1 6\n8 12\n" }, { input: "2\n1 4\n4 5\n", output: "1 5\n" });
addPracticeProblem("rotated-search", "medium", "Search rotated array", "Binary search", "Read n and target, then rotated sorted integers. Print the index or -1.", { input: "7 0\n4 5 6 7 0 1 2\n", output: "4\n" }, { input: "1 0\n1\n", output: "-1\n" });
addPracticeProblem("reverse-list", "easy", "Reverse linked list", "Linked lists", "Read n, then n values. Print them in reverse order separated by spaces.", { input: "3\n1 2 3\n", output: "3 2 1\n" }, { input: "1\n9\n", output: "9\n" });
addPracticeProblem("list-cycle", "easy", "Detect a cycle", "Linked lists", "Read n and the zero-based position joined by the tail (-1 for none), then n values. Print true or false.", { input: "4 1\n3 2 0 -4\n", output: "true\n" }, { input: "2 -1\n1 2\n", output: "false\n" });
addPracticeProblem("remove-nth", "medium", "Remove nth node from end", "Linked lists", "Read n and k, then n values. Remove the kth value from the end and print the remaining values.", { input: "5 2\n1 2 3 4 5\n", output: "1 2 3 5\n" }, { input: "1 1\n8\n", output: "\n" });
addPracticeProblem("balanced-brackets", "easy", "Balanced brackets", "Stacks", "Read one bracket string. Print true or false.", { input: "{[()]}\n", output: "true\n" }, { input: "([)]\n", output: "false\n" });
addPracticeProblem("daily-temperatures", "medium", "Daily temperatures", "Stacks", "Read n, then n temperatures. Print waiting days separated by spaces.", { input: "8\n73 74 75 71 69 72 76 73\n", output: "1 1 4 2 1 1 0 0\n" }, { input: "3\n30 20 10\n", output: "0 0 0\n" });
addPracticeProblem("largest-rectangle", "hard", "Largest histogram rectangle", "Stacks", "Read n, then n bar heights. Print the largest rectangle area.", { input: "6\n2 1 5 6 2 3\n", output: "10\n" }, { input: "2\n2 4\n", output: "4\n" });
addPracticeProblem("subsets", "medium", "Generate subsets", "Recursion", "Read n, then n distinct integers. Print subsets in binary-mask order, each on one line; print an empty subset as an empty line.", { input: "2\n1 2\n", output: "\n1\n2\n1 2\n" }, { input: "1\n7\n", output: "\n7\n" });
addPracticeProblem("permutations", "medium", "Generate permutations", "Recursion", "Read n, then n distinct integers. Print permutations in input-order recursive order, one per line.", { input: "2\n1 2\n", output: "1 2\n2 1\n" }, { input: "1\n7\n", output: "7\n" });
addPracticeProblem("n-queens", "hard", "Count N-Queens solutions", "Recursion", "Read n. Print the number of valid queen placements.", { input: "4\n", output: "2\n" }, { input: "1\n", output: "1\n" });
addPracticeProblem("tree-depth", "easy", "Maximum tree depth", "Trees", "Read n, then a level-order tree using -1 for null. Print its maximum depth.", { input: "7\n3 9 20 -1 -1 15 7\n", output: "3\n" }, { input: "0\n", output: "0\n" });
addPracticeProblem("level-order", "medium", "Level order traversal", "Trees", "Read n, then a level-order tree using -1 for null. Print each level's values on one line.", { input: "7\n3 9 20 -1 -1 15 7\n", output: "3\n9 20\n15 7\n" }, { input: "1\n5\n", output: "5\n" });
addPracticeProblem("validate-bst", "medium", "Validate a BST", "Trees", "Read n, then a level-order tree using -1 for null. Print true or false.", { input: "7\n5 1 4 -1 -1 3 6\n", output: "false\n" }, { input: "3\n2 1 3\n", output: "true\n" });
addPracticeProblem("last-stone", "easy", "Last stone weight", "Heaps", "Read n, then stone weights. Print the final stone weight.", { input: "6\n2 7 4 1 8 1\n", output: "1\n" }, { input: "2\n2 2\n", output: "0\n" });
addPracticeProblem("kth-largest", "medium", "Kth largest element", "Heaps", "Read n and k, then integers. Print the kth largest value.", { input: "6 2\n3 2 1 5 6 4\n", output: "5\n" }, { input: "3 1\n2 2 1\n", output: "2\n" });
addPracticeProblem("jump-game", "medium", "Jump game", "Heaps", "Read n, then maximum jump lengths. Print true or false.", { input: "5\n2 3 1 1 4\n", output: "true\n" }, { input: "5\n3 2 1 0 4\n", output: "false\n" });
addPracticeProblem("graph-path", "easy", "Path in an undirected graph", "Graphs", "Read n and m, then m edges, followed by source and destination. Print true or false.", { input: "3 2\n0 1\n1 2\n0 2\n", output: "true\n" }, { input: "3 1\n0 1\n0 2\n", output: "false\n" });
addPracticeProblem("number-islands", "medium", "Number of islands", "Graphs", "Read rows and columns, then rows of 0 and 1 characters. Print the island count.", { input: "2 3\n110\n001\n", output: "2\n" }, { input: "1 4\n1111\n", output: "1\n" });
addPracticeProblem("course-schedule", "medium", "Course schedule", "Graphs", "Read course count and prerequisite-pair count, then pairs a b (b before a). Print true or false.", { input: "2 2\n1 0\n0 1\n", output: "false\n" }, { input: "2 1\n1 0\n", output: "true\n" });
addPracticeProblem("climbing-stairs", "easy", "Climbing stairs", "Dynamic programming", "Read n. Print the number of ways to climb n stairs using one or two steps.", { input: "4\n", output: "5\n" }, { input: "0\n", output: "1\n" });
addPracticeProblem("house-robber", "medium", "House robber", "Dynamic programming", "Read n, then nonnegative amounts. Print the maximum non-adjacent sum.", { input: "5\n2 7 9 3 1\n", output: "12\n" }, { input: "2\n2 1\n", output: "2\n" });
addPracticeProblem("single-number", "easy", "Single number", "Bit manipulation", "Read n, then integers where one appears once and others twice. Print the unique value.", { input: "5\n4 1 2 1 2\n", output: "4\n" }, { input: "1\n-3\n", output: "-3\n" });
addPracticeProblem("count-bits", "easy", "Counting bits", "Bit manipulation", "Read n. Print the set-bit counts from 0 through n separated by spaces.", { input: "5\n", output: "0 1 1 2 1 2\n" }, { input: "0\n", output: "0\n" });
addPracticeProblem("range-and", "medium", "Bitwise AND of a range", "Bit manipulation", "Read left and right. Print the inclusive range bitwise AND.", { input: "5 7\n", output: "4\n" }, { input: "0 0\n", output: "0\n" });

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
  const headers = { "Content-Type": "application/json", ...(process.env.JUDGE0_API_KEY ? { [process.env.JUDGE0_RAPIDAPI_HOST ? "X-RapidAPI-Key" : "X-Auth-Token"]: process.env.JUDGE0_API_KEY } : {}) };
  if (process.env.JUDGE0_RAPIDAPI_HOST) headers["X-RapidAPI-Host"] = process.env.JUDGE0_RAPIDAPI_HOST;
  const tests = hidden ? input.problem.hidden : input.problem.samples;
  let passedTests = 0, runtime = 0, memory = 0;
  const statuses = [];
  const sampleResults = [];
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
        const fields = hidden ? "status,time,memory" : "status,time,memory,stdout,stderr,compile_output";
        const poll = await fetchImpl(`${base}/submissions/${token}?base64_encoded=true&fields=${fields}`, { headers, signal: AbortSignal.timeout(8000) });
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
      if (!hidden) {
        const decode = (value) => typeof value === "string" ? Buffer.from(value.slice(0, 16000), "base64").toString("utf8").slice(0, 8000) : "";
        sampleResults.push({ status: result.status.id, stdout: decode(result.stdout), stderr: decode(result.stderr), compilation: decode(result.compile_output) });
      }
    } catch { throw Object.assign(new Error("Code execution is temporarily unavailable or timed out. No score was recorded."), { status: 503 }); }
  }
  return { passedTests, totalTests: tests.length, status: passedTests === tests.length ? "passed" : "failed", runtime, memory, ...(!hidden ? { sampleResults } : {}), failureReason: statuses.includes(6) ? "Compilation failed. Check your program and selected language." : statuses.includes(5) ? "Time limit exceeded." : statuses.some((status) => status >= 7 && status <= 12) ? "Runtime error. Check your program against the sample input." : passedTests < tests.length ? "One or more tests failed." : null };
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

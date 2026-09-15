import { normalizeGeneratedAptitudeQuestions } from "../utils/aptitudeSession.js";
import { normalizeCodingProblems } from "../utils/codingWorkspaceState.js";
import { generateOfflineQuestions } from "../utils/offlineQuestionGenerator.js";
import { randomizeQuestions } from "../utils/questionRandomization.js";
import { authorizedRequest } from "./authService.js";
import { hasRemoteApi } from "./api.js";

const codingPatterns = [
  ["Two Sum", "Hashing", "Find two values that add to a target and return their indices."],
  ["Contains Duplicate", "Hashing", "Determine whether an array contains a repeated value."],
  ["Valid Anagram", "Strings", "Determine whether two strings contain the same character frequencies."],
  ["Best Time to Buy and Sell Stock", "Arrays", "Find the maximum profit from one buy followed by one sale."],
  ["Valid Parentheses", "Stacks", "Validate that every bracket closes in the correct order."],
  ["Binary Search", "Searching", "Find a target in a sorted collection in logarithmic time."],
  ["Merge Intervals", "Intervals", "Merge all overlapping ranges into disjoint intervals."],
  ["Product Except Self", "Arrays", "Build output products without using division."],
  ["Maximum Subarray", "Dynamic Programming", "Find the contiguous subarray with the greatest sum."],
  ["Linked List Cycle", "Linked Lists", "Detect whether a linked list contains a cycle."],
  ["Reverse Linked List", "Linked Lists", "Reverse all links in a singly linked list."],
  ["Binary Tree Level Order", "Trees", "Return tree values grouped by breadth-first level."],
  ["Kth Largest Element", "Heaps", "Find the kth largest value without fully sorting the input."],
  ["Number of Islands", "Graphs", "Count connected land components in a two-dimensional grid."],
  ["Course Schedule", "Graphs", "Determine whether prerequisite dependencies contain a cycle."],
  ["Coin Change", "Dynamic Programming", "Find the minimum number of coins needed for an amount."],
  ["Climbing Stairs", "Dynamic Programming", "Count distinct ways to reach the final stair."],
  ["Longest Unique Substring", "Sliding Window", "Find the longest substring without repeated characters."],
  ["Top K Frequent Elements", "Hashing and Heaps", "Return the values that occur most frequently."],
  ["LRU Cache", "Design", "Design a fixed-capacity cache with constant-time access and eviction."],
];

function localAptitudeQuestions({ category, difficulty, count }) {
  return generateOfflineQuestions({ category, difficulty, count });
}

export function normalizeQuestionBatchResponse(config, response) {
  const requestedCount = Math.max(1, Math.min(50, Math.round(Number(config?.count) || 30)));
  if (!response || typeof response !== "object" || !Array.isArray(response.questions)) return null;

  let questions = [];
  if (config.kind === "aptitude") {
    questions = normalizeGeneratedAptitudeQuestions(response.questions);
  } else if (config.kind === "coding") {
    questions = normalizeCodingProblems(response.questions);
  } else if (config.kind === "interview") {
    if (response.questions.length >= 1 && response.questions.length <= 8) {
      questions = response.questions.map((item) => ({
        question: typeof item?.question === "string" ? item.question.trim().slice(0, 1500) : "",
        focus: typeof item?.focus === "string" && item.focus.trim()
          ? item.focus.trim().slice(0, 160)
          : "General",
      }));
      if (questions.some((item) => !item.question)) questions = [];
    }
  }

  if (questions.length !== requestedCount) return null;
  return {
    ...response,
    questions,
    source: typeof response.source === "string" ? response.source : "llm",
  };
}

function invalidBatchError() {
  const error = new Error("The question provider returned an incomplete or invalid batch.");
  error.status = 502;
  return error;
}

export async function generateAptitudeSession(config) {
  const count = Math.max(30, Math.min(50, Number(config.count) || 30));
  if (hasRemoteApi) {
    try {
      const response = await authorizedRequest("/api/questions/generate", {
        method: "POST",
        timeoutMs: 90000,
        body: JSON.stringify({ kind: "aptitude", ...config, count }),
      });
      const normalized = normalizeQuestionBatchResponse({ kind: "aptitude", ...config, count }, response);
      if (!normalized) throw invalidBatchError();
      return normalized;
    } catch (error) {
      if (![0, 429, 502, 503].includes(error.status)) throw error;
    }
  }
  return { questions: localAptitudeQuestions({ ...config, count }), source: "curated-fallback" };
}

export function getLocalCodingBatch(config = {}) {
  const count = Math.max(1, Math.min(50, Number(config.count) || 30));
  const offset = Math.max(0, Math.min(999, Number(config.offset) || 0));
  const difficulty = ["easy", "medium", "hard"].includes(config.difficulty) ? config.difficulty : "medium";
  const sessionNonce = `${Date.now()}-${Math.random()}`;
  const scenarioNames = ["event stream", "student portal", "task scheduler", "analytics dashboard", "message service", "inventory system"];
  return randomizeQuestions(Array.from({ length: Math.min(count, 1000 - offset) }, (_, index) => {
    const catalogIndex = offset + index;
    const [title, topic, description] = codingPatterns[catalogIndex % codingPatterns.length];
    const variation = Math.floor(catalogIndex / codingPatterns.length) + 1;
    const scenarioIndex = Math.abs(Array.from(`${sessionNonce}-${catalogIndex}`).reduce((total, character) => total + character.charCodeAt(0), 0)) % scenarioNames.length;
    const inputLimit = 100 + (Math.floor(Math.random() * 9900));
    return {
      id: `coding-catalog-${catalogIndex + 1}`,
      title: `${title} · Variation ${variation}`,
      question: `${description} Apply it to a ${scenarioNames[scenarioIndex]} with up to ${inputLimit.toLocaleString("en-US")} records.`,
      topic,
      description: `${description} This fresh variation uses a ${scenarioNames[scenarioIndex]}; explain the approach, complexity, and edge cases before implementing it.`,
      difficulty,
      constraints: [
        `Catalog problem ${catalogIndex + 1} of 1,000`,
        `Use ${config.language || "JavaScript"} and support 0 to ${inputLimit.toLocaleString("en-US")} input records`,
        variation % 2 ? "Prefer an asymptotically efficient solution" : "Include duplicate and boundary-value cases",
      ],
      example: `Solve the ${title} pattern with a small example, then verify one edge case.`,
      hints: [`Identify the ${topic.toLowerCase()} invariant.`, "Write the brute-force approach before optimizing it."],
      language: config.language || "JavaScript",
    };
  }));
}

export async function generateQuestionBatch(config) {
  if (hasRemoteApi) {
    try {
      const response = await authorizedRequest("/api/questions/generate", {
        method: "POST",
        timeoutMs: 90000,
        body: JSON.stringify(config),
      });
      const normalized = normalizeQuestionBatchResponse(config, response);
      if (!normalized) throw invalidBatchError();
      return normalized;
    } catch (error) {
      if (config.kind !== "coding" || ![0, 429, 502, 503].includes(error.status)) throw error;
    }
  }
  if (config.kind === "coding") {
    return { questions: getLocalCodingBatch(config), source: "catalog-fallback", catalogSize: 1000 };
  }
  throw new Error("Connect the backend and configure its LLM to generate this question batch.");
}

export async function reviewCodingSolution(payload) {
  return authorizedRequest("/api/code/review", { method: "POST", expireSession: false, timeoutMs: 65000, body: JSON.stringify(payload) });
}

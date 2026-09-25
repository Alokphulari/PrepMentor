import { randomizeQuestions } from "./questionRandomization.js";

let generationSequence = 0;

function hashSeed(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = hashSeed(seed);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function integer(random, minimum, maximum) {
  return Math.floor(random() * (maximum - minimum + 1)) + minimum;
}

function choices(answer, candidates, random) {
  const values = [String(answer), ...candidates.map(String)].filter((value, index, all) => all.indexOf(value) === index);
  let step = 1;
  while (values.length < 4) {
    values.push(String(Number(answer) + step));
    step += 1;
  }
  return randomizeQuestions([{ options: values.slice(0, 4) }], random)[0].options;
}

function quantitativeQuestion(random, index, difficulty) {
  const scale = difficulty === "hard" ? 3 : difficulty === "medium" ? 2 : 1;
  switch (index % 6) {
    case 0: {
      const percent = integer(random, 1, 6) * 5;
      const base = integer(random, 2 * scale, 20 * scale) * 20;
      const answer = (base * percent) / 100;
      return { question: `What is ${percent}% of ${base}?`, answer, options: choices(answer, [answer + 10, answer - 5, answer * 2], random), topic: "Percentages" };
    }
    case 1: {
      const start = integer(random, 4, 30) * scale;
      const step = integer(random, 2, 12);
      const answer = start + step;
      return { question: `Find the average of ${start}, ${start + step}, and ${start + (2 * step)}.`, answer, options: choices(answer, [start, answer + step, answer - step], random), topic: "Averages" };
    }
    case 2: {
      const speed = integer(random, 4, 14) * 5;
      const hours = integer(random, 2, 6);
      const answer = speed * hours;
      return { question: `A vehicle travels at ${speed} km/h for ${hours} hours. How far does it travel?`, answer: `${answer} km`, options: choices(`${answer} km`, [`${answer + speed} km`, `${answer - speed} km`, `${speed + hours} km`], random), topic: "Speed and Distance" };
    }
    case 3: {
      const left = integer(random, 2, 8);
      const right = integer(random, 2, 8);
      const multiplier = integer(random, 3, 12) * scale;
      const answer = right * multiplier;
      return { question: `The ratio of designers to developers is ${left}:${right}. If there are ${left * multiplier} designers, how many developers are there?`, answer, options: choices(answer, [left * multiplier, answer + right, answer - right], random), topic: "Ratios" };
    }
    case 4: {
      const cost = integer(random, 4, 25) * 100;
      const profit = integer(random, 1, 5) * 5;
      const answer = cost + ((cost * profit) / 100);
      return { question: `An item costs Rs ${cost} and is sold at a ${profit}% profit. What is its selling price?`, answer: `Rs ${answer}`, options: choices(`Rs ${answer}`, [`Rs ${cost}`, `Rs ${answer + 100}`, `Rs ${answer - 100}`], random), topic: "Profit and Loss" };
    }
    default: {
      const x = integer(random, 2, 15) * scale;
      const coefficient = integer(random, 2, 7);
      const constant = integer(random, 2, 20);
      const total = (coefficient * x) + constant;
      return { question: `If ${coefficient}x + ${constant} = ${total}, what is x?`, answer: x, options: choices(x, [x + 1, x - 1, x + coefficient], random), topic: "Algebra" };
    }
  }
}

function logicalQuestion(random, index) {
  const start = integer(random, 1, 20);
  const step = integer(random, 2, 9);
  if (index % 3 === 0) {
    const answer = start + (4 * step);
    return { question: `Complete the sequence: ${start}, ${start + step}, ${start + (2 * step)}, ${start + (3 * step)}, ?`, answer, options: choices(answer, [answer + step, answer - step, answer + 1], random), topic: "Number Series" };
  }
  if (index % 3 === 1) {
    const factor = integer(random, 2, 4);
    const answer = start * factor * factor * factor;
    return { question: `What comes next: ${start}, ${start * factor}, ${start * factor * factor}, ?`, answer, options: choices(answer, [answer + factor, answer - factor, start * factor * 4], random), topic: "Pattern Recognition" };
  }
  const position = integer(random, 2, 12);
  const answer = position % 4 === 0 ? "South" : position % 4 === 1 ? "East" : position % 4 === 2 ? "North" : "West";
  return { question: `A person starts facing North and turns right ${position} times. Which direction are they facing?`, answer, options: randomizeQuestions([{ options: ["North", "East", "South", "West"] }], random)[0].options, topic: "Directions" };
}

const verbalItems = [
  ["synonym", "concise", "brief", ["lengthy", "vague", "noisy"]],
  ["synonym", "diligent", "hardworking", ["careless", "idle", "uncertain"]],
  ["synonym", "vivid", "bright", ["dull", "silent", "weak"]],
  ["antonym", "scarce", "abundant", ["rare", "limited", "small"]],
  ["antonym", "expand", "contract", ["enlarge", "explain", "extend"]],
  ["antonym", "optimistic", "pessimistic", ["hopeful", "cheerful", "confident"]],
];

function verbalQuestion(random, index) {
  const item = verbalItems[(index + integer(random, 0, verbalItems.length - 1)) % verbalItems.length];
  const contexts = ["During a client discussion", "In a project report", "While reviewing an email", "In a team presentation"];
  const context = contexts[integer(random, 0, contexts.length - 1)];
  return {
    question: `${context}, choose the ${item[0]} of “${item[1]}”.`,
    answer: item[2],
    options: choices(item[2], item[3], random),
    topic: item[0] === "synonym" ? "Synonyms" : "Antonyms",
  };
}

const programmingItems = [
  ["Which data structure processes elements in FIFO order?", "Queue", ["Stack", "Heap", "Set"], "Data Structures"],
  ["What is the lookup complexity of a well-distributed hash table on average?", "O(1)", ["O(log n)", "O(n)", "O(n^2)"], "Complexity"],
  ["Which traversal normally uses a queue?", "BFS", ["DFS", "Inorder", "Postorder"], "Graphs"],
  ["What must a recursive solution include to terminate?", "A base case", ["A heap", "A compiler flag", "A queue"], "Recursion"],
  ["Which algorithm finds shortest paths with non-negative edge weights?", "Dijkstra's algorithm", ["DFS", "Merge sort", "Binary search"], "Graphs"],
  ["Which technique caches results of overlapping subproblems?", "Dynamic programming", ["Greedy selection", "Linear scanning", "Hash collision"], "Algorithms"],
  ["What is direct array-index access complexity?", "O(1)", ["O(log n)", "O(n)", "O(n^2)"], "Arrays"],
  ["Which structure follows LIFO order?", "Stack", ["Queue", "Graph", "Hash table"], "Data Structures"],
  ["Which sorting method guarantees O(n log n) worst-case time here?", "Merge sort", ["Bubble sort", "Insertion sort", "Quick sort"], "Sorting"],
  ["Which BST traversal returns keys in sorted order?", "Inorder", ["Preorder", "Postorder", "Level order"], "Trees"],
];

function programmingQuestion(random, index, difficulty) {
  const item = programmingItems[(index + integer(random, 0, programmingItems.length - 1)) % programmingItems.length];
  const size = integer(random, difficulty === "hard" ? 500 : 20, difficulty === "hard" ? 10000 : 500);
  const contexts = ["an interview exercise", "a debugging round", "a code-review task", "an algorithm sprint"];
  return {
    question: `For ${contexts[integer(random, 0, contexts.length - 1)]} handling about ${size} items: ${item[0]}`,
    answer: item[1],
    options: choices(item[1], item[2], random),
    topic: item[3],
  };
}

export function generateOfflineQuestions({ category = "quantitative", difficulty = "medium", count = 30, seed } = {}) {
  generationSequence += 1;
  const sessionSeed = seed ?? `${Date.now()}-${generationSequence}-${Math.random()}`;
  const random = seededRandom(sessionSeed);
  const safeCount = Math.max(1, Math.min(50, Math.round(Number(count) || 30)));
  const factory = category === "programming"
    ? programmingQuestion
    : category === "verbal"
      ? verbalQuestion
      : category === "logical" || category === "focus"
        ? logicalQuestion
        : quantitativeQuestion;

  const questions = Array.from({ length: safeCount }, (_, index) => {
    const question = factory(random, index, difficulty);
    return {
      id: `offline-${category}-${hashSeed(sessionSeed)}-${index}`,
      ...question,
      answer: String(question.answer),
      options: question.options.map(String),
    };
  });
  return randomizeQuestions(questions, random);
}

export function generatePlacementAptitudeQuestions({ difficulty = "medium", count = 30, seed } = {}) {
  const safeCount = Math.max(1, Math.min(50, Math.round(Number(count) || 30)));
  const categories = ["quantitative", "logical", "verbal"].slice(0, Math.min(safeCount, 3));
  const baseCount = Math.floor(safeCount / categories.length);
  const remainder = safeCount % categories.length;
  const questions = categories.flatMap((category, index) => generateOfflineQuestions({
    category,
    difficulty,
    count: baseCount + (index < remainder ? 1 : 0),
    seed: seed ? `${seed}-${category}` : undefined,
  }));
  return randomizeQuestions(questions);
}

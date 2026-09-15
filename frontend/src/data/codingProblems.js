export const codingProblems = [
  {
    id: "two-sum", title: "Two Sum", difficulty: "Easy", topic: "Hashing",
    description: "Return the indices of two values whose sum equals the target. Each input has exactly one valid answer.",
    constraints: ["2 ≤ numbers.length ≤ 10,000", "Do not use the same element twice", "Return indices, not values"],
    example: "Input: numbers = [2, 7, 11, 15], target = 9\nOutput: [0, 1]",
    hints: ["A nested loop works, but scales poorly.", "Store each visited value and its index in a map."],
    tokens: { JavaScript: ["Map", "return"], Python: ["enumerate", "return"], Java: ["HashMap", "return"] },
    templates: {
      JavaScript: "function twoSum(numbers, target) {\n  // Write your solution here\n  \n}",
      Python: "def two_sum(numbers, target):\n    # Write your solution here\n    pass",
      Java: "int[] twoSum(int[] numbers, int target) {\n    // Write your solution here\n    return new int[]{};\n}",
    },
  },
  {
    id: "valid-parentheses", title: "Valid Parentheses", difficulty: "Medium", topic: "Stacks",
    description: "Given a string containing brackets, determine whether every opening bracket is closed in the correct order.",
    constraints: ["1 ≤ input.length ≤ 10,000", "Input contains only ()[]{}", "Every close bracket must match the latest open bracket"],
    example: "Input: \"{[()]}\"\nOutput: true",
    hints: ["The most recent unmatched opening bracket matters first.", "Map each closing bracket to its expected opening bracket."],
    tokens: { JavaScript: ["push", "pop", "return"], Python: ["append", "pop", "return"], Java: ["Stack", "pop", "return"] },
    templates: {
      JavaScript: "function isValid(input) {\n  // Write your solution here\n  \n}",
      Python: "def is_valid(input_string):\n    # Write your solution here\n    pass",
      Java: "boolean isValid(String input) {\n    // Write your solution here\n    return false;\n}",
    },
  },
  {
    id: "longest-substring", title: "Longest Unique Substring", difficulty: "Hard", topic: "Sliding Window",
    description: "Return the length of the longest substring that contains no repeated characters.",
    constraints: ["0 ≤ input.length ≤ 50,000", "The substring must be contiguous", "Aim for linear time"],
    example: "Input: \"abcabcbb\"\nOutput: 3\nExplanation: \"abc\" is the longest unique substring.",
    hints: ["Track the current window boundaries.", "When a character repeats, move the left boundary past its previous index."],
    tokens: { JavaScript: ["Map", "Math.max", "return"], Python: ["enumerate", "max", "return"], Java: ["HashMap", "Math.max", "return"] },
    templates: {
      JavaScript: "function longestUniqueSubstring(input) {\n  // Write your solution here\n  \n}",
      Python: "def longest_unique_substring(input_string):\n    # Write your solution here\n    pass",
      Java: "int longestUniqueSubstring(String input) {\n    // Write your solution here\n    return 0;\n}",
    },
  },
];

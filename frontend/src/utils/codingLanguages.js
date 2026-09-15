export const CODING_LANGUAGES = ["JavaScript", "TypeScript", "Python", "Java", "C++", "C", "C#", "Go"];

export function getStarterCode(language, title = "solution") {
  const words = title.replace(/[^a-zA-Z0-9 ]/g, "").trim().split(/\s+/);
  const name = words.map((word, index) => index ? word[0].toUpperCase() + word.slice(1) : word.toLowerCase()).join("") || "solution";
  const templates = {
    JavaScript: `function ${name}(input) {\n  // Write your solution here\n}\n`,
    TypeScript: `function ${name}(input: unknown): unknown {\n  // Write your solution here\n}\n`,
    Python: `def ${name}(input_value):\n    # Write your solution here\n    pass\n`,
    Java: `Object ${name}(Object input) {\n    // Write your solution here\n    return null;\n}\n`,
    "C++": `auto ${name}(const auto& input) {\n    // Write your solution here\n}\n`,
    C: `void ${name}(void *input) {\n    /* Write your solution here */\n}\n`,
    "C#": `object ${name}(object input) {\n    // Write your solution here\n    return null;\n}\n`,
    Go: `func ${name}(input any) any {\n    // Write your solution here\n    return nil\n}\n`,
  };
  return templates[language] || templates.JavaScript;
}

export function getValidationTokens() {
  return ["return"];
}

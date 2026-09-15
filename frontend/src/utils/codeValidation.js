export function stripCodeComments(code, language) {
  const source = typeof code === "string" ? code : "";
  if (language === "Python") {
    return source.split("\n").map((line) => line.replace(/#.*$/, "")).join("\n");
  }
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

export function validateCodeTokens(code, language, requiredTokens) {
  const source = stripCodeComments(code, language);
  const tokens = Array.isArray(requiredTokens) ? requiredTokens : [];
  return tokens.map((token, index) => ({
    name: index === 0 ? "Uses an appropriate data structure" : index === tokens.length - 1 ? "Returns a result" : "Includes the core operation",
    passed: typeof token === "string" && token.length > 0 && source.includes(token),
    detail: `Static check for “${token}”`,
  }));
}

export function normalizeCodeDrafts(value, defaults) {
  const saved = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const normalized = Object.fromEntries(Object.entries(defaults).map(([key, template]) => [
    key,
    typeof saved[key] === "string" ? saved[key].slice(0, 100_000) : template,
  ]));
  const dynamicKey = /^coding(?:-catalog)?-\d+:(?:JavaScript|TypeScript|Python|Java|C\+\+|C|C#|Go)$/;
  Object.entries(saved).slice(-250).forEach(([key, code]) => {
    if (dynamicKey.test(key) && typeof code === "string") normalized[key] = code.slice(0, 100_000);
  });
  return normalized;
}

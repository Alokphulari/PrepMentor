import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeCodeDrafts, validateCodeTokens } from "../src/utils/codeValidation.js";

test("static code checks ignore tokens that appear only in comments", () => {
  const checks = validateCodeTokens("// use Map and return here\nconst values = [];", "JavaScript", ["Map", "return"]);
  assert.deepEqual(checks.map((check) => check.passed), [false, false]);
  const implemented = validateCodeTokens("const seen = new Map();\nreturn seen;", "JavaScript", ["Map", "return"]);
  assert.deepEqual(implemented.map((check) => check.passed), [true, true]);
});

test("coding draft normalization preserves supported strings only", () => {
  const defaults = { "one:JavaScript": "template", "one:Python": "template" };
  assert.deepEqual(normalizeCodeDrafts({ "one:JavaScript": "solution", "one:Python": 42, unknown: "ignored" }, defaults), {
    "one:JavaScript": "solution",
    "one:Python": "template",
  });
});

test("coding draft normalization retains safe generated catalog drafts", () => {
  const normalized = normalizeCodeDrafts({
    "coding-catalog-1000:C++": "return answer;",
    "coding-42:Go": "return value",
    "../../unsafe:JavaScript": "secret",
  }, {});
  assert.deepEqual(normalized, {
    "coding-catalog-1000:C++": "return answer;",
    "coding-42:Go": "return value",
  });
});

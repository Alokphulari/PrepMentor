import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCodeReviewRequest } from "../src/codeReviewer.js";

test("code review requests validate content and supported languages", () => {
  assert.deepEqual(normalizeCodeReviewRequest({ code: " return 1; ", problem: " Solve it ", language: "Python" }), {
    code: "return 1;",
    problem: "Solve it",
    language: "Python",
  });
  assert.throws(() => normalizeCodeReviewRequest({ code: "x", problem: "y", language: "Ruby" }), /Unsupported review language/);
  assert.throws(() => normalizeCodeReviewRequest({ code: "", problem: "Missing" }), /requires a problem and solution/);
});

test("code review requests enforce payload bounds", () => {
  const request = normalizeCodeReviewRequest({ code: "a".repeat(60_000), problem: "b".repeat(6_000) });
  assert.equal(request.code.length, 50_000);
  assert.equal(request.problem.length, 5_000);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { createRateLimiter } from "../src/rateLimit.js";

test("rate limiter blocks attempts until its window resets", () => {
  let currentTime = 1_000;
  const check = createRateLimiter({ limit: 2, windowMs: 5_000, now: () => currentTime });

  assert.deepEqual(check("client"), { allowed: true, remaining: 1, retryAfter: 5 });
  assert.equal(check("client").allowed, true);
  assert.equal(check("client").allowed, false);
  currentTime += 5_000;
  assert.equal(check("client").allowed, true);
});

test("rate limiter tracks clients independently and bounds stored keys", () => {
  const check = createRateLimiter({ limit: 1, maxEntries: 2 });
  assert.equal(check("first").allowed, true);
  assert.equal(check("second").allowed, true);
  assert.equal(check("third").allowed, true);
  assert.equal(check("first").allowed, true);
});

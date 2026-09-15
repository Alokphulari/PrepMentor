import assert from "node:assert/strict";
import test from "node:test";
import { authorizedRequest } from "../src/services/authService.js";

test("background sync does not broadcast logout when its token is unavailable", async () => {
  const previousWindow = globalThis.window;
  const previousSessionStorage = globalThis.sessionStorage;
  let expiredEvents = 0;
  globalThis.window = { dispatchEvent: () => { expiredEvents += 1; } };
  globalThis.sessionStorage = { getItem: () => null };
  try {
    await assert.rejects(authorizedRequest("/api/history", { expireSession: false }), /session has expired/i);
    assert.equal(expiredEvents, 0);
    await assert.rejects(authorizedRequest("/api/auth/me"), /session has expired/i);
    assert.equal(expiredEvents, 1);
  } finally {
    globalThis.window = previousWindow;
    globalThis.sessionStorage = previousSessionStorage;
  }
});

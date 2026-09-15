import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { getAccountStorageKey, readStorage, writeStorage } from "../src/utils/storage.js";

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
});

afterEach(() => {
  delete globalThis.localStorage;
});

test("account storage keys isolate users", () => {
  assert.equal(getAccountStorageKey("history", { id: "USER-123" }), "history:user-123");
  assert.equal(getAccountStorageKey("history", { email: "Student+Test@example.com" }), "history:student%2Btest%40example.com");
  assert.notEqual(
    getAccountStorageKey("history", { id: "first-user" }),
    getAccountStorageKey("history", { id: "second-user" })
  );
});

test("storage helpers serialize and restore values", () => {
  assert.equal(writeStorage("test-key", { score: 82 }), true);
  assert.deepEqual(readStorage("test-key", null), { score: 82 });
  assert.deepEqual(readStorage("missing-key", []), []);
});

test("storage helpers fail safely when browser storage is denied", () => {
  const originalError = console.error;
  console.error = () => {};
  globalThis.localStorage = {
    getItem() { throw new Error("Storage denied"); },
    setItem() { throw new Error("Storage denied"); },
    removeItem() { throw new Error("Storage denied"); },
  };
  try {
    assert.deepEqual(readStorage("blocked-key", { safe: true }), { safe: true });
    assert.equal(writeStorage("blocked-key", { value: 1 }), false);
  } finally {
    console.error = originalError;
  }
});

test("corrupted JSON is removed and replaced by the fallback", () => {
  globalThis.localStorage.setItem("corrupted-key", "{invalid-json");
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.deepEqual(readStorage("corrupted-key", []), []);
    assert.equal(globalThis.localStorage.getItem("corrupted-key"), null);
  } finally {
    console.error = originalError;
  }
});

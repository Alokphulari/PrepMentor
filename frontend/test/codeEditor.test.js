import test from "node:test";
import assert from "node:assert/strict";
import { editCodeWithKeyboard } from "../src/utils/codeEditor.js";

test("code editor inserts two spaces for Tab", () => {
  assert.deepEqual(editCodeWithKeyboard("ab", 1, 1, "Tab"), { value: "a  b", selection: 3 });
});

test("code editor preserves indentation on Enter", () => {
  assert.deepEqual(editCodeWithKeyboard("  return value;", 15, 15, "Enter"), { value: "  return value;\n  ", selection: 18 });
});

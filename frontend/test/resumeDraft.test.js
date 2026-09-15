import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeResumeDraft, RESUME_SECTIONS, shouldUseRemoteResume } from "../src/utils/resumeDraft.js";

test("legacy resume drafts receive all supported sections", () => {
  const draft = normalizeResumeDraft({ name: "Student", education: [{ title: "B.Tech" }] });
  assert.equal(draft.name, "Student");
  assert.deepEqual(draft.education, [{ title: "B.Tech" }]);
  RESUME_SECTIONS.forEach((section) => assert.equal(Array.isArray(draft[section]), true));
});

test("resume draft normalization rejects malformed section items", () => {
  const draft = normalizeResumeDraft({ projects: [null, "bad", { title: "Valid" }], certifications: {} });
  assert.deepEqual(draft.projects, [{ title: "Valid" }]);
  assert.deepEqual(draft.certifications, []);
});

test("resume synchronization keeps the newest timestamped draft", () => {
  const older = { updatedAt: "2026-09-05T10:00:00.000Z" };
  const newer = { updatedAt: "2026-09-05T11:00:00.000Z" };
  assert.equal(shouldUseRemoteResume(older, newer), true);
  assert.equal(shouldUseRemoteResume(newer, older), false);
  assert.equal(shouldUseRemoteResume(null, newer), true);
  assert.equal(shouldUseRemoteResume(newer, null), false);
});

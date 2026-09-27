import assert from "node:assert/strict";
import test from "node:test";

import { normalizeVoiceMentorRequest, normalizeVoiceMentorResponse, voiceMentorReply } from "../src/voiceMentor.js";

test("voice mentor normalizes bounded learner context", () => {
  const request = normalizeVoiceMentorRequest({ message: "  practice coding  ", context: { path: "/dashboard", name: "Aarav" } });
  assert.equal(request.message, "practice coding");
  assert.equal(request.context.name, "Aarav");
});

test("voice mentor returns only the validated assistant contract", async () => {
  const result = await voiceMentorReply({ message: "What should I do next?" }, async (_instruction, data, validate) => validate({ reply: `Try learning from ${data.context.path}.`, intent: "learning" }));
  assert.deepEqual(result, { reply: "Try learning from /dashboard.", intent: "learning" });
  assert.throws(() => normalizeVoiceMentorResponse({ reply: "", intent: "none" }), /Invalid value/);
});

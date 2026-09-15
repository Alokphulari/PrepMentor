import assert from "node:assert/strict";
import test from "node:test";

import { normalizeAudioPayload, normalizeSpeechPrompt } from "../src/speechTranscription.js";

test("speech payload accepts bounded supported audio", () => {
  const result = normalizeAudioPayload({ audio: Buffer.from("audio").toString("base64"), mimeType: "audio/webm;codecs=opus" });
  assert.equal(result.mimeType, "audio/webm");
  assert.equal(result.buffer.toString(), "audio");
});

test("speech payload rejects malformed and unsupported audio", () => {
  assert.throws(() => normalizeAudioPayload({ audio: "%%%", mimeType: "audio/webm" }), /base64/);
  assert.throws(() => normalizeAudioPayload({ audio: "YQ==", mimeType: "text/plain" }), /Unsupported/);
});

test("speech synthesis accepts bounded text and rejects empty prompts", () => {
  assert.equal(normalizeSpeechPrompt({ input: "  Explain closures.  " }), "Explain closures.");
  assert.equal(normalizeSpeechPrompt({ input: "a".repeat(5000) }).length, 4000);
  assert.throws(() => normalizeSpeechPrompt({ input: " " }), /Speech text is required/);
});

import assert from "node:assert/strict";
import test from "node:test";

import { detectVoiceIntent, localVoiceReply, voiceHelpReply } from "../src/utils/voiceMentor.js";

test("voice mentor recognizes major PrepMentor destinations", () => {
  assert.equal(detectVoiceIntent("start aptitude practice").intent, "aptitude");
  assert.equal(detectVoiceIntent("continue my placement journey").route, "/placement");
  assert.equal(detectVoiceIntent("open my resume").intent, "resume");
  assert.equal(detectVoiceIntent("show performance analytics").intent, "performance");
});

test("voice mentor gives a useful fallback for conversational requests", () => {
  assert.equal(detectVoiceIntent("what can you do").intent, "unknown");
  assert.match(voiceHelpReply(), /aptitude/i);
  assert.match(localVoiceReply("coding", "Aarav"), /coding/i);
});

import assert from "node:assert/strict";
import test from "node:test";

import { detectVoiceIntent, localVoiceAnswer, localVoiceReply, voiceHelpReply } from "../src/utils/voiceMentor.js";

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

test("offline voice mentor answers common guidance questions", () => {
  assert.match(localVoiceAnswer("What should I work on next?"), /Performance|Learning/);
  assert.match(localVoiceAnswer("How am I doing?"), /Performance/);
  assert.match(localVoiceAnswer("I need coding help"), /Coding Practice/);
});

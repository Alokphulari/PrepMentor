import test from "node:test";
import assert from "node:assert/strict";
import { remoteInterviewView } from "../src/utils/remoteInterview.js";
import { normalizeInterviewSession } from "../src/utils/interviewSession.js";
import { voiceInputCapabilities, recordingMimeType } from "../src/utils/speechCapabilities.js";

const config = { remoteSessionId: "remote", role: "Software Engineer", createdAt: new Date().toISOString(), duration: 20, mode: "practice" };
test("remote progress safely restores every turn beyond eight without fake slots", () => {
  for (let count = 0; count < 20; count++) {
    const turns = Array.from({ length: count }, (_, index) => ({ question: `Past ${index}`, transcript: `Answer ${index}` }));
    const session = { config, status: "active", turns, currentQuestion: { question: `Next ${count}` } };
    const view = remoteInterviewView(session);
    assert.equal(view.index, count);
    assert.equal(view.question.question, `Next ${count}`);
    const restored = normalizeInterviewSession({ config, index: count, questions: [], answers: { ...view.answers, [count]: "Unsubmitted draft" } });
    assert.deepEqual(restored.questions, []);
    assert.equal(restored.answers[count], "Unsubmitted draft");
  }
});
test("practice restores feedback while placement keeps the next question private until answered", () => {
  const session = { config, turns: [{ question: "Previous", transcript: "Answer", answerEvaluation: { score: 80 } }], currentQuestion: { question: "Next" } };
  assert.equal(remoteInterviewView(session, true).question.question, "Previous");
  assert.equal(remoteInterviewView(session, false).index, 1);
  assert.equal(remoteInterviewView({ ...session, config: { mode: "placement" } }, true).feedback, null);
});
test("completed and malformed remote sessions never access a missing question", () => {
  assert.equal(remoteInterviewView({ config, turns: [], status: "completed", result: { id: "report" } }).question, null);
  assert.throws(() => remoteInterviewView({ config, turns: [], status: "active" }), /question/);
  assert.throws(() => remoteInterviewView({ config, turns: [], status: "completed" }), /report/);
});
test("MediaRecorder alone is not transcription and backend STT requires microphone support", () => {
  const browser = { MediaRecorder: {} };
  assert.equal(voiceInputCapabilities({}, browser, { getUserMedia() {} }).available, false);
  assert.equal(voiceInputCapabilities({ stt: true }, browser, {}).available, false);
  assert.equal(voiceInputCapabilities({ stt: true }, browser, { getUserMedia() {} }).backend, true);
  assert.equal(voiceInputCapabilities({}, { webkitSpeechRecognition: {} }, {}).recognition, true);
});
test("recording chooses only supported audio MIME types", () => {
  for (const mime of ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]) {
    assert.equal(recordingMimeType({ isTypeSupported: (type) => type === mime }), mime);
  }
  assert.equal(recordingMimeType({ isTypeSupported: () => false }), undefined);
});

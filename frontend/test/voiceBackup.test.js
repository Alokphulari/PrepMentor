import test from "node:test";
import assert from "node:assert/strict";
import { createVoiceBackup } from "../src/utils/voiceBackup.js";

test("backup waits for the final audio chunk, finishes once, and releases its microphone", async () => {
  let recorder;
  let stops = 0;
  let released = 0;
  class Recorder {
    static isTypeSupported() { return true; }
    constructor() { recorder = this; this.state = "inactive"; this.mimeType = "audio/webm"; }
    start() { this.state = "recording"; }
    stop() { stops++; this.state = "inactive"; }
  }
  const backup = createVoiceBackup({ getTracks: () => [{ stop() { released++; } }] }, () => {}, { MediaRecorder: Recorder });
  const first = backup.finish();
  const second = backup.finish();
  assert.equal(stops, 1);
  assert.equal(released, 0);
  recorder.ondataavailable({ data: new Blob(["last audio chunk"]) });
  recorder.onstop();
  assert.equal(await (await first).text(), "last audio chunk");
  assert.equal(await first, await second);
  assert.equal(released, 1);
  backup.cancel();
  assert.equal(released, 1);
});

test("cancellation discards audio and releases microphone even without recorder support", async () => {
  let released = 0;
  const backup = createVoiceBackup({ getTracks: () => [{ stop() { released++; } }] }, () => {}, {});
  backup.cancel();
  assert.equal(await backup.finish(), null);
  assert.equal(released, 1);
  assert.equal(backup.heardAudio, null);
});

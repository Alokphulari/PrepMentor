import { recordingMimeType } from "./speechCapabilities.js";

// Keep the same utterance available if browser recognition ends without text.
// Audio stays in memory and is released after transcription or cancellation.
export function createVoiceBackup(stream, onSignal = () => {}, browser = window) {
  let recorder;
  let context;
  let monitor;
  let stopTimer;
  let done = false;
  let stopping = false;
  let tooLarge = false;
  let bytes = 0;
  let heardAudio = null;
  const chunks = [];
  let settle;
  const result = new Promise((resolve) => { settle = resolve; });
  const release = () => {
    clearInterval(monitor);
    clearTimeout(stopTimer);
    stream.getTracks().forEach((track) => track.stop());
    if (context) void context.close().catch(() => {});
  };
  const complete = () => {
    if (done) return;
    done = true;
    release();
    settle(!tooLarge && chunks.length ? new Blob(chunks, { type: recorder?.mimeType || "audio/webm" }) : null);
    chunks.length = 0;
  };
  try {
    const AudioContext = browser.AudioContext || browser.webkitAudioContext;
    if (AudioContext) {
      context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      context.createMediaStreamSource(stream).connect(analyser);
      void context.resume().catch(() => {});
      const samples = new Uint8Array(analyser.fftSize);
      heardAudio = false;
      onSignal(false);
      monitor = setInterval(() => {
        analyser.getByteTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / samples.length);
        if (!heardAudio && rms > 0.008) { heardAudio = true; onSignal(true); }
      }, 100);
    }
  } catch { /* Recognition and recording remain usable without a level monitor. */ }
  try {
    if (browser.MediaRecorder) {
      const mimeType = recordingMimeType(browser.MediaRecorder);
      recorder = new browser.MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = ({ data }) => {
        if (done || !data.size) return;
        bytes += data.size;
        if (bytes > 6_000_000) { tooLarge = true; chunks.length = 0; if (recorder.state === "recording") recorder.stop(); return; }
        chunks.push(data);
      };
      recorder.onstop = complete;
      recorder.onerror = () => { tooLarge = true; complete(); };
      recorder.start(1000);
    }
  } catch { recorder = null; }
  return {
    get heardAudio() { return heardAudio; },
    finish() {
      if (!done && !stopping) {
        stopping = true;
        if (recorder?.state === "recording") {
          stopTimer = setTimeout(complete, 2000);
          try { recorder.stop(); } catch { complete(); }
        } else complete();
      }
      return result;
    },
    cancel() {
      tooLarge = true;
      complete();
      if (recorder?.state === "recording") { try { recorder.stop(); } catch { /* Already released. */ } }
    },
  };
}

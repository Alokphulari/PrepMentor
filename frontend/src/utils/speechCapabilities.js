export function voiceInputCapabilities(capabilities, browser = globalThis.window, media = globalThis.navigator?.mediaDevices) {
  const backend = Boolean(capabilities?.stt && browser?.MediaRecorder && media?.getUserMedia);
  const recognition = Boolean(browser?.SpeechRecognition || browser?.webkitSpeechRecognition);
  return { backend, recognition, available: backend || recognition };
}

export function recordingMimeType(Recorder) {
  return ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"].find((type) => Recorder.isTypeSupported?.(type));
}

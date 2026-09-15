const allowedAudioTypes = new Set(["audio/webm", "audio/ogg", "audio/mp4", "audio/wav", "audio/mpeg"]);

function providerBaseUrl() {
  return (process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
}

function requireLlm() {
  if (!process.env.LLM_API_KEY) {
    const error = new Error("AI speech is not configured on the backend. Add LLM_API_KEY to backend/.env.");
    error.status = 503;
    throw error;
  }
}

export function normalizeAudioPayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Audio payload is required.");
  const mimeType = String(value.mimeType || "").split(";")[0].toLowerCase();
  if (!allowedAudioTypes.has(mimeType)) throw new Error("Unsupported audio format.");
  const audio = typeof value.audio === "string" ? value.audio : "";
  if (!audio || !/^[A-Za-z0-9+/]+={0,2}$/.test(audio)) throw new Error("Valid base64 audio is required.");
  const buffer = Buffer.from(audio, "base64");
  if (!buffer.length || buffer.length > 6_000_000) throw new Error("Audio must be between 1 byte and 6 MB.");
  return { buffer, mimeType };
}

export async function transcribeSpeech(value) {
  requireLlm();
  const { buffer, mimeType } = normalizeAudioPayload(value);
  const extension = mimeType.split("/")[1].replace("mpeg", "mp3");
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mimeType }), `interview-answer.${extension}`);
  form.append("model", process.env.LLM_TRANSCRIPTION_MODEL || "whisper-1");
  form.append("language", "en");
  const response = await fetch(`${providerBaseUrl()}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.LLM_API_KEY}` },
    body: form,
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) {
    const error = new Error(`The transcription provider returned status ${response.status}.`);
    error.status = 502;
    throw error;
  }
  const payload = await response.json();
  const transcript = typeof payload.text === "string" ? payload.text.trim().slice(0, 10000) : "";
  if (!transcript) {
    const error = new Error("No speech was detected in the recording.");
    error.status = 422;
    throw error;
  }
  return { transcript };
}

export function normalizeSpeechPrompt(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Speech prompt is required.");
  const input = typeof value.input === "string" ? value.input.trim().slice(0, 4000) : "";
  if (!input) throw new Error("Speech text is required.");
  return input;
}

export async function synthesizeSpeech(value) {
  requireLlm();
  const input = normalizeSpeechPrompt(value);
  const response = await fetch(`${providerBaseUrl()}/audio/speech`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.LLM_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.LLM_TTS_MODEL || "gpt-4o-mini-tts",
      voice: process.env.LLM_TTS_VOICE || "alloy",
      input,
      response_format: "mp3",
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) {
    const error = new Error(`The speech provider returned status ${response.status}.`);
    error.status = 502;
    throw error;
  }
  const audio = Buffer.from(await response.arrayBuffer());
  if (!audio.length || audio.length > 6_000_000) {
    const error = new Error("The speech provider returned invalid audio.");
    error.status = 502;
    throw error;
  }
  return { audio: audio.toString("base64"), mimeType: "audio/mpeg" };
}

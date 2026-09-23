import { demoMode } from "../services/interviewAIService.js";
import { interviewProviderConfig, interviewConfigured, transcribeGeminiAudio } from "./ai/interviewProvider.js";
import { providerConfig, providerRequest, isConfigured } from "./ai/aiClient.js";
const allowedAudioTypes = new Set(["audio/webm", "audio/ogg", "audio/mp4", "audio/wav", "audio/mpeg"]);


export function speechConfigured(kind) {
  if (demoMode()) return false;
  return kind === "tts" ? isConfigured("tts") : interviewConfigured(kind);
}

export function requireSpeechCapability(kind) {
  if (!["stt", "tts"].includes(kind) || !speechConfigured(kind)) {
    const error = new Error(`AI ${kind} is not configured on the server.`);
    error.status = 503;
    throw error;
  }
}

export function normalizeAudioPayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Audio payload is required.");
  const mimeType = String(value.mimeType || "").split(";")[0].trim().toLowerCase();
  if (!allowedAudioTypes.has(mimeType)) throw new Error("Unsupported audio format.");
  const audio = typeof value.audio === "string" ? value.audio : "";
  if (!audio || !/^[A-Za-z0-9+/]+={0,2}$/.test(audio)) throw new Error("Valid base64 audio is required.");
  const buffer = Buffer.from(audio, "base64");
  if (buffer.toString("base64") !== audio) throw new Error("Valid canonical base64 audio is required.");
  if (!buffer.length || buffer.length > 6_000_000) throw new Error("Audio must be between 1 byte and 6 MB.");
  const signatureMatches = {
    "audio/webm": buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])),
    "audio/ogg": buffer.toString("ascii", 0, 4) === "OggS",
    "audio/mp4": buffer.toString("ascii", 4, 8) === "ftyp",
    "audio/wav": buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WAVE",
    "audio/mpeg": buffer.toString("ascii", 0, 3) === "ID3" || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0),
  };
  if (buffer.length < 16 || !signatureMatches[mimeType]) throw new Error("Audio content does not match its declared format.");
  return { buffer, mimeType };
}

export async function transcribeSpeech(value) {
  requireSpeechCapability("stt");
  const { buffer, mimeType } = normalizeAudioPayload(value);
  if (interviewProviderConfig().provider === "gemini") return transcribeGeminiAudio(buffer, mimeType, { timeoutMs: 8000, retries: 0 });
  const extension = mimeType.split("/")[1].replace("mpeg", "mp3");
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mimeType }), `interview-answer.${extension}`);
  form.append("model", providerConfig("stt").model);
  form.append("language", "en");
  const response = await providerRequest("/audio/transcriptions", {
    kind: "stt", json: false,
    method: "POST",
    body: form,
    timeoutMs: 8000, retries: 0,
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
  requireSpeechCapability("tts");
  const input = normalizeSpeechPrompt(value);
  const response = await providerRequest("/audio/speech", {
    kind: "tts",
    method: "POST",
    body: {
      model: providerConfig("tts").model,
      voice: providerConfig("tts").voice,
      input,
      response_format: "mp3",
    },
    timeoutMs: 8000, retries: 0,
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

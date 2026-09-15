import { authorizedRequest } from "./authService.js";
import { apiRequest, hasRemoteApi } from "./api.js";

let speechCapability;
let speechCapabilityCheckedAt = 0;
const SPEECH_CAPABILITY_TTL_MS = 5000;

export async function hasAiSpeechSupport() {
  if (!hasRemoteApi) return false;
  if (typeof speechCapability === "boolean" && Date.now() - speechCapabilityCheckedAt < SPEECH_CAPABILITY_TTL_MS) return speechCapability;
  try {
    const health = await apiRequest("/api/health", { timeoutMs: 4000 });
    speechCapability = health?.speech === "ai";
  } catch {
    speechCapability = false;
  }
  speechCapabilityCheckedAt = Date.now();
  return speechCapability;
}

function bytesToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  }
  return btoa(binary);
}

export async function transcribeInterviewAudio(blob) {
  if (!(blob instanceof Blob) || !blob.size) throw new Error("No voice recording was captured.");
  if (blob.size > 6_000_000) throw new Error("Voice recording is too large. Record a shorter answer segment.");
  return authorizedRequest("/api/speech/transcribe", {
    method: "POST",
    expireSession: false,
    timeoutMs: 65000,
    body: JSON.stringify({
      audio: bytesToBase64(await blob.arrayBuffer()),
      mimeType: blob.type || "audio/webm",
    }),
  });
}

export async function synthesizeInterviewSpeech(input) {
  const text = typeof input === "string" ? input.trim().slice(0, 4000) : "";
  if (!text) throw new Error("No interview question was provided for speech.");
  return authorizedRequest("/api/speech/synthesize", {
    method: "POST",
    expireSession: false,
    timeoutMs: 65000,
    body: JSON.stringify({ input: text }),
  });
}

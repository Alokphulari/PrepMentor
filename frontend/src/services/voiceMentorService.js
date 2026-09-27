import { authorizedRequest } from "./authService.js";
import { hasRemoteApi } from "./api.js";

export async function askVoiceMentor(message, context = {}) {
  if (!hasRemoteApi) throw new Error("AI voice mentor is unavailable in local-only mode.");
  return authorizedRequest("/api/voice-mentor", {
    method: "POST",
    expireSession: false,
    timeoutMs: 20000,
    body: JSON.stringify({ message, context }),
  });
}

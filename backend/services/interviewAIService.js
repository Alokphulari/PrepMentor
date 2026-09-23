import { interviewConfigured, interviewProviderConfig } from "../src/ai/interviewProvider.js";

export const demoMode = () => process.env.INTERVIEW_DEMO_MODE === "true";

export function interviewHealth() {
  return {
    interviewService: "ready",
    geminiConfigured: Boolean(interviewProviderConfig().key?.trim()),
    fallbackEngine: true,
    demoMode: demoMode(),
  };
}

// One deadline covers the request, retry delay and retry. Never spend two
// full timeouts on one turn. The provider receives the same abort signal.
export async function withInterviewFallback(primary, local, {
  forceLocal = false, configured = interviewConfigured(), timeoutMs = 8000,
  retryDelayMs = 1000,
} = {}) {
  const backup = () => ({ ...local(), success: true, provider: "local", fallbackUsed: true });
  if (forceLocal || demoMode() || !configured) return backup();
  const controller = new AbortController();
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = Object.assign(new Error("Interview provider deadline exceeded"), { code: "AI_TIMEOUT" });
      controller.abort(error);
      reject(error);
    }, timeoutMs);
  });
  const attempt = async () => {
    for (let count = 0; count < 2; count++) {
      try {
        return await primary({ timeoutMs, retries: 0, signal: controller.signal });
      } catch (error) {
        const permanent = ["AI_AUTH_ERROR", "AI_CONFIGURATION_ERROR", "AI_NOT_CONFIGURED"].includes(error.code);
        const retryable = !permanent && ([429, 500, 502, 503, 504].includes(Number(error.status)) ||
          ["AI_PROVIDER_ERROR", "AI_RATE_LIMITED", "AI_INVALID_RESPONSE"].includes(error.code) ||
          error instanceof TypeError);
        if (count || !retryable || controller.signal.aborted) throw error;
        await new Promise((resolve) => {
          const finish = () => { clearTimeout(wait); controller.signal.removeEventListener("abort", finish); resolve(); };
          const wait = setTimeout(finish, retryDelayMs);
          controller.signal.addEventListener("abort", finish, { once: true });
        });
        if (controller.signal.aborted) throw error;
      }
    }
  };
  try {
    return { ...await Promise.race([attempt(), deadline]), success: true, provider: interviewProviderConfig().provider, fallbackUsed: false };
  } catch (error) {
    // Only log safe diagnostic fields: SDK messages may contain request data/keys.
    console.warn("Interview provider unavailable. Using local interview engine.", {
      code: /^AI_[A-Z_]+$/.test(error.code || "") ? error.code : "PROVIDER_FAILURE",
      status: Number(error.status) || undefined,
    });
    return backup();
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

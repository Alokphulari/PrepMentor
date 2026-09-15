const rawBaseUrl = import.meta.env?.VITE_API_BASE_URL?.trim();
export const API_BASE_URL = rawBaseUrl?.replace(/\/$/, "") || "";
export const hasRemoteApi = Boolean(API_BASE_URL);

export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest(path, options = {}) {
  if (!hasRemoteApi) {
    throw new ApiError("No remote API is configured.");
  }

  const { timeoutMs = 10000, ...requestOptions } = options;
  const safeTimeout = Math.max(1000, Math.min(120000, Number(timeoutMs) || 10000));
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), safeTimeout);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...requestOptions,
      headers: {
        "Content-Type": "application/json",
        ...requestOptions.headers,
      },
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiError(
        payload?.message || `Request failed with status ${response.status}.`,
        response.status,
        payload
      );
    }
    return payload;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new ApiError("The request timed out. Please try again.");
    }
    if (error instanceof ApiError) throw error;
    throw new ApiError("Unable to connect to the PrepMentor API.", 0, error);
  } finally {
    window.clearTimeout(timeout);
  }
}

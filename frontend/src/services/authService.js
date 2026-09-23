import { apiRequest, hasRemoteApi } from "./api.js";

const TOKEN_KEY = "prepmentor_auth_token";
export const AUTH_EXPIRED_EVENT = "prepmentor:auth-expired";

export function getAuthToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function saveToken(token) {
  if (!token) return;
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // The local UI session can still be cleared.
  }
}

export async function logoutAccount() {
  const token = getAuthToken();
  try {
    if (hasRemoteApi && token) {
      await apiRequest("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } finally {
    clearAuthToken();
  }
}

export async function loginAccount(credentials) {
  if (!hasRemoteApi) return { user: { email: credentials.email } };
  const response = await apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  saveToken(response.token);
  return response;
}

export async function registerAccount(details) {
  if (!hasRemoteApi) {
    return { user: { name: details.name, email: details.email, profileCompleted: false } };
  }
  const response = await apiRequest("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(details),
  });
  saveToken(response.token);
  return response;
}

export async function updateRemoteProfile(profile) {
  if (!hasRemoteApi) return { user: null };
  const token = getAuthToken();
  if (!token) throw new Error("Your server session has expired. Please sign in again.");
  return apiRequest("/api/profile", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(profile),
  });
}

export async function getCurrentAccount() {
  if (!hasRemoteApi) return null;
  const token = getAuthToken();
  if (!token) return null;
  return apiRequest("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function authorizedRequest(path, options = {}) {
  const { expireSession = true, ...requestOptions } = options;
  const token = getAuthToken();
  if (!token) {
    if (expireSession) window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    throw new Error("Your server session has expired. Please sign in again.");
  }
  try {
    return await apiRequest(path, {
      ...requestOptions,
      headers: { Authorization: `Bearer ${token}`, ...requestOptions.headers },
    });
  } catch (error) {
    if (error.status === 401 && expireSession) {
      clearAuthToken();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    throw error;
  }
}

export async function googleAccount(credential) { const response=await apiRequest("/api/auth/google",{method:"POST",body:JSON.stringify({credential})});saveToken(response.token);return response;}

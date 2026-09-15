import { hasRemoteApi } from "./api";
import { authorizedRequest } from "./authService";

export async function getRemoteResume() {
  if (!hasRemoteApi) return null;
  const response = await authorizedRequest("/api/resume");
  return response.resume || null;
}

export async function saveRemoteResume(resume) {
  if (!hasRemoteApi) return resume;
  const response = await authorizedRequest("/api/resume", {
    method: "PUT",
    body: JSON.stringify(resume),
  });
  return response.resume;
}

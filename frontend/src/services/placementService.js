import { hasRemoteApi } from "./api";
import { authorizedRequest } from "./authService";

export async function getRemotePlacementState() {
  if (!hasRemoteApi) return null;
  const response = await authorizedRequest("/api/placement");
  return response.placementState || null;
}

export async function saveRemotePlacementState(placementState) {
  if (!hasRemoteApi) return placementState;
  const response = await authorizedRequest("/api/placement", {
    method: "PUT",
    expireSession: false,
    body: JSON.stringify(placementState),
  });
  return response.placementState;
}

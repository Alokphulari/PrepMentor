import { authorizedRequest } from "./authService";

export function createBattle(mode) {
  return authorizedRequest("/api/battles", {
    method: "POST",
    body: JSON.stringify({ mode }),
  }).then((response) => response.room);
}

export function joinBattle(code) {
  return authorizedRequest(`/api/battles/${encodeURIComponent(code)}/join`, {
    method: "POST",
  }).then((response) => response.room);
}

export function getBattle(code) {
  return authorizedRequest(`/api/battles/${encodeURIComponent(code)}`, {
    expireSession: false,
  }).then((response) => response.room);
}

export function submitBattle(code, answers) {
  return authorizedRequest(`/api/battles/${encodeURIComponent(code)}/submit`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  }).then((response) => response.room);
}

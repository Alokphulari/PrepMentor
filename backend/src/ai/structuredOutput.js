export function object(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid structured object.");
  return value;
}
export function text(value, limit = 2000) {
  if (typeof value !== "string" || !value.trim() || value.length > limit) throw new Error("Invalid structured text.");
  return value.trim();
}
export function score(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) throw new Error("Invalid structured score.");
  return Math.round(value);
}
export function list(value, limit = 20) {
  if (!Array.isArray(value) || value.length > limit) throw new Error("Invalid structured list.");
  return value.map((item) => text(item));
}

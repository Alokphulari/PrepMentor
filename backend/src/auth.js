import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { createUser, findUserByEmail, findUserById, mutateUser, updateUser } from "./userStore.js";
import { DEFAULT_PLACEMENT_STATE } from "./placement.js";
import { OAuth2Client } from "google-auth-library";

const scrypt = promisify(scryptCallback);
const sessions = new Map();
const SESSION_TTL = 1000 * 60 * 60 * 24 * 7;
const profileTextLimits = {
  name: 120,
  phone: 40,
  location: 160,
  education: 200,
  college: 200,
  degree: 160,
  graduationYear: 20,
  experience: 120,
  targetRole: 160,
  careerInterests: 300,
  skills: 2000,
  bio: 3000,
};

function boundedText(value, limit, label) {
  if (!["string", "number"].includes(typeof value)) {
    throw new Error(`${label} must be text.`);
  }
  return String(value).trim().slice(0, limit);
}

function safeTimestamp(value) {
  const timestamp = Date.parse(value);
  const now = Date.now();
  return Number.isFinite(timestamp) && timestamp <= now + 300_000
    ? new Date(timestamp).toISOString()
    : new Date(now).toISOString();
}

export function publicUser(user) {
  if (!user) return null;
  return Object.fromEntries(["id", "email", "profileCompleted", "resumeUploaded", "createdAt", "updatedAt", ...Object.keys(profileTextLimits)].filter((key) => user[key] !== undefined).map((key) => [key, user[key]]));
}

async function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const derived = await scrypt(password, salt, 64);
  return { salt, hash: Buffer.from(derived).toString("hex") };
}

async function passwordMatches(password, user) {
  if (!user.passwordHash || !user.passwordSalt) return false;
  const candidate = await hashPassword(password, user.passwordSalt);
  return timingSafeEqual(Buffer.from(candidate.hash, "hex"), Buffer.from(user.passwordHash, "hex"));
}

function createSession(userId) {
  const token = randomBytes(32).toString("hex");
  sessions.set(token, { userId, expiresAt: Date.now() + SESSION_TTL });
  return token;
}

export async function googleLogin(value, verify) {
  if (!process.env.GOOGLE_CLIENT_ID) throw Object.assign(new Error("Google sign-in is not configured."), { status: 503 });
  if (typeof value?.credential !== "string" || value.credential.length > 10000) throw Object.assign(new Error("Invalid Google token."), { status: 401 });
  let payload;
  try {
    const verifier = verify || (async (idToken) => (await new OAuth2Client().verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID })).getPayload());
    payload = await verifier(value.credential);
    if (!payload?.sub || !payload.email_verified || !payload.email || payload.aud !== process.env.GOOGLE_CLIENT_ID || !["accounts.google.com", "https://accounts.google.com"].includes(payload.iss) || payload.exp * 1000 <= Date.now()) throw new Error();
  } catch { throw Object.assign(new Error("Google token verification failed."), { status: 401 }); }
  const email = payload.email.toLowerCase();
  let user = await findUserByEmail(email);
  // Never silently link an existing password account based only on an email match.
  if (user && user.googleSub !== payload.sub) throw Object.assign(new Error("This email already has an account. Sign in with your password."), { status: 409 });
  if (!user) user = await createUser({ id: randomUUID(), email, name: String(payload.name || email).slice(0, 120), googleSub: payload.sub, profileCompleted: false, resumeUploaded: false, placementState: DEFAULT_PLACEMENT_STATE, history: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  return { user: publicUser(user), token: createSession(user.id) };
}

export async function register({ name, email, password }) {
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const normalizedName = typeof name === "string" ? name.trim().slice(0, 120) : "";
  const suppliedPassword = typeof password === "string" ? password : "";
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) && normalizedEmail.length <= 180;
  if (!normalizedName || !emailIsValid || suppliedPassword.length < 8 || suppliedPassword.length > 256) {
    throw new Error("Provide a name, valid email, and password between 8 and 256 characters.");
  }
  if (await findUserByEmail(normalizedEmail)) {
    const error = new Error("An account with this email already exists.");
    error.status = 409;
    throw error;
  }
  const credentials = await hashPassword(suppliedPassword);
  const user = await createUser({
    id: randomUUID(), name: normalizedName, email: normalizedEmail,
    passwordSalt: credentials.salt, passwordHash: credentials.hash,
    profileCompleted: false, resumeUploaded: false,
    history: [],
    interviewResults: [],
    placementState: DEFAULT_PLACEMENT_STATE,
    resume: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });
  return { user: publicUser(user), token: createSession(user.id) };
}

export async function getHistory(userId) {
  const user = await findUserById(userId);
  return Array.isArray(user?.history) ? user.history : [];
}

function safeTopicPerformance(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const topic = typeof item?.topic === "string" ? item.topic.trim() : "";
    const percentage = Number(item?.percentage);
    if (!topic || !Number.isFinite(percentage)) return [];
    return [{ topic: topic.slice(0, 160), percentage: Math.max(0, Math.min(100, Math.round(percentage))) }];
  }).slice(0, 20);
}

export async function appendHistory(userId, entry) {
  const score = Number(entry?.score);
  if (typeof entry?.title !== "string" || typeof entry?.type !== "string" || !entry.title.trim() || !entry.type.trim() || !Number.isFinite(score)) {
    throw new Error("History entries require a title, type, and numeric score.");
  }
  const topicPerformance = safeTopicPerformance(entry.topicPerformance);
  const safeEntry = {
    id: typeof entry.id === "string" && entry.id.trim() ? entry.id.trim().slice(0, 120) : randomUUID(),
    title: entry.title.trim().slice(0, 160),
    type: entry.type.trim().slice(0, 80),
    score: Math.max(0, Math.min(100, Math.round(score))),
    mode: entry.mode === "placement" ? "placement" : "practice",
    difficulty: ["easy", "medium", "hard"].includes(entry.difficulty) ? entry.difficulty : null,
    evidenceType: /aptitude/i.test(entry.type) ? "browser-assessment" : "self-reported",
    ...(entry.type === "Interview" ? { evaluationMode: "Client-reported practice rubric" } : {}),
    duration: typeof entry.duration === "string" ? entry.duration.trim().slice(0, 40) || "Self-paced" : "Self-paced",
    createdAt: safeTimestamp(entry.createdAt),
    ...(topicPerformance.length ? { topicPerformance } : {}),
  };
  const user = await mutateUser(userId, (current) => ({
    history: [current.history?.find((item) => item.id === safeEntry.id && item.evidenceType === "server-assessment") || safeEntry, ...(Array.isArray(current.history) ? current.history : [])]
      .filter((item, index, entries) => entries.findIndex((candidate) => candidate.id === item.id) === index)
      .slice(0, 100),
  }));
  return user ? safeEntry : null;
}

export async function login({ email, password }) {
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const suppliedPassword = typeof password === "string" ? password : "";
  const user = normalizedEmail.length <= 180 ? await findUserByEmail(normalizedEmail) : null;
  if (!user || suppliedPassword.length > 256 || !(await passwordMatches(suppliedPassword, user))) {
    const error = new Error("Incorrect email or password.");
    error.status = 401;
    throw error;
  }
  return { user: publicUser(user), token: createSession(user.id) };
}

export async function authenticate(request) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  const session = token ? sessions.get(token) : null;
  if (!session || session.expiresAt <= Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }
  return findUserById(session.userId);
}

export function revokeSession(request) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (token) sessions.delete(token);
}

export async function saveProfile(userId, profile) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    throw new Error("Profile payload must be an object.");
  }
  const updates = {};
  for (const [key, limit] of Object.entries(profileTextLimits)) {
    if (profile[key] !== undefined) updates[key] = boundedText(profile[key], limit, key);
  }
  if (profile.fullName !== undefined && profile.name === undefined) {
    updates.name = boundedText(profile.fullName, profileTextLimits.name, "fullName");
  }
  for (const key of ["profileCompleted", "resumeUploaded"]) {
    if (profile[key] !== undefined) {
      if (typeof profile[key] !== "boolean") throw new Error(`${key} must be a boolean.`);
      updates[key] = profile[key];
    }
  }
  return publicUser(await updateUser(userId, updates));
}

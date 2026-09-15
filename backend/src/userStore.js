import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const defaultDataFile = fileURLToPath(new URL("../data/users.json", import.meta.url));
let mutationQueue = Promise.resolve();
const transientFileErrors = new Set(["EBUSY", "EPERM", "EACCES", "ENOTEMPTY"]);

export async function retryTransientFileOperation(operation, attempts = 5) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!transientFileErrors.has(error?.code) || attempt === attempts - 1) throw error;
      await delay(10 * (2 ** attempt));
    }
  }
  throw lastError;
}

function getDataFile() {
  return process.env.PREPMENTOR_DATA_FILE || defaultDataFile;
}

async function readUsersFromDisk() {
  try {
    const payload = JSON.parse(await readFile(getDataFile(), "utf8"));
    if (!Array.isArray(payload)) throw new SyntaxError("The user store root must be an array.");
    return payload;
  } catch (error) {
    if (error.code === "ENOENT") return [];
    if (error instanceof SyntaxError) {
      const storageError = new Error("The user data file is corrupted. Restore or repair it before continuing.");
      storageError.status = 500;
      storageError.cause = error;
      throw storageError;
    }
    throw error;
  }
}

async function writeUsersToDisk(users) {
  const dataFile = getDataFile();
  const temporaryFile = `${dataFile}.${process.pid}.tmp`;
  await mkdir(dirname(dataFile), { recursive: true });
  try {
    await writeFile(temporaryFile, JSON.stringify(users, null, 2), "utf8");
    await retryTransientFileOperation(() => rename(temporaryFile, dataFile));
  } finally {
    await rm(temporaryFile, { force: true });
  }
}

async function readUsers() {
  await mutationQueue;
  return readUsersFromDisk();
}

function enqueueMutation(mutator) {
  const operation = mutationQueue.then(async () => {
    const users = await readUsersFromDisk();
    const result = mutator(users);
    await writeUsersToDisk(users);
    return result;
  });
  mutationQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

export async function findUserByEmail(email) {
  const normalized = email.trim().toLowerCase();
  return (await readUsers()).find((user) => user.email === normalized) || null;
}

export async function findUserById(id) {
  return (await readUsers()).find((user) => user.id === id) || null;
}

export async function createUser(user) {
  return enqueueMutation((users) => {
    if (users.some((existing) => existing.email === user.email)) {
      const error = new Error("An account with this email already exists.");
      error.status = 409;
      throw error;
    }
    users.push(user);
    return user;
  });
}

export async function updateUser(id, updates) {
  return mutateUser(id, () => updates);
}

export async function mutateUser(id, updater) {
  return enqueueMutation((users) => {
    const index = users.findIndex((user) => user.id === id);
    if (index === -1) return null;
    const updates = updater(users[index]);
    users[index] = { ...users[index], ...updates, updatedAt: new Date().toISOString() };
    return users[index];
  });
}

import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createUser, findUserByEmail, retryTransientFileOperation } from "../src/userStore.js";

let testDirectory;
let dataFile;

before(async () => {
  testDirectory = await mkdtemp(join(tmpdir(), "prepmentor-store-"));
  dataFile = join(testDirectory, "users.json");
  process.env.PREPMENTOR_DATA_FILE = dataFile;
});

after(async () => {
  await rm(testDirectory, { recursive: true, force: true });
  delete process.env.PREPMENTOR_DATA_FILE;
});

test("user store writes valid JSON atomically", async () => {
  await createUser({ id: "atomic-user", email: "atomic@example.test" });
  const stored = JSON.parse(await readFile(dataFile, "utf8"));
  assert.equal(stored.length, 1);
  assert.equal(stored[0].id, "atomic-user");
  await assert.rejects(readFile(`${dataFile}.${process.pid}.tmp`, "utf8"), { code: "ENOENT" });
});

test("user store refuses to overwrite corrupted data", async () => {
  await writeFile(dataFile, "{broken-json", "utf8");
  await assert.rejects(
    findUserByEmail("atomic@example.test"),
    /user data file is corrupted/i
  );
  assert.equal(await readFile(dataFile, "utf8"), "{broken-json");
});

test("transient Windows file locks are retried without hiding permanent errors", async () => {
  let attempts = 0;
  const result = await retryTransientFileOperation(async () => {
    attempts += 1;
    if (attempts < 3) throw Object.assign(new Error("locked"), { code: "EPERM" });
    return "saved";
  });
  assert.equal(result, "saved");
  assert.equal(attempts, 3);

  await assert.rejects(
    retryTransientFileOperation(async () => { throw Object.assign(new Error("invalid"), { code: "EINVAL" }); }),
    { code: "EINVAL" }
  );
});

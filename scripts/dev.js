import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const services = [
  ["backend", 4000, "dev"],
  ["frontend", 5173, "dev:client"],
];
let stopping = false;

const children = services.map(([name, port, script]) => {
  const child = spawn(npmCommand, ["run", script], {
    cwd: resolve(repositoryRoot, name),
    stdio: "inherit",
    shell: process.platform === "win32",
    windowsHide: true,
  });
  child.on("error", (error) => {
    console.error(`Unable to start ${name} on port ${port}:`, error.message);
    stop(1);
  });
  child.on("exit", (code, signal) => {
    if (stopping) return;
    console.error(`${name} stopped${signal ? ` with signal ${signal}` : ` with code ${code}`}.`);
    stop(code || 1);
  });
  return child;
});

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach((child) => {
    if (!child.killed) child.kill("SIGTERM");
  });
  windowExit(exitCode);
}

function windowExit(exitCode) {
  const timer = setTimeout(() => process.exit(exitCode), 500);
  timer.unref();
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

console.log("Starting PrepMentor API on http://localhost:4000");
console.log("Starting PrepMentor frontend on http://localhost:5173");

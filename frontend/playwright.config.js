import { defineConfig } from "@playwright/test";
import process from "node:process";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://localhost:5173", channel: process.env.PLAYWRIGHT_CHANNEL || "chrome", headless: true },
  webServer: { command: "npm run dev:client -- --host 127.0.0.1", url: "http://localhost:5173", reuseExistingServer: true },
});

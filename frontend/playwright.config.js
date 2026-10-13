import { defineConfig } from "@playwright/test";
import process from "node:process";

const port = Number(process.env.PLAYWRIGHT_PORT) || 5173;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  use: { baseURL, channel: process.env.PLAYWRIGHT_CHANNEL || "chrome", headless: true },
  webServer: {
    command: `npm run dev:client -- --host 127.0.0.1 --port ${port}`,
    url: baseURL,
    env: {
      ...process.env,
      VITE_API_BASE_URL: baseURL,
      VITE_API_PROXY_TARGET: "http://localhost:4000",
      VITE_E2E_TEST: "true",
    },
    reuseExistingServer: true,
  },
});

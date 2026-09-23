import { defineConfig } from "@playwright/test";
import base from "./playwright.config.js";
// Explicit opt-in only: consumes Gemini quota. Excluded from normal suites.
export default defineConfig({ ...base, testDir: "./live-tests", timeout: 240000, expect: { timeout: 120000 }, retries: 0 });

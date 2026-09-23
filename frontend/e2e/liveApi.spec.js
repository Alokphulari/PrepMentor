import { mock } from "node:test";
import { geminiMock } from "../../backend/test/helpers/geminiMock.js";
import { test, expect } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import process from "node:process";
import { createAppServer } from "../../backend/src/server.js";

test("real local API with mocked Gemini persists a typed interview and restores its report", async ({ page }) => {
  const original = { ...process.env };
  const directory = await mkdtemp(join(tmpdir(), "prepmentor-browser-"));
  process.env.PREPMENTOR_DATA_FILE = join(directory, "users.json");
  for (const key of ["MONGODB_URI", "NODE_ENV", "OPENAI_API_KEY", "OPENROUTER_API_KEY", "LLM_API_KEY", "GOOGLE_CLIENT_ID", "JUDGE0_BASE_URL"]) delete process.env[key];
  const localFetch = globalThis.fetch;
  const providerMock = geminiMock({ mock });
  const providerFetch = globalThis.fetch;
  providerMock.mock.restore();
  const fetchMock = mock.method(globalThis, "fetch", (url, options) => String(url).includes("generativelanguage.googleapis.com") ? providerFetch(url, options) : localFetch(url, options));
  const server = createAppServer();
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    // Real isolated API and storage; only Gemini transport is mocked.
    await page.route("**/api/**", async (route) => {
      const response = await route.fetch({ url: origin + new URL(route.request().url()).pathname });
      await route.fulfill({ response });
    });
    const health = await (await fetch(`${origin}/api/health`)).json();
    expect(health.database).toBe("file");
    expect(health.interview.llm).toBe(true);
    await page.goto("/register");
    await page.locator('[name="name"]').fill("Isolated Demo Student");
    await page.locator('[name="email"]').fill("isolated-demo@example.test");
    await page.locator('[name="password"]').fill("Demo-test-password-123!");
    await page.locator('[name="confirmPassword"]').fill("Demo-test-password-123!");
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await expect(page).toHaveURL(/complete-profile$/);
    for (const [name, value] of Object.entries({ fullName: "Isolated Demo Student", phone: "9876543210", education: "BTech", college: "Demo College", graduationYear: "2027", targetRole: "Software Engineer" })) {
      await page.locator(`[name="${name}"]`).fill(value);
    }
    await page.locator('[name="experience"]').selectOption("fresher");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/resume$/);
    await page.goto("/interview/setup");
    await page.getByLabel("Target role").selectOption("Software Engineer");
    await page.getByRole("button", { name: "Start interview", exact: true }).click();
    const answer = page.getByRole("textbox", { name: "Your response" });
    await answer.fill("My project uses a React frontend and a Node backend. I separated authenticated endpoints from public routes and tested ownership checks.");
    await page.reload();
    await expect(answer).toHaveValue(/My project/);
    await page.getByRole("button", { name: "Submit Answer", exact: true }).click();
    await expect(page.getByText("AI semantic answer evaluation", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Next Question", exact: true }).click();
    await answer.fill("I would measure the behavior using a repeatable test, compare alternatives and document the tradeoffs before selecting an implementation.");
    await page.getByRole("button", { name: "Finish interview after this answer" }).click();
    await expect(page).toHaveURL(/interview\/result\//);
    const resultUrl = page.url();
    // Remove the result cache to prove that the report comes back from storage.
    await page.evaluate(() => { for (const key of Object.keys(localStorage)) if (key.startsWith("prepmentor_interview_result")) localStorage.removeItem(key); });
    await page.reload();
    await expect(page.getByRole("heading", { name: "Question-by-question feedback" })).toBeVisible();
    await page.goto("/history");
    await page.getByRole("link", { name: "View Software Engineer Interview result" }).click();
    await expect(page).toHaveURL(resultUrl);
  } finally {
    await new Promise((done) => server.close(done));
    fetchMock.mock.restore();
    process.env = original;
    if (dirname(resolve(directory)) === resolve(tmpdir())) await rm(directory, { recursive: true, force: true });
  }
});

import { test, expect } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import process from "node:process";
import { createAppServer } from "../../backend/src/server.js";

test("LIVE Gemini authenticates, adapts, restores and persists the final report", async ({ page }) => {
  process.loadEnvFile("../backend/.env");
  if (!process.env.GEMINI_API_KEY?.trim()) throw new Error("Configure the backend Gemini key before explicitly running live acceptance.");
  const original = { ...process.env };
  const directory = await mkdtemp(join(tmpdir(), "prepmentor-browser-"));
  process.env.PREPMENTOR_DATA_FILE = join(directory, "users.json");
  for (const key of ["MONGODB_URI", "NODE_ENV", "OPENAI_API_KEY", "OPENROUTER_API_KEY", "LLM_API_KEY", "GOOGLE_CLIENT_ID", "JUDGE0_BASE_URL"]) delete process.env[key];
  const server = createAppServer();
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    // Real Gemini, API and isolated storage. Speech is verified separately to avoid repeated autoplay quota.
    await page.route("**/api/**", async (route) => {
      if (new URL(route.request().url()).pathname === "/api/speech/synthesize") return route.fulfill({ status: 503, json: { message: "Autoplay disabled in live typed acceptance; TTS smoke is separate." } });
      const response = await route.fetch({ timeout: 120000, url: origin + new URL(route.request().url()).pathname });
      await route.fulfill({ response });
    });
    const health = await (await fetch(`${origin}/api/health`)).json();
    expect(health.database).toBe("file");
    expect(health.interview.llm).toBe(true);
    console.log("LIVE: isolated API ready; opening registration");
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
    console.log("LIVE: authentication/profile passed; opening interview setup");
    await page.goto("/interview/setup");
    await page.getByLabel("Target role").selectOption("Software Engineer");
    await page.getByRole("button", { name: "10 minutes", exact: false }).click();
    await page.getByRole("button", { name: "Start interview", exact: true }).click();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const answer = page.getByRole("textbox", { name: "Your response" });
    await expect(answer).toBeVisible();
    console.log("LIVE: first question loaded");
    await answer.fill("My project uses a React frontend and a Node backend. I separated authenticated endpoints from public routes and tested ownership checks.");
    const firstQuestion = await page.locator("h2").first().textContent();
    await page.reload();
    await expect(answer).toHaveValue(/My project/);
    console.log("LIVE: refresh preserved draft; submitting answer");
    const answerResponse = page.waitForResponse((response) => response.url().endsWith("/answer") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Submit Answer", exact: true }).click();
    const submitted = await answerResponse;
    if (!submitted.ok()) {
      await expect(answer).toHaveValue(/My project/);
      const failure = await submitted.json();
      throw new Error(`Live Gemini submission blocked: ${failure.code || submitted.status()}. Draft preservation verified.`);
    }
    await expect(page.getByText("AI semantic answer evaluation", { exact: true })).toBeVisible();
    console.log("LIVE: semantic answer evaluation passed");
    await page.getByRole("button", { name: "Next Question", exact: true }).click();
    await expect(page.locator("h2").first()).not.toHaveText(firstQuestion);
    await answer.fill("I would measure the behavior using a repeatable test, compare alternatives and document the tradeoffs before selecting an implementation.");
    console.log("LIVE: adaptive question differs; finishing after second answer");
    const finalResponse = page.waitForResponse((response) => response.url().endsWith("/answer") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Finish interview after this answer" }).click();
    const finished = await finalResponse;
    if (!finished.ok()) {
      const failure = await finished.json();
      throw new Error(`Live Gemini report blocked: ${failure.code || finished.status()}.`);
    }
    await expect(page).toHaveURL(/interview\/result\//);
    console.log("LIVE: final report passed");
    const resultUrl = page.url();
    // Remove the result cache to prove that the report comes back from storage.
    await page.evaluate(() => { for (const key of Object.keys(localStorage)) if (key.startsWith("prepmentor_interview_result")) localStorage.removeItem(key); });
    await page.reload();
    await expect(page.getByRole("heading", { name: "Question-by-question feedback" })).toBeVisible();
    await page.goto("/history");
    await page.getByRole("link", { name: "View Software Engineer Interview result" }).click();
    await expect(page).toHaveURL(resultUrl);
    expect(errors).toEqual([]);
    console.log("LIVE: history and persisted report reload passed; no browser page errors");
  } finally {
    await new Promise((done) => server.close(done));
    process.env = original;
    if (dirname(resolve(directory)) === resolve(tmpdir())) await rm(directory, { recursive: true, force: true });
  }
});

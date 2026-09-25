import { test, expect } from "@playwright/test";
import process from "node:process";
import { Buffer } from "node:buffer";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createAppServer } from "../../backend/src/server.js";
import { mutateUser } from "../../backend/src/userStore.js";

let server;
let apiUrl;
let directory;
let savedEnv;
test.beforeAll(async () => {
  savedEnv = { ...process.env };
  directory = await mkdtemp(join(tmpdir(), "prepmentor-browser-fallback-"));
  process.env.PREPMENTOR_DATA_FILE = join(directory, "users.json");
  process.env.INTERVIEW_DEMO_MODE = "true";
  process.env.GEMINI_API_KEY = "test-only-never-used";
  delete process.env.MONGODB_URI;
  process.env.NODE_ENV = "development";
  server = createAppServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  apiUrl = `http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  process.env = savedEnv;
  await rm(directory, { recursive: true, force: true });
});
test.beforeEach(async ({ page, request }, testInfo) => {
  const response = await request.post(`${apiUrl}/api/auth/register`, { data: { name: "Fallback Student", email: `fallback-${testInfo.testId}@example.test`, password: "Test-only-passphrase-123!" } });
  expect(response.ok()).toBeTruthy();
  const { user, token } = await response.json();
  await mutateUser(user.id, () => ({ profileCompleted: true }));
  await page.addInitScript((authToken) => {
    sessionStorage.setItem("prepmentor_auth_token", authToken);
    window.spokenQuestions = [];
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: {
      getVoices: () => [], cancel: () => {},
      speak: (utterance) => { window.spokenQuestions.push(utterance.text); utterance.onstart?.(); setTimeout(() => utterance.onend?.(), 1); },
    } });
  }, token);
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: `${apiUrl}${url.pathname}${url.search}` });
    await route.fulfill({ response });
  });
});

test("real demo API starts, survives refresh, accepts typed answers and persists a complete local report", async ({ page }) => {
  await page.goto("/interview/setup");
  await page.getByRole("button", { name: "Start interview", exact: true }).click();
  await expect(page.getByText(/Evaluation source: Local Backup/)).toBeVisible();
  const response = page.getByRole("textbox", { name: "Your response" });
  const firstQuestion = await page.locator("h2").first().textContent();
  await response.fill("My example uses state and props with an effect cleanup because shared ownership determines which component updates. I tested the behavior and measured the result.");
  await page.reload();
  await expect(page.locator("h2").first()).toHaveText(firstQuestion);
  await expect(response).toContainText("My example uses state");
  await page.getByRole("button", { name: "Submit Answer", exact: true }).click();
  await expect(page.getByText(/Evaluation source: Local Backup.*Local deterministic rubric/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Answer evaluation", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next Question", exact: true }).click();
  await expect(page.locator("h2").first()).not.toHaveText(firstQuestion);
  await response.fill("I would clarify constraints, compare alternatives and test an example because the result needs to be measured before choosing a solution.");
  await page.getByRole("button", { name: "Finish interview after this answer" }).click();
  await expect(page).toHaveURL(/\/interview\/result\//);
  await expect(page.getByText("Local deterministic interview rubric", { exact: false }).first()).toBeVisible();
  for (const label of ["Technical knowledge", "Communication", "Problem solving", "Strengths", "Question-by-question feedback"]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(page.getByText("Answer relevance:", { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Question-by-question feedback" })).toBeVisible();
  await page.screenshot({ path: "test-results/fallback-report.png", fullPage: true });
});

test("failed server speech falls back to browser narration; failed STT leaves typing usable", async ({ page }) => {
  await page.addInitScript(() => {
    window.SpeechRecognition = undefined;
    window.webkitSpeechRecognition = undefined;
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", { value: async () => ({ getTracks: () => [{ stop() {} }] }) });
    window.MediaRecorder = class {
      static isTypeSupported() { return true; }
      constructor() { this.state = "inactive"; this.mimeType = "audio/webm"; }
      start() { this.state = "recording"; }
      stop() { this.state = "inactive"; this.ondataavailable?.({ data: new Blob(["test-recording"], { type: "audio/webm" }) }); this.onstop?.(); }
    };
  });
  await page.route("**/api/health", (route) => route.fulfill({ json: { interview: { llm: true, stt: true, tts: true } } }));
  let speechRequests = 0;
  await page.route("**/api/speech/synthesize", (route) => { speechRequests++; return route.fulfill({ status: 503, json: { message: "Provider unavailable" } }); });
  await page.route("**/api/speech/transcribe", (route) => route.fulfill({ status: 429, json: { message: "Gemini quota or request limit reached. Retry later." } }));
  // A non-fallback session exercises the server TTS failure path; all interview
  // answers still go to the real isolated demo backend.
  await page.route(/\/api\/interview-sessions(?:\/[^/]+)?$/, async (route) => {
    const path = new URL(route.request().url()).pathname;
    const response = await route.fetch({ url: `${apiUrl}${path}` });
    const body = await response.json();
    await route.fulfill({ response, json: { ...body, session: { ...body.session, fallbackUsed: false } } });
  });
  await page.goto("/interview/setup");
  await page.getByRole("button", { name: "Start interview", exact: true }).click();
  await expect.poll(() => speechRequests).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.spokenQuestions.length)).toBeGreaterThan(0);
  const answer = page.getByRole("textbox", { name: "Your response" });
  await answer.fill("My existing typed draft.");
  await page.getByRole("button", { name: "Answer with voice", exact: true }).click();
  await page.getByRole("button", { name: "Stop listening", exact: true }).click();
  await expect(page.getByText("Voice transcription is unavailable. Type your answer instead.", { exact: true })).toBeVisible();
  await expect(page.getByText("Gemini quota", { exact: false })).toHaveCount(0);
  await page.getByRole("button", { name: "Type answer instead", exact: true }).click();
  await expect(answer).toBeFocused();
  await expect(answer).toHaveValue("My existing typed draft.");
  await answer.fill("I can continue by typing a relevant example and explain the result because voice failure does not erase my work.");
  await page.getByRole("button", { name: "Finish interview after this answer" }).click();
  await expect(page).toHaveURL(/\/interview\/result\//);
});

test("failed transcription switches to browser voice, preserves the draft and avoids retrying the failed provider", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", { value: async () => ({ getTracks: () => [{ stop() {} }] }) });
    window.MediaRecorder = class {
      static isTypeSupported() { return true; }
      constructor() { this.state = "inactive"; this.mimeType = "audio/webm"; }
      start() { this.state = "recording"; }
      stop() { this.state = "inactive"; this.ondataavailable?.({ data: new Blob(["test-recording"], { type: "audio/webm" }) }); this.onstop?.(); }
    };
    window.SpeechRecognition = undefined;
    window.webkitSpeechRecognition = undefined;
    window.browserVoiceStarts = 0;
    window.DeferredRecognition = class {
      start() { window.browserVoiceStarts++; window.activeRecognition = this; }
      stop() { this.onend?.(); }
      abort() { this.onend?.(); }
    };
  });
  await page.route("**/api/health", (route) => route.fulfill({ json: { interview: { llm: true, stt: true, tts: false } } }));
  let uploads = 0;
  await page.route("**/api/speech/transcribe", (route) => { uploads++; return route.fulfill({ status: 429, json: { message: "Quota exceeded" } }); });
  await page.route(/\/api\/interview-sessions(?:\/[^/]+)?$/, async (route) => {
    const path = new URL(route.request().url()).pathname;
    const response = await route.fetch({ url: `${apiUrl}${path}` });
    const body = await response.json();
    await route.fulfill({ response, json: { ...body, session: { ...body.session, fallbackUsed: false } } });
  });
  await page.goto("/interview/setup");
  await page.getByRole("button", { name: "Start interview", exact: true }).click();
  const answer = page.getByRole("textbox", { name: "Your response" });
  await answer.fill("My typed draft.");
  await page.getByRole("button", { name: "Answer with voice", exact: true }).click();
  await page.evaluate(() => { window.SpeechRecognition = window.DeferredRecognition; });
  await page.getByRole("button", { name: "Stop listening", exact: true }).click();
  await expect(page.getByText("Browser voice is active. Please repeat your answer.", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.browserVoiceStarts)).toBe(1);
  await page.evaluate(() => {
    const result = [{ transcript: "A closure retains its lexical scope." }];
    result.isFinal = true;
    window.activeRecognition.onresult({ resultIndex: 0, results: [result] });
  });
  await page.getByRole("button", { name: "Stop listening", exact: true }).click();
  await expect(answer).toHaveValue("My typed draft. A closure retains its lexical scope.");
  await page.getByRole("button", { name: "Answer with voice", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.browserVoiceStarts)).toBe(2);
  expect(uploads).toBe(1);
  await page.getByRole("button", { name: "Stop listening", exact: true }).click();
  await page.getByRole("button", { name: "Finish interview after this answer" }).click();
  await expect(page).toHaveURL(/\/interview\/result\//);
});

test("browser narration failure still allows a complete typed interview", async ({ page }) => {
  await page.addInitScript(() => {
    window.speechSynthesis.speak = () => { throw new Error("Browser audio device unavailable"); };
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/interview/setup");
  await page.getByRole("button", { name: "Start interview", exact: true }).click();
  await expect(page.getByText("Audio could not play. You can read the question and type your answer.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Type answer instead", exact: true }).click();
  await page.getByRole("textbox", { name: "Your response" }).fill("A closure keeps access to its lexical scope and a function can use that state later, for example to implement a counter.");
  await page.getByRole("button", { name: "Finish interview after this answer" }).click();
  await expect(page).toHaveURL(/\/interview\/result\//);
  expect(errors).toEqual([]);
});

test("spoken words appear live, interim corrections do not duplicate text, and stopping enables submission", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", { value: async () => ({ getTracks: () => [{ stop() {} }] }) });
    window.SpeechRecognition = class {
      start() { window.liveRecognition = this; }
      stop() { this.onend?.(); }
      abort() { this.onend?.(); }
    };
  });
  await page.route("**/api/health", (route) => route.fulfill({ json: { interview: { llm: true, stt: true, tts: false } } }));
  let uploads = 0;
  await page.route("**/api/speech/transcribe", (route) => { uploads++; return route.fulfill({ status: 503, json: {} }); });
  await page.goto("/interview/setup");
  await page.getByRole("button", { name: "Start interview", exact: true }).click();
  const answer = page.getByRole("textbox", { name: "Your response" });
  await answer.fill("My draft.");
  await page.getByRole("button", { name: "Answer with voice", exact: true }).click();
  expect(await page.evaluate(() => window.liveRecognition.interimResults)).toBe(true);
  await page.evaluate(() => window.liveRecognition.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: "A closure keeps" }], { isFinal: false })] }));
  await expect(answer).toHaveValue("My draft. A closure keeps");
  await page.evaluate(() => window.liveRecognition.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: "A closure retains its lexical scope." }], { isFinal: true }), Object.assign([{ transcript: "For exam" }], { isFinal: false })] }));
  await expect(answer).toHaveValue("My draft. A closure retains its lexical scope. For exam");
  await page.evaluate(() => window.liveRecognition.onresult({ resultIndex: 1, results: [Object.assign([{ transcript: "A closure retains its lexical scope." }], { isFinal: true }), Object.assign([{ transcript: "For example, a counter." }], { isFinal: false })] }));
  await expect(answer).toHaveValue("My draft. A closure retains its lexical scope. For example, a counter.");
  await expect(page.getByRole("button", { name: "Submit Answer", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Stop listening", exact: true }).click();
  await expect(answer).toBeEditable();
  await expect(page.getByRole("button", { name: "Submit Answer", exact: true })).toBeEnabled();
  expect(uploads).toBe(0);
  await page.getByRole("button", { name: "Finish interview after this answer" }).click();
  await expect(page).toHaveURL(/\/interview\/result\//);
  await expect(page.getByText("My draft. A closure retains its lexical scope. For example, a counter.", { exact: true })).toBeVisible();
});

test("browser recognition connection failure retains live text and offers recorded transcription", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", { value: async () => ({ getTracks: () => [{ stop() {} }] }) });
    window.SpeechRecognition = class {
      start() { window.liveRecognition = this; }
      stop() { this.onend?.(); }
      abort() { this.onend?.(); }
    };
    window.MediaRecorder = class {
      static isTypeSupported() { return true; }
      constructor() { this.state = "inactive"; this.mimeType = "audio/webm"; }
      start() { this.state = "recording"; }
      stop() { this.state = "inactive"; this.ondataavailable?.({ data: new Blob(["test-recording"], { type: "audio/webm" }) }); this.onstop?.(); }
    };
  });
  await page.route("**/api/health", (route) => route.fulfill({ json: { interview: { stt: true, tts: false } } }));
  await page.route("**/api/speech/transcribe", (route) => route.fulfill({ json: { transcript: "The recorded continuation." } }));
  await page.goto("/interview/setup");
  await page.getByRole("button", { name: "Start interview", exact: true }).click();
  await page.getByRole("button", { name: "Answer with voice", exact: true }).click();
  await page.evaluate(() => {
    window.liveRecognition.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: "My visible answer." }], { isFinal: false })] });
    window.liveRecognition.onerror({ error: "network" });
    window.liveRecognition.onend();
  });
  await expect(page.getByText("Chrome's speech service could not connect.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Answer with voice", exact: true }).click();
  await expect(page.getByText("Press Stop listening to transcribe it into the answer box.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Stop listening", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Your response" })).toHaveValue("My visible answer. The recorded continuation.");
  await expect(page.getByRole("button", { name: "Submit Answer", exact: true })).toBeEnabled();
});

test("Chrome ending without results automatically transcribes the same recording", async ({ page }) => {
  await page.addInitScript(() => {
    window.releasedMicrophones = 0;
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", { value: async () => ({ getTracks: () => [{ stop() { window.releasedMicrophones++; } }] }) });
    window.SpeechRecognition = class {
      start() { window.activeRecognition = this; }
      stop() { this.onend?.(); }
      abort() { this.onend?.(); }
    };
    window.MediaRecorder = class {
      static isTypeSupported() { return true; }
      constructor() { this.state = "inactive"; this.mimeType = "audio/webm"; }
      start() { this.state = "recording"; }
      stop() { this.state = "inactive"; this.ondataavailable?.({ data: new Blob(["same recorded answer"], { type: "audio/webm" }) }); this.onstop?.(); }
    };
  });
  await page.route("**/api/health", (route) => route.fulfill({ json: { interview: { stt: true, tts: false } } }));
  let uploads = 0;
  await page.route("**/api/speech/transcribe", (route) => {
    uploads++;
    expect(Buffer.from(route.request().postDataJSON().audio, "base64").toString()).toBe("same recorded answer");
    return route.fulfill({ json: { transcript: "A closure preserves lexical scope." } });
  });
  await page.goto("/interview/setup");
  await page.getByRole("button", { name: "Start interview", exact: true }).click();
  const answer = page.getByRole("textbox", { name: "Your response" });
  await answer.fill("Existing draft.");
  await page.getByRole("button", { name: "Answer with voice", exact: true }).click();
  expect(await page.evaluate(() => window.releasedMicrophones)).toBe(0);
  await page.getByRole("button", { name: "Stop listening", exact: true }).click();
  await expect(answer).toHaveValue("Existing draft. A closure preserves lexical scope.");
  expect(uploads).toBe(1);
  await expect.poll(() => page.evaluate(() => window.releasedMicrophones)).toBe(1);
  await expect(page.getByRole("button", { name: "Submit Answer", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Finish interview after this answer" }).click();
  await expect(page).toHaveURL(/\/interview\/result\//);
});

test("silent microphone is identified instead of ending with an empty unexplained answer", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", { value: async () => ({ getTracks: () => [{ stop() {} }] }) });
    window.AudioContext = class {
      createAnalyser() { return { fftSize: 1024, getByteTimeDomainData(samples) { samples.fill(128); } }; }
      createMediaStreamSource() { return { connect() {} }; }
      async resume() {}
      async close() {}
    };
    window.SpeechRecognition = class {
      start() {}
      stop() { this.onend?.(); }
      abort() { this.onend?.(); }
    };
  });
  await page.goto("/interview/setup");
  await page.getByRole("button", { name: "Start interview", exact: true }).click();
  await page.getByRole("button", { name: "Answer with voice", exact: true }).click();
  await expect(page.getByText("No microphone sound detected yet", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Stop listening", exact: true }).click();
  await expect(page.getByText("No microphone sound was detected.", { exact: false })).toBeVisible();
  await page.getByRole("textbox", { name: "Your response" }).fill("I can still type my answer.");
  await expect(page.getByRole("button", { name: "Submit Answer", exact: true })).toBeEnabled();
});

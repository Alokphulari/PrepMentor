import { test, expect } from "@playwright/test";
const initial = { aptitude: { easy: "available", medium: "locked", hard: "locked" }, coding: { easy: "locked", medium: "locked", hard: "locked" }, interview: { status: "locked", whiteboard: "locked" } };
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("prepmentor_auth_token", "demo-browser"));
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({ json: {
      "/api/auth/me": { user: { id: "demo-browser", name: "Demo Student", email: "demo@example.test", profileCompleted: true } },
      "/api/history": { history: [] },
      "/api/placement": { placementState: initial },
      "/api/baseline": { categories: [] },
    }[path] || {} });
  });
});
test("performance recovers when API fails and identifies Local Backup", async ({ page }) => {
  await page.route("**/api/performance/analyze", route => route.fulfill({ status: 503, json: { message: "Unavailable" } }));
  await page.goto("/performance");
  await page.getByRole("button", { name: "Analyze performance", exact: true }).click();
  await expect(page.getByText("Source: Local Backup", { exact: true })).toBeVisible();
  await expect(page.getByText(/No assessment evidence yet/)).toBeVisible();
});
test("aptitude saves answers across refresh and uses server submission", async ({ page }) => {
  const questions = Array.from({ length: 30 }, (_, i) => ({ id: "q" + i, question: "Question " + (i + 1), options: ["First", "Second", "Third", "Fourth"], topic: "Ratios" }));
  await page.route("**/api/placement/aptitude/start", route => route.fulfill({ json: { id: "apt-session", questions, source: "server-curated" } }));
  let submissions = 0;
  await page.route("**/api/placement/aptitude/submit", route => {
    submissions++;
    const payload = route.request().postDataJSON();
    expect(payload.sessionId).toBe("apt-session"); expect(Object.keys(payload.answers)).toHaveLength(30);
    return route.fulfill({ json: { correct: 30, passed: true, topicPerformance: [{ topic: "Ratios", percentage: 100 }], entry: { id: "apt-result", title: "Placement Aptitude Easy", type: "Placement Aptitude", score: 100, createdAt: new Date().toISOString() }, placementState: { ...initial, aptitude: { easy: "passed", medium: "available", hard: "locked" } } } });
  });
  await page.goto("/placement/aptitude/easy");
  await page.getByRole("button", { name: /First/ }).click();
  await page.getByRole("button", { name: /Next Question/ }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Question 2", exact: true })).toBeVisible();
  for (let i = 1; i < 30; i++) {
    await page.getByRole("button", { name: /First/ }).click();
    await page.getByRole("button", { name: i === 29 ? /Submit Test/ : /Next Question/ }).click();
  }
  await expect(page.getByText(/30\s*\/\s*30/).first()).toBeVisible();
  expect(submissions).toBe(1);
});
test("Judge0 outage preserves code and local review is labelled without fake test results", async ({ page }) => {
  const state = { ...initial, aptitude: { easy: "passed", medium: "passed", hard: "passed" }, coding: { easy: "available", medium: "locked", hard: "locked" } };
  await page.route("**/api/placement", route => route.fulfill({ json: { placementState: state } }));
  await page.route("**/api/code/problems", route => route.fulfill({ json: { problems: [{ id: "array-sum", difficulty: "easy", title: "Array sum", description: "Print the sum.", topic: "Arrays", languages: ["JavaScript","TypeScript","Python","Java","C++","C","C#","Go"], samples: [{ input: "1\n2", output: "2" }] }] } }));
  await page.route("**/api/code/run", route => route.fulfill({ status: 503, json: { message: "Judge0 unavailable. No score was recorded." } }));
  await page.route("**/api/code/review", route => {
    expect(route.request().postDataJSON().language).toBe("Go");
    return route.fulfill({ json: { provider: "local", score: null, mode: "Review checklist (code not executed)", summary: "Check input parsing.", strengths: [], issues: ["Test boundary cases."], complexity: "Not assessed." } });
  });
  await page.goto("/placement/coding");
  await page.getByRole("combobox").selectOption("Go");
  await page.getByRole("textbox", { name: "Source code" }).fill("package main\nfunc main() {}");
  await page.getByRole("button", { name: "Run sample tests" }).click();
  await expect(page.getByRole("alert")).toContainText("No score was recorded");
  await expect(page.getByRole("textbox", { name: "Source code" })).toHaveValue("package main\nfunc main() {}");
  await page.getByRole("button", { name: "Review my code" }).click();
  await expect(page.getByText(/Local Backup.*Review checklist/)).toBeVisible();
  await expect(page.getByText(/Hidden test results/)).toHaveCount(0);
});
test("direct final report navigation displays server gate", async ({ page }) => {
  await page.route("**/api/placement/report", route => route.fulfill({ status: 403, json: { message: "Pass Aptitude, Coding, and Interview before opening the final report." } }));
  await page.goto("/placement/report");
  await expect(page.getByRole("alert")).toContainText("Pass Aptitude, Coding, and Interview");
});

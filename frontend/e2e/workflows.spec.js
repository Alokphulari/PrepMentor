import { test, expect } from "@playwright/test";

test("avatar speaks practice evaluation and stops before the next question", async ({ page }) => {
  await page.addInitScript(() => {
    window.narration = [];
    window.cancelledNarration = 0;
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
    Object.defineProperty(window, "speechSynthesis", { value: {
      getVoices: () => [], cancel: () => { window.cancelledNarration++; },
      speak: (utterance) => { window.narration.push(utterance.text); utterance.onstart?.(); },
    } });
  });
  let session = { id: "feedback-voice", status: "active", config: { mode: "practice", role: "Frontend Developer", duration: 20 }, startedAt: new Date().toISOString(), turns: [], currentQuestion: { question: "Explain closures", focus: "JavaScript" } };
  await page.route("**/api/interview-sessions", route => route.fulfill({ json: { session } }));
  await page.route("**/api/interview-sessions/feedback-voice", route => route.fulfill({ json: { session } }));
  await page.route("**/api/interview-sessions/feedback-voice/answer", route => {
    session = { ...session, turns: [{ ...session.currentQuestion, transcript: route.request().postDataJSON().transcript, answerEvaluation: { score: 75, feedback: "Explain the captured lexical scope.", improvements: ["Give a practical example."], source: "AI semantic answer evaluation" } }], currentQuestion: { question: "How would you use a closure in a counter?", focus: "JavaScript" } };
    return route.fulfill({ json: { session } });
  });
  await page.goto("/interview/setup");
  await page.getByRole("button", { name: "Start interview", exact: true }).click();
  await page.getByRole("textbox", { name: "Your response" }).fill("A closure retains access to its lexical scope.");
  await page.getByRole("button", { name: "Submit Answer", exact: true }).click();
  await expect(page.getByText("Ava is reviewing your answer", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.narration.at(-1))).toContain("Your answer scored 75 out of 100.");
  expect(await page.evaluate(() => window.narration.at(-1))).toContain("Give a practical example.");
  await page.getByRole("button", { name: "Stop feedback", exact: true }).click();
  await expect(page.getByText("Your feedback is ready", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Replay feedback", exact: true }).click();
  await expect(page.getByRole("button", { name: "Stop feedback", exact: true })).toBeVisible();
  const stops = await page.evaluate(() => window.cancelledNarration);
  await page.getByRole("button", { name: "Next Question", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Your response" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.cancelledNarration)).toBeGreaterThan(stops);
  await expect.poll(() => page.evaluate(() => window.narration.at(-1))).toContain("How would you use a closure in a counter?");
});

const user = { id: "browser-student", name: "Browser Student", email: "browser@example.test", profileCompleted: true };
const placement = { aptitude: { easy: "passed", medium: "passed", hard: "passed" }, coding: { easy: "available", medium: "locked", hard: "locked" }, interview: { status: "locked", whiteboard: "locked" } };
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { sessionStorage.setItem("prepmentor_auth_token", "test-token"); });
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const responses = {
      "/api/auth/me": { user }, "/api/placement": { placementState: placement }, "/api/history": { history: [] },
      "/api/health": { status: "ok", speech: "browser-only", llm: false, stt: false, tts: false, codeExecution: false },
      "/api/resume": { resume: null }, "/api/baseline": { categories: [{ category: "programming", estimate: null, latestScore: null, source: "not yet assessed" }] },
      "/api/code/problems": { problems: [{ id: "array-sum", difficulty: "easy", title: "Array sum", description: "Read integers and print their sum.", topic: "Arrays", samples: [{ input: "3\n1 2 3", output: "6" }] }] },
      "/api/learning/plan": { plan: { source: "Deterministic evidence-based fallback", learningPlan: [] } },
    };
    await route.fulfill({ json: responses[path] || {}, headers: { "Access-Control-Allow-Origin": "*" } });
  });
});
test("dashboard shows honest baseline and resume builder retains upload", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Skill baseline" })).toBeVisible();
  await expect(page.getByRole("article").filter({has:page.getByRole("heading",{name:"Programming",exact:true})}).getByText("No evidence yet")).toBeVisible();
  await page.goto("/resume");
  await expect(page.getByRole("button", { name: "Upload and analyze" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save draft" })).toBeVisible();
});
test("coding outage shows an error without a score or progress", async ({ page }) => {
  await page.route("**/api/code/submit", (route) => route.fulfill({ status: 503, json: { message: "Code execution is temporarily unavailable. No score was recorded." } }));
  await page.goto("/placement/coding");
  await expect(page.getByRole("textbox", { name: "Source code" })).toBeVisible();
  await page.getByRole("textbox", { name: "Source code" }).fill("print(6)");
  await page.getByRole("button", { name: "Submit solution" }).click();
  await expect(page.getByRole("alert")).toContainText("No score was recorded");
  await expect(page.getByText("Hidden test results", { exact: false })).toHaveCount(0);
});
test("server interview displays adaptive question and allows typed answers", async ({ page }) => {
  const session = { id: "session-test", status: "active", config: { mode: "practice", role: "Software Engineer", duration: 20, interviewType: "Mixed" }, startedAt: new Date().toISOString(), turns: [], currentQuestion: { question: "How do you choose a database index?", focus: "Databases" } };
  await page.route("**/api/interview-sessions", (route) => route.fulfill({ json: { session } }));
  await page.route("**/api/interview-sessions/session-test", (route) => route.fulfill({ json: { session } }));
  await page.route("**/api/interview-sessions/session-test/answer", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.turnIndex).toBe(0);
    expect(body.transcript).toContain("latency");
    await route.fulfill({ json: { session: { ...session, turns: [{ question: session.currentQuestion.question, transcript: body.transcript, answerEvaluation: {score:78, technicalAccuracy:75,relevance:85,communication:80,reasoning:72,strengths:["Specific query example"],improvements:["Explain write costs"],feedback:"Consider write overhead",idealAnswer:"I compare read latency and write overhead under realistic load.",source:"AI semantic answer evaluation"} }], currentQuestion: { question: "How did you measure the latency improvement?", focus: "Performance" } } } });
  });
  await page.goto("/interview/setup");
  await page.getByRole("button", { name: "Start interview", exact: true }).click();
  await expect(page.getByRole("heading", { name: session.currentQuestion.question })).toBeVisible();
  await page.getByRole("textbox", { name: "Your response" }).fill("I choose an index based on query filters and measure latency under realistic load while considering storage costs and the extra overhead of writes.");
  await page.getByRole("button", { name: "Submit Answer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Strong sample answer" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How did you measure the latency improvement?" })).toHaveCount(0);
  await page.getByRole("button", { name: "Next Question", exact: true }).click();
  await expect(page.getByRole("heading", { name: "How did you measure the latency improvement?" })).toBeVisible();
});
test("semantic report shows provider feedback and fluency label", async ({ page }) => {
  await page.route("**/api/interviews/report-test", (route) => route.fulfill({ json: { result: { id: "report-test", score: 81, role: "Backend Developer", type: "Technical", createdAt: new Date().toISOString(), evaluationMode: "AI semantic interview evaluation", metrics: { communication: 80, technical: 82, problemSolving: 80, confidence: 75 }, strengths: ["Specific query example"], weaknesses: ["Missing write cost"], recommendations: ["Compare write overhead"], weakTopics: [{ topic: "Index costs", score: 50, reason: "No write analysis" }], questionFeedback: [{ question: "Choose an index", score: 81, feedback: "Relevant example", betterApproach: "Discuss trade-offs" }] } } }));
  await page.goto("/interview/result/report-test");
  await expect(page.getByText("Specific query example")).toBeVisible();
  await expect(page.getByText("Communication fluency (proxy)")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Question-by-question feedback" })).toBeVisible();
  await expect(page.getByText("they are not semantic AI analysis", { exact: false })).toHaveCount(0);
});

test("dashboard merges daily activity and history without losing streak on reload", async ({ page }) => {
  await page.addInitScript(() => {
    const day=(offset)=>{const d=new Date();d.setDate(d.getDate()-offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
    localStorage.setItem("prepmentor_daily_question_activity:browser-student",JSON.stringify([day(0),day(1)]));
    localStorage.setItem("prepmentor_history:browser-student",JSON.stringify([{id:"old",type:"Coding",title:"Local coding",score:75,createdAt:day(2)+"T12:00:00"}]));
  });
  await page.goto("/dashboard");
  const streak=page.getByText("Current streak",{exact:true}).locator("..");
  await expect(streak).toContainText("3 days");
  await page.reload();
  await expect(streak).toContainText("3 days");
  await expect(page.getByRole("button",{name:/Aptitude practice.*Open practice/})).toBeVisible();
  for(const [name,path] of [["aptitude","/practice/aptitude"],["coding","/coding-interview"],["interview","/interview/setup"]]){
    await page.getByRole("button",{name:`Start ${name} practice`,exact:true}).click();
    await expect(page).toHaveURL(new RegExp(path+"$"));
    await page.goto("/dashboard");
  }
});
test("daily question records activity without displaying or requesting a roadmap",async({page})=>{
  let requests=0;page.on("request",request=>{if(request.url().includes("career-roadmap"))requests++;});
  await page.goto("/question-of-the-day");
  await page.locator("section button").first().click();
  await page.getByRole("button",{name:"Lock in answer"}).click();
  await expect(page.getByText("Completed today",{exact:true})).toBeVisible();
  await expect(page.getByRole("dialog",{name:"Personalized career roadmap"})).toHaveCount(0);
  expect(requests).toBe(0);
});
test("performance keeps actual dates, labels and newest-first attempt ordering",async({page})=>{
  await page.route("**/api/history",route=>route.fulfill({json:{history:[{id:"older",type:"Coding",title:"Coding Practice",score:74,createdAt:"2026-09-18T05:00:00.000Z"},{id:"newer",type:"Interview",title:"Technical Interview",score:82,createdAt:"2026-09-19T05:00:00.000Z"}]}}));
  await page.goto("/performance");
  const rows=page.locator("tbody tr");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("Technical Interview");
  await expect(rows.nth(0)).toContainText("Excellent");
  await expect(rows.nth(0)).toContainText("Interview date");
  await expect(rows.nth(0).locator("time")).toHaveAttribute("datetime","2026-09-19T05:00:00.000Z");
  await expect(rows.nth(1)).toContainText("Good");
});
test("Learning Hub keeps reference and reflection gates and refresh progress",async({page})=>{
  await page.addInitScript(()=>{if(!localStorage.getItem("prepmentor_learning_session:browser-student"))localStorage.setItem("prepmentor_learning_session:browser-student",JSON.stringify({topicPerformance:[{topic:"Data Structures",percentage:52}]}));});
  await page.goto("/learning");
  await page.screenshot({path:"test-results/learning-desktop.png",fullPage:true});
  await page.getByRole("button",{name:"Switch to dark mode"}).click();
  await page.screenshot({path:"test-results/learning-desktop-dark.png",fullPage:true});
  const finish=page.getByRole("button",{name:"Mark topic complete",exact:true});
  await expect(page.getByRole("button",{name:"Return to practice",exact:true})).toBeDisabled();
  const reference = page.getByRole("link").filter({has:page.locator("svg.lucide-external-link")}).first();
  await page.context().route(await reference.getAttribute("href"), route => route.fulfill({ contentType: "text/html", body: "<p>Learning reference</p>" }));
  const popup=page.waitForEvent("popup");
  await reference.click();
  await (await popup).close();
  await expect(finish).toBeDisabled();
  await page.locator("textarea").fill("I use a hash table to retrieve values by key and handle collisions carefully while comparing memory usage and lookup costs with a sorted array.");
  await page.getByRole("button",{name:"Complete assignment",exact:true}).click();
  await page.reload();
  await expect(page.getByRole("button",{name:"Assignment completed",exact:true})).toBeDisabled();
  await expect(page.getByRole("button",{name:"Return to practice",exact:true})).toBeEnabled();
});
test("baseline and Learning Hub fit mobile and dark surfaces",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/dashboard");
  await expect(page.getByRole("heading",{name:"Skill baseline",exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:"test-results/dashboard-mobile.png",fullPage:true});
  await page.getByRole("button",{name:"Switch to dark mode"}).click();
  await page.screenshot({path:"test-results/dashboard-mobile-dark.png",fullPage:true});
  await page.goto("/learning");
  await expect(page.getByRole("heading",{name:"Personalized Learning Hub",exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test("Placement interview advances without samples and final report includes answers",async({page})=>{
  const start=new Date().toISOString();
  let session={id:"placement-session",status:"active",config:{mode:"placement",role:"Software Engineer",duration:20},startedAt:start,turns:[],currentQuestion:{question:"Describe your API design.",focus:"APIs"}};
  await page.route("**/api/interview-sessions",route=>route.fulfill({json:{session}}));
  await page.route("**/api/interview-sessions/placement-session",route=>route.fulfill({json:{session}}));
  let submissions=0;
  await page.route("**/api/interview-sessions/placement-session/answer",async route=>{
    submissions++;const body=route.request().postDataJSON();
    const turn={...session.currentQuestion,transcript:body.transcript};
    session={...session,turns:[...session.turns,turn],currentQuestion:{question:"How do you handle API failures?",focus:"APIs"}};
    if(submissions===2)session.result={id:"placement-report",mode:"placement",score:82,role:"Backend Developer",type:"Technical",createdAt:new Date().toISOString(),evaluationMode:"AI semantic interview evaluation",metrics:{communication:80,technical:85,problemSolving:80,confidence:80},questionFeedback:session.turns.map(turn=>({question:turn.question,answer:turn.transcript,score:82,feedback:"Clear explanation",idealAnswer:"Use a consistent error envelope and appropriate HTTP status codes."}))};
    await route.fulfill({json:{session}});
  });
  await page.goto("/interview/setup");
  await page.getByRole("button",{name:"Start interview",exact:true}).click();
  await page.getByRole("textbox",{name:"Your response"}).fill("I design resource endpoints with clear contracts and validate every request while ensuring authorization and consistent status codes for all supported operations.");
  await page.getByRole("button",{name:"Submit Answer",exact:true}).evaluate(button=>{button.click();button.click();});
  await expect(page.getByRole("heading",{name:"How do you handle API failures?"})).toBeVisible();
  expect(submissions).toBe(1);
  await expect(page.getByRole("heading",{name:"Strong sample answer"})).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading",{name:"How do you handle API failures?"})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Strong sample answer"})).toHaveCount(0);
  await page.getByRole("textbox",{name:"Your response"}).fill("I return useful error codes without exposing internal details and log a correlation identifier so operators can diagnose each failure safely and consistently.");
  await page.getByRole("button",{name:"Submit Answer",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Strong sample answer"})).toHaveCount(2);
  await expect(page.getByText("Your answer",{exact:true})).toHaveCount(2);
});
test("voice transcript remains editable and question playback can replay and stop",async({page})=>{
  await page.addInitScript(()=>{
    window.voiceCalls={speak:0,stop:0};
    Object.defineProperty(window,"speechSynthesis",{value:{getVoices:()=>[],speak:(utterance)=>{window.voiceCalls.speak++;utterance.onstart?.();},cancel:()=>{window.voiceCalls.stop++;}}});
    window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
    Object.defineProperty(navigator.mediaDevices,"getUserMedia",{value:async()=>({getTracks:()=>[{stop(){}}]})});
    window.SpeechRecognition=class{start(){this.onresult?.({resultIndex:0,results:[Object.assign([{transcript:"I explain my approach using a concrete example"}],{isFinal:true})]});this.onend?.();}stop(){}abort(){}};
  });
  const session={id:"voice-session",status:"active",config:{mode:"practice",role:"Software Engineer",duration:20},startedAt:new Date().toISOString(),turns:[],currentQuestion:{question:"Explain your approach.",focus:"Reasoning"}};
  await page.route("**/api/interview-sessions",route=>route.fulfill({json:{session}}));
  await page.route("**/api/interview-sessions/voice-session",route=>route.fulfill({json:{session}}));
  await page.goto("/interview/setup");await page.getByRole("button",{name:"Start interview",exact:true}).click();
  await expect(page.getByRole("button",{name:"Stop spoken question"})).toBeVisible();
  await page.getByRole("button",{name:"Stop spoken question"}).click();
  await page.getByRole("button",{name:"Replay spoken question"}).click();
  await expect.poll(()=>page.evaluate(()=>window.voiceCalls.speak)).toBeGreaterThan(1);
  await page.getByRole("button",{name:"Answer with voice"}).click();
  await expect(page.getByRole("textbox",{name:"Your response"})).toHaveValue("I explain my approach using a concrete example");
  await page.getByRole("textbox",{name:"Your response"}).fill("An edited transcript with my own corrections.");
  await expect(page.getByRole("textbox",{name:"Your response"})).toHaveValue("An edited transcript with my own corrections.");
});

test("recommended learning topic opens stored tasks in the remediation workspace",async({page})=>{
  await page.route("**/api/learning/plan",route=>route.fulfill({json:{plan:{source:"AI personalized plan",weakTopics:[{topic:"Databases",score:52}],learningPlan:[{topic:"Databases",priority:"high",explanation:"Index costs need review",tasks:["Compare read and write costs for a composite index"],practiceGoal:"Explain the tradeoff with a measured example"}]}}}));
  await page.goto("/learning");
  await page.getByRole("link",{name:"Start learning",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Databases",exact:true})).toBeVisible();
  await expect(page.getByText("Compare read and write costs for a composite index",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Return to practice",exact:true})).toBeDisabled();
  await page.reload();
  await expect(page.getByRole("heading",{name:"Databases",exact:true})).toBeVisible();
});


test("remote interview passes eight turns, restores drafts, recovers 409 and preserves the report", async ({ page }) => {
  let session = { id: "dynamic-session", status: "active", config: { mode: "practice", role: "Software Engineer", duration: 20, interviewType: "Mixed" }, startedAt: new Date().toISOString(), turns: [], currentQuestion: { question: "Dynamic question 1", focus: "Engineering" } };
  let starts = 0;
  let conflict = true;
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/interview-sessions", route => { starts++; return route.fulfill({ json: { session } }); });
  await page.route("**/api/interview-sessions/dynamic-session", route => route.fulfill({ json: { session } }));
  await page.route("**/api/interview-sessions/dynamic-session/answer", route => {
    const body = route.request().postDataJSON();
    if (conflict) { conflict = false; return route.fulfill({ status: 409, json: { message: "Refresh the session" } }); }
    expect(body.turnIndex).toBe(session.turns.length);
    session = { ...session, turns: [...session.turns, { ...session.currentQuestion, transcript: body.transcript, answerEvaluation: { score: 75, source: "AI semantic answer evaluation", feedback: "Explain tradeoffs", idealAnswer: "Compare time and space costs." } }], currentQuestion: { question: `Dynamic question ${session.turns.length + 2}`, focus: "Engineering" } };
    if (body.finish) session = { ...session, status: "completed", currentQuestion: null, result: { id: "dynamic-report", role: "Software Engineer", score: 75, evaluationMode: "AI semantic interview evaluation", metrics: {}, questionFeedback: session.turns.map(turn => ({ question: turn.question, answer: turn.transcript, score: 75, feedback: "Explain tradeoffs", idealAnswer: "Compare time and space costs." })) } };
    return route.fulfill({ json: { session } });
  });
  await page.route("**/api/history", route => route.fulfill({ json: { history: session.result ? [{ id: "dynamic-report", title: "Software Engineer Interview", type: "Interview", score: 75, createdAt: new Date().toISOString() }] : [] } }));
  await page.goto("/interview/setup");
  await page.getByRole("button", { name: "Start interview", exact: true }).click();
  await page.getByRole("textbox", { name: "Your response" }).fill("A concise answer.");
  await page.getByRole("button", { name: "Submit Answer", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Your response" })).toHaveValue("A concise answer.");
  for (let index = 0; index < 9; index++) {
    await expect(page.getByRole("heading", { name: `Dynamic question ${index + 1}`, exact: true })).toBeVisible();
    await page.getByRole("textbox", { name: "Your response" }).fill(`Answer for question ${index + 1}`);
    await page.getByRole("button", { name: "Submit Answer", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Strong sample answer" })).toBeVisible();
    if (index === 7) {
      await page.reload();
      await expect(page.getByRole("heading", { name: "Strong sample answer" })).toBeVisible();
    }
    await page.getByRole("button", { name: "Next Question", exact: true }).click();
  }
  await page.getByRole("textbox", { name: "Your response" }).fill("Draft survives refresh");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Dynamic question 10", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Your response" })).toHaveValue("Draft survives refresh");
  expect(starts).toBe(1);
  await page.getByRole("button", { name: "Finish interview after this answer" }).click();
  await expect(page).toHaveURL(/interview\/result\/dynamic-report$/);
  await expect(page.getByRole("heading", { name: "Question-by-question feedback" })).toBeVisible();
  await page.goto("/history");
  await expect(page.getByText("Software Engineer Interview", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("backend voice appends editable transcription, releases tracks and rejects permission denial", async ({ page }) => {
  await page.addInitScript(() => {
    window.SpeechRecognition = undefined;
    window.webkitSpeechRecognition = undefined;
    window.stoppedTracks = 0;
    window.denyMicrophone = false;
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia: async () => {
      if (window.denyMicrophone) throw new DOMException("Denied", "NotAllowedError");
      return { getTracks: () => [{ stop: () => { window.stoppedTracks++; } }] };
    } } });
    window.MediaRecorder = class {
      static isTypeSupported(type) { return type === "audio/webm;codecs=opus"; }
      constructor(_stream, options) { this.mimeType = options.mimeType; this.state = "inactive"; }
      start() { this.state = "recording"; }
      stop() { this.state = "inactive"; this.ondataavailable({ data: new Blob(["recorded audio"], { type: this.mimeType }) }); this.onstop(); }
    };
  });
  const session = { id: "voice-session", status: "active", config: { mode: "practice", role: "Software Engineer", duration: 20 }, startedAt: new Date().toISOString(), turns: [], currentQuestion: { question: "Explain a project", focus: "Engineering" } };
  await page.route("**/api/health", route => route.fulfill({ json: { llm: true, stt: true, tts: false } }));
  await page.route("**/api/interview-sessions", route => route.fulfill({ json: { session } }));
  await page.route("**/api/interview-sessions/voice-session", route => route.fulfill({ json: { session } }));
  await page.route("**/api/speech/transcribe", route => {
    expect(route.request().postDataJSON().mimeType).toBe("audio/webm;codecs=opus");
    return route.fulfill({ json: { transcript: "Transcribed project explanation." } });
  });
  await page.goto("/interview/setup");
  await page.getByRole("button", { name: "Start interview", exact: true }).click();
  await page.getByRole("textbox", { name: "Your response" }).fill("Typed introduction.");
  await page.getByRole("button", { name: "Answer with voice" }).click();
  await expect(page.getByText("Recording...", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Stop listening" }).click();
  await expect(page.getByRole("textbox", { name: "Your response" })).toHaveValue("Typed introduction. Transcribed project explanation.");
  expect(await page.evaluate(() => window.stoppedTracks)).toBe(1);
  await page.getByRole("textbox", { name: "Your response" }).fill("Edited transcript");
  await page.evaluate(() => { window.denyMicrophone = true; });
  await page.getByRole("button", { name: "Answer with voice" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Microphone access is blocked" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Type answer instead", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Your response" })).toHaveValue("Edited transcript");
});

test("interview setup preserves settings and can retry after Gemini overload", async ({ page }) => {
  let attempts = 0;
  const session = { id: "retry-session", config: { role: "Software Engineer", mode: "practice", duration: 10 }, startedAt: new Date().toISOString(), status: "active", turns: [], currentQuestion: { question: "Explain a database index", focus: "Databases" } };
  await page.route("**/api/interview-sessions", route => {
    attempts++;
    return route.fulfill(attempts === 1 ? { status: 503, json: { message: "Gemini is experiencing high demand. Please retry shortly." } } : { json: { session } });
  });
  await page.route("**/api/interview-sessions/retry-session", route => route.fulfill({ json: { session } }));
  await page.goto("/interview/setup");
  await page.getByLabel("Target role").selectOption("Software Engineer");
  await page.getByRole("button", { name: "Start interview", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("high demand");
  await expect(page.getByLabel("Target role")).toHaveValue("Software Engineer");
  await page.getByRole("button", { name: "Start interview", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Your response" })).toBeVisible();
  expect(attempts).toBe(2);
});

test("interview setup stops a stalled request and releases its start button", async ({ page }) => {
  await page.clock.install();
  await page.route("**/api/interview-sessions", () => {});
  await page.goto("/interview/setup");
  await page.getByRole("button", { name: "Start interview", exact: true }).click();
  await page.clock.fastForward(9000);
  await expect(page.getByText(/Gemini is taking longer than usual/)).toBeVisible();
  await page.clock.fastForward(17000);
  await expect(page.getByRole("alert")).toContainText("settings are preserved");
  await expect(page.getByRole("button", { name: "Start interview", exact: true })).toBeEnabled();
});

test("question audio never overlaps and a TTS outage falls back while typing stays available", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.audioChecks = { active: 0, maximum: 0, fallback: 0 };
    window.Audio = class {
      constructor() { this.playing = false; }
      async play() { this.playing = true; window.audioChecks.active++; window.audioChecks.maximum = Math.max(window.audioChecks.maximum, window.audioChecks.active); this.onplay?.(); }
      pause() { if (this.playing) window.audioChecks.active--; this.playing = false; }
    };
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
    Object.defineProperty(window, "speechSynthesis", { value: { getVoices: () => [], cancel() {}, speak(prompt) { window.audioChecks.fallback++; prompt.onstart?.(); } } });
  });
  const session = { id: "audio-session", status: "active", config: { mode: "practice", role: "Software Engineer", duration: 10 }, startedAt: new Date().toISOString(), turns: [], currentQuestion: { question: "Explain indexes", focus: "Databases" } };
  let outage = false;
  await page.route("**/api/health", route => route.fulfill({ json: { llm: true, stt: false, tts: true } }));
  await page.route("**/api/interview-sessions", route => route.fulfill({ json: { session } }));
  await page.route("**/api/interview-sessions/audio-session", route => route.fulfill({ json: { session } }));
  await page.route("**/api/speech/synthesize", route => route.fulfill(outage ? { status: 503, json: { message: "TTS unavailable" } } : { json: { mimeType: "audio/wav", audio: "AAAA" } }));
  await page.goto("/interview/setup");
  await page.getByRole("button", { name: "Start interview", exact: true }).click();
  await page.getByRole("button", { name: "Stop spoken question" }).click();
  await page.getByRole("button", { name: "Replay spoken question" }).click();
  await page.getByRole("button", { name: "Stop spoken question" }).click();
  outage = true;
  await page.getByRole("button", { name: "Replay spoken question" }).click();
  await expect.poll(() => page.evaluate(() => window.audioChecks.fallback)).toBe(1);
  await page.getByRole("textbox", { name: "Your response" }).fill("An index speeds selective lookups.");
  expect(await page.evaluate(() => window.audioChecks.maximum)).toBe(1);
  await page.goto("/dashboard");
  expect(errors).toEqual([]);
});

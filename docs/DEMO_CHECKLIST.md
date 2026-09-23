# Demonstration checklist

## Before the demonstration

1. Use Node 24. Install both workspaces and configure the environment examples as described in README.
2. Configure MongoDB, the LLM/STT/TTS models, and Judge0. Google sign-in is optional; password login works without it.
3. Run `npm.cmd run check`, then `npm.cmd run dev` on Windows.
4. Open `/api/health` on the backend and verify database, llm, stt, tts and codeExecution capabilities. A true capability means configured, not a paid-provider connectivity test.
5. Open the frontend in Chrome/Edge on localhost or HTTPS. Permit the microphone and sound. Never display an environment file containing secrets on screen.

## Exact main sequence

Register/Login → Profile → Resume → Dashboard → Aptitude → Coding → AI Voice Interview → Report → Career Roadmap → History.

1. **Register/Login:** Create an email/password account or use configured Google Sign-In.
2. **Profile:** Complete your profile, experience and target role; continue to Resume Studio.
3. **Resume:** Upload a selectable-text PDF/DOCX or save a manually built resume and click Analyze saved builder resume. Inspect the analysis source and skills. Inspect baseline categories; distinguish estimates from assessment evidence.
4. **Dashboard:** Confirm your account details, baseline, empty/latest measured scores and existing daily features.
5. **Aptitude:** Open Placement. Pass Easy, Medium and Hard in order. Verify Coding is locked before Aptitude Hard passes. Practice remains unrestricted.
6. **Coding:** Write a full stdin/stdout program in JavaScript, Python, Java or C++. Run sample tests, then submit hidden tests. Verify score, runtime and memory. Pass Easy, Medium and Hard to unlock Interview. A Java submission uses `public class Main`.
7. **AI Voice Interview:** Enter from Placement so the session mode is Placement. Select role/type/focus and start. Listen to the first question. Record an answer, stop, wait for transcription, edit text if needed, then continue. Confirm the next question reacts to your answer. Replay and stop voice. Repeat and finish.
8. **Report:** Inspect the evaluation mode, strengths, weaknesses, weak topics, fluency proxy and question feedback. A fallback rubric must be visibly labelled and must not pass Placement.
9. **Career Roadmap:** Generate an AI roadmap and inspect tasks/success metrics. Reload and retrieve the persisted snapshot through the API if needed.
10. **History:** Confirm the completed coding/interview attempts and analytics. Sign out, sign in and confirm server progress survives.

## Failure demonstrations

- Submit an incorrect coding solution: inspect failed results, open Learning Hub, review a curated reference and write a worked reflection of at least 20 words. Complete the topic, unlock the retake and try again.
- Fail the Placement interview: open Learning Hub from the report/Placement page, complete the required reflection and retry.
- Disable Judge0: submission must show execution unavailable; no score or pass is recorded.
- Disable AI: questions use curated fallback, roadmap/learning use explicit deterministic fallback, voice uses browser support or typed input. Resume extraction reports analysis unavailable.
- Deny microphone permission: typing still works. Navigate away while recording and confirm the microphone indicator stops.
- Try a mismatched/oversized document: receive a validation error.
- Use a second account to request the first account's session/report: receive 404.
- With production mode enabled, an unavailable MongoDB must report degraded health and storage errors, never silently switch to JSON.

## Automated verification

`npm.cmd test` runs unit/API tests without paid services. `npm.cmd run check` adds lint/build. `npm.cmd exec --prefix frontend -- playwright test --config frontend/playwright.config.js` runs mocked browser workflow tests using installed Chrome. Set `PLAYWRIGHT_CHANNEL=msedge` for Edge or install Chromium and adjust the channel as needed.

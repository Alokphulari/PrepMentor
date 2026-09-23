# Reliable interview and presentation mode

The existing interview uses Gemini first. If question generation, answer evaluation,
or report generation fails, it continues with the deterministic local engine. No
additional paid provider is required. The real `backend/.env` is unchanged.

## Behavior

- One eight-second deadline covers each provider operation, including at most one
  retry after one second. Rate limits, server errors, network failures, and invalid
  structured output can retry once within that deadline. A hung request falls back
  at the deadline without starting another eight-second wait.
- Missing configuration, invalid credentials, timeouts, outages, and repeated
  questions all fall back. Provider diagnostics stay in backend logs; SDK error
  text is not logged because it could contain credentials or request data.
- A session remains local once fallback activates. Its ID, timer, answers,
  question history, and scores are preserved. Refresh restores the saved session.
- Sessions record `providerUsed`, `fallbackUsed`, `questionsAsked`, `answers`,
  `scores`, `currentQuestion`, and `currentDifficulty`. Individual questions and
  evaluations also identify their provider. Existing concurrency/version checks
  and atomic result/history writes are preserved.
- The local bank has 220 questions: Frontend 20, JavaScript 20, React 20,
  HTML/CSS 15, MERN 20, Node/Express 15, MongoDB 15, DBMS 15, OOP 15,
  Operating Systems 10, Computer Networks 10, HR/Behavioral 20, Project 15,
  and Problem Solving 10. Selection considers role, focus, format, difficulty,
  topic coverage, and previous answers. It excludes already-asked questions.
- Local scoring uses concept keywords, relevant concept coverage, answer length,
  examples/reasoning markers, and completeness. Reports and per-answer feedback
  explicitly identify the local rubric. These are heuristic estimates, not
  Gemini evaluations or a guarantee of technical correctness. Mixed reports
  preserve the provider and scores of earlier Gemini evaluations.
- Placement prerequisites, the 80% pass threshold, failed-state remediation, and
  assessment feedback hiding remain in effect. Local scores can now complete
  Placement and pass/fail at that same threshold. Active Placement responses hide
  private scores, keyword hints, and follow-ups.
- The existing design is retained. Fallback displays only the subtle status
  “Backup interview engine active”. Both report types display the score,
  technical knowledge, communication, problem solving, relevance, strengths,
  improvements, and question-by-question feedback.
- Question narration is independent of Gemini. Existing separately configured
  backend TTS can be used; failures fall back to browser `speechSynthesis`.
  Local sessions use browser narration directly. No TTS key is required.
- Supported browsers use continuous browser recognition first. Partial words
  appear immediately in the answer box; corrected partials replace previous text
  instead of duplicating it. Stop listening finalizes the answer for editing and
  submission. Existing typed text is retained.
- Browser recognition also keeps a bounded backup recording in memory. If Chrome
  ends without any transcript, the same audio is sent to configured backend STT
  automatically. A microphone sound indicator distinguishes missing input from a
  transcription failure. Recordings and microphone tracks are released afterward;
  raw audio is not saved to the user store. Demo mode still makes no Gemini calls.
- Gemini audio requests explicitly request verbatim transcription. If the dedicated
  transcription model returns empty output or rejects the request, the configured
  interview model can transcribe that audio within the remaining eight-second
  budget. Real `.env` settings are unchanged.
- Existing microphone/STT recording remains available when browser recognition
  is unsupported or its service cannot connect. Recorded audio is transcribed
  after Stop listening, as indicated on screen. Failed providers are not retried
  repeatedly. “Type answer instead” remains available when neither service works.
  Voice requests are bounded; audio or microphone failure never prevents typing.
- Development CORS accepts localhost/127.0.0.1 on ports 5173 and 5174. Production
  continues to allow only `CLIENT_ORIGIN`.

## Environment and startup

The new optional setting defaults to false:

```dotenv
INTERVIEW_DEMO_MODE=false
```

Keep existing backend-only `GEMINI_API_KEY`, `GEMINI_INTERVIEW_MODEL`, and
`INTERVIEW_AI_PROVIDER=gemini` for normal operation. Without a Gemini key, the
interview still works locally. The frontend needs its existing
`VITE_API_BASE_URL=http://localhost:4000`. Never put provider keys in a `VITE_`
variable. `CLIENT_ORIGIN` must match the deployed frontend in production.

Run from the repository root in PowerShell:

```powershell
npm.cmd run dev
```

Open `http://localhost:5173/login`. Keep the terminal running.

For a presentation, stop the previous development command, then run:

```powershell
$env:INTERVIEW_DEMO_MODE = "true"
npm.cmd run dev
```

This does not edit `.env`. In demo mode the interview, STT, and TTS paths make no
Gemini calls. Browser speech recognition may still depend on the browser's own
speech service; typing remains available. To resume normal Gemini-first behavior,
stop the process, set `$env:INTERVIEW_DEMO_MODE = "false"`, and restart. Existing
sessions that already switched to local stay local; start a new session to use
Gemini again.

`GET http://localhost:4000/api/interview/health` is public and returns only:

```json
{
  "interviewService": "ready",
  "geminiConfigured": true,
  "fallbackEngine": true,
  "demoMode": false
}
```

`geminiConfigured` means a key is present, not that quota is available. Readiness
does not make a billable request. Authentication, a running API, and writable
application storage are still required to save interview sessions.

## Verification and simulated failures

From the repository root:

```powershell
npm.cmd --prefix backend run check
npm.cmd --prefix backend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run build
```

To exercise Gemini failures without consuming quota or changing real secrets:

```powershell
Push-Location backend
node --test test/interviewFallback.test.js
Pop-Location
```

Tests cover working Gemini, 429/quota, 500/502/503/504, invalid credentials and
JSON, duplicate questions, network failure, an actual eight-second stalled
provider, missing keys, disabled provider, and demo mode. They complete full
20-question local interviews, restore persisted state, verify mixed-provider
reports, and check locked/available/failed/passed Placement behavior. All test
user storage is temporary; external provider calls are mocked.

Run Chrome browser checks from `frontend` (Chrome must be installed):

```powershell
Push-Location frontend
npx.cmd playwright test e2e/workflows.spec.js e2e/interviewFallback.spec.js --reporter=line
Pop-Location
```

The fallback browser tests use a real isolated backend in demo mode. They verify
start, draft and feedback restoration after refresh, completion, report metrics,
server TTS failure to browser narration, STT quota failure, retained drafts, and
typed completion. The existing workflow suite also covers microphone permission
denial and Placement. No real student account is created or changed.

Verified after implementation: 85 backend tests, 76 frontend unit tests, and
21 Chrome browser tests passed. Backend syntax checking, frontend lint, and the
production build passed. The running API returned `interviewService: "ready"`
with `fallbackEngine: true`. Gemini success and failures were simulated without
using a real provider key or consuming quota.

## Files added

- `backend/data/interviewQuestions.json`
- `backend/services/localInterviewService.js`
- `backend/services/interviewAIService.js`
- `backend/test/interviewFallback.test.js`
- `frontend/e2e/interviewFallback.spec.js`
- `frontend/src/utils/voiceBackup.js`
- `frontend/test/voiceBackup.test.js`
- `docs/INTERVIEW_FALLBACK.md`

## Existing files updated for this change

- `backend/.env.example`
- `backend/src/ai/interviewProvider.js`
- `backend/src/interviewSessions.js`
- `backend/src/interviewAnswer.js`
- `backend/src/interviewEvaluator.js`
- `backend/src/speechTranscription.js`
- `backend/src/server.js`
- `backend/test/geminiSessions.test.js`
- `backend/test/interviewRegressions.test.js`
- `backend/test/voiceInterview.test.js`
- `frontend/src/pages/InterviewSetupWorkspace.jsx`
- `frontend/src/pages/Interview.jsx`
- `frontend/src/pages/InterviewResult.jsx`
- `frontend/src/components/AnswerFeedback.jsx`
- `frontend/src/services/speechService.js`
- `frontend/e2e/workflows.spec.js` (updated existing button/status assertions)

Other pre-existing working-tree changes are unrelated to this implementation.

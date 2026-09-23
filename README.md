# PrepMentor

AI-Powered Real-Time Voice Agent Platform for Progressive Placement Preparation.

This repository retains the existing React 19/Vite/Tailwind UI, dark/light mode, navigation, resume builder, practice catalog, daily engagement and Placement progression. A Node HTTP API provides authentication, persistence, server AI, document analysis and sandbox execution.

## Architecture

- frontend/src: existing pages, reusable UI, contexts, account-scoped caches and API clients.
- backend/src/ai: shared compatible AI provider, environment configuration, bounded retries, timeouts and structured-output validation.
- backend/src/interviewSessions.js: authenticated, persistent conversations and final evaluation. Recent context is bounded; all completed turns are evaluated.
- backend/src/codingAssessment.js: curated execution problems and Judge0 sample/hidden tests. Candidate code is never executed by this server. Hidden inputs, expected outputs, stdout and stderr are not returned.
- backend/src/resumeAnalysis.js and documentWorker.js: PDF/DOCX validation and bounded text extraction; only validated analysis is retained.
- backend/src/userStore.js and mongoRepository.js: atomic development JSON storage or MongoDB with optimistic concurrency. Related records are bounded embedded aggregates owned by the user.
- Existing deterministic question/roadmap/learning services remain honest offline fallbacks.

See the [voice interview completion and verification report](docs/VOICE_INTERVIEW_COMPLETION.md), [implementation status](docs/IMPLEMENTATION_STATUS.md), [baseline audit](docs/BASELINE.md) and [demo checklist](docs/DEMO_CHECKLIST.md).

## Installation and local development

Use Node.js 24 LTS and npm. Run from the repository root. In Windows PowerShell use npm.cmd if npm.ps1 is blocked; no execution-policy change is needed.

```powershell
npm.cmd ci --prefix frontend
npm.cmd ci --prefix backend
Copy-Item frontend/.env.example frontend/.env
Copy-Item backend/.env.example backend/.env
npm.cmd run dev
```

Copy examples only on initial setup; do not overwrite an existing environment file. On macOS/Linux use npm and cp instead.

Open http://localhost:5173. The API runs at http://localhost:4000; /api/health reports safe configuration capabilities. Stop both with Ctrl+C. Separate commands are npm.cmd --prefix backend run dev and npm.cmd --prefix frontend run dev:client.

## Environment setup

No credentials are included. Environment files are ignored. Never prefix a server secret with VITE_. Vite variables are public browser configuration.

| Server variable | Purpose |
|---|---|
| PORT | API port; hosting may supply it |
| CLIENT_ORIGIN | Exact allowed frontend origin, without a trailing slash |
| NODE_ENV | development locally; production on Render |
| MONGODB_URI | MongoDB connection string; required in production |
| MONGODB_DB_NAME | Database name, defaults to prepmentor |
| AI_PROVIDER | openai or openrouter for text generation |
| OPENAI_API_KEY | Backend-only OpenAI-compatible key |
| OPENAI_BASE_URL | Compatible API base, normally https://api.openai.com/v1 |
| OPENAI_LLM_MODEL | Responses API model supporting JSON-object output |
| OPENAI_STT_MODEL | Explicit audio transcription model |
| OPENAI_TTS_MODEL | Explicit text-to-speech model |
| OPENAI_TTS_VOICE | Supported voice; default alloy |
| OPENROUTER_API_KEY / OPENROUTER_BASE_URL / OPENROUTER_LLM_MODEL | Optional text-provider configuration |
| JUDGE0_BASE_URL / JUDGE0_API_KEY | Sandbox endpoint and credential |
| JUDGE0_RAPIDAPI_HOST | Required only when using a RapidAPI-hosted Judge0 endpoint |
| GOOGLE_CLIENT_ID | Public OAuth web client ID used for server verification |

Frontend VITE_API_BASE_URL points to the API origin. Optional VITE_GOOGLE_CLIENT_ID is public; the rendered Google button uses the server-advertised client ID to avoid mismatched configuration.

Legacy LLM_API_KEY, LLM_BASE_URL, LLM_MODEL, LLM_TRANSCRIPTION_MODEL, LLM_TTS_MODEL and LLM_TTS_VOICE remain accepted where the corresponding OPENAI_* value is absent. Model names are configured centrally, not embedded across application logic.

## MongoDB Atlas

1. At [MongoDB Atlas](https://www.mongodb.com/cloud/atlas), create a cluster and a dedicated database user with access only to the prepmentor database. Use a strong password and keep the URI on the backend.
2. Allow your local IP for development and the backend host's outbound addresses for deployment in Atlas Network Access. Avoid unrestricted network access where fixed egress addresses are available.
3. Copy the driver connection string into MONGODB_URI and set MONGODB_DB_NAME. Percent-encode reserved characters in credentials.
4. Restart the API. /api/health must report database: mongodb. Indexes on user email and ID are created automatically.
5. Back up the database. Existing JSON data is not silently migrated; retain a backup and perform a deliberate migration if needed.

With no URI, development/tests use the atomic JSON store at backend/data/users.json (or PREPMENTOR_DATA_FILE). Production requires MongoDB and never silently falls back when it fails. Authentication sessions and rate limits are process-local, so deploy one API instance; restarting the API requires login again, but stored results survive.

## LLM, transcription and speech

Create a project and API key at [OpenAI Platform](https://platform.openai.com/api-keys), enable API billing, and set OPENAI_API_KEY only in backend/.env. Set OPENAI_LLM_MODEL to a Responses-compatible model available to your account, for example [gpt-5-mini](https://developers.openai.com/api/docs/models/gpt-5-mini). OpenAI text requests use /v1/responses with store:false and JSON output; no unsupported temperature option is sent. All outputs undergo application validation. The provider retries network failures, 429 and 5xx once, but not malformed requests. Missing keys/models expose false capabilities and use labelled fallbacks.

For an OpenRouter text model set AI_PROVIDER=openrouter, OPENROUTER_API_KEY and the model ID in OPENROUTER_LLM_MODEL (OPENAI_LLM_MODEL remains a legacy fallback). Speech continues to use the OpenAI-compatible audio settings.

For STT set OPENAI_STT_MODEL to your supported file-transcription model, for example gpt-4o-mini-transcribe when available to your account. MediaRecorder sends a bounded base64 audio payload to the authenticated backend, which forwards multipart audio to /audio/transcriptions. WebM, OGG, MP4, WAV and MPEG MIME types are accepted up to 6 MB. The candidate can edit the transcript or type if transcription fails.

For TTS set OPENAI_TTS_MODEL=gpt-4o-mini-tts and OPENAI_TTS_VOICE=alloy, subject to your account access. The backend requests MP3 from /audio/speech. The interview replays/stops audio and falls back to browser speech. Audio is AI-generated. Browser autoplay and microphone access require permission; use localhost or HTTPS.

See the official [OpenAI audio reference](https://developers.openai.com/api/reference/typescript/resources/audio) and [structured output guide](https://developers.openai.com/api/docs/guides/structured-outputs). JSON mode is supplemented by strict application validation; it is not assumed to guarantee a schema by itself.

## Judge0

Configure a trusted Judge0 CE deployment or compatible hosted endpoint in JUDGE0_BASE_URL. Supply its API key if required. The adapter supports X-Auth-Token and X-RapidAPI-Key; set JUDGE0_RAPIDAPI_HOST for RapidAPI.

Sample runs return bounded stdout, stderr and compiler output; hidden runs return aggregates only. The backend creates asynchronous submissions, polls bounded status results and enforces CPU/wall-time/memory/network restrictions. Current language IDs are JavaScript 63, Python 71, Java 62 and C++ 54; confirm these against your instance's /languages endpoint before the demo. Java programs use class Main. All solutions use standard input/output, not a function wrapper.

The three curated execution problems cover Easy, Medium and Hard. Final scores use hidden-test correctness with an 80% pass threshold. AI reviews never decide correctness. A failed submission requires Learning Hub remediation; unavailable execution records no score. The larger practice catalog retains semantic/static review and is labelled as not executed. See [Judge0 API documentation](https://ce.judge0.com/).

## Google authentication

In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create a Google OAuth web client. Add http://localhost:5173 and your deployed frontend origin to Authorized JavaScript origins. Configure the consent screen and test users if the application is in testing. Set GOOGLE_CLIENT_ID on the backend (optionally mirror it in VITE_GOOGLE_CLIENT_ID).

The browser uses Google Identity Services; the server verifies the ID token signature, audience, issuer, expiry, verified email and subject with google-auth-library. Existing password accounts are not silently linked to a new Google identity. When configuration is absent, the Google button is hidden and email/password continues to work. See [Google's verification guide](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

## Interview behavior and recovery

Interview now defaults to the official Gemini SDK. Configure `INTERVIEW_AI_PROVIDER=gemini`, `GEMINI_API_KEY`, `GEMINI_INTERVIEW_MODEL`, `GEMINI_TRANSCRIBE_MODEL` and `GEMINI_TTS_MODEL` in backend/.env. See [Gemini setup and errors](docs/GEMINI_INTERVIEW.md) and the [current completion report](docs/INTERVIEW_COMPLETION_REPORT.md). Earlier generic OpenAI instructions below remain relevant to other modules.

Remote sessions use backend turns, currentQuestion, status and result. There are no placeholder questions. The 10/20/30-minute timer resumes from the server startedAt; the current response is accepted before finishing. The server also enforces a 20-turn safety maximum. The candidate can explicitly finish after an answer. Local offline practice retains its bounded question count.

Practice shows per-answer evaluation before Next Question. Placement hides it until the final report and requires successful Gemini evaluation of every turn and the final report plus its existing 80% threshold to pass. Remote AI failures remain recoverable and never create a fallback score or pass. Question generation receives role, experience, type, difficulty, focus areas, recent answers/evaluations and available weak-topic evidence. The final report evaluates all completed turns.

Refreshing restores the same remote session and the current typed draft. A stale 409 or uncertain network submission refetches progress rather than resubmitting automatically. Results remain in Interview History. The HTML5 Canvas/React whiteboard persists across questions and is cleared when the interview finishes; no Fabric.js is used.

Backend STT is preferred when configured and recording is supported; browser SpeechRecognition is the fallback. MediaRecorder alone does not enable transcription. Voice input reports permission, recording, transcription and error states, appends to existing text, and permits edits. Stop/replay controls cancel previous question audio. TTS falls back to browser speechSynthesis and readable text.

## New API operations

All operations below require a Bearer token and enforce authenticated ownership.

| Endpoint | Operation |
|---|---|
| POST /api/interview-sessions | Start configured practice/Placement session |
| GET /api/interview-sessions/:id | Restore the owned conversation |
| POST /api/interview-sessions/:id/answer | Submit turnIndex/transcript and optional finish |
| POST /api/interview-remediation | Complete reflection after failed interview |
| GET /api/code/problems | Public task statements and samples; no hidden tests |
| POST /api/code/run | Execute sample tests |
| POST /api/code/submit | Execute hidden tests and persist result/progress |
| POST /api/code/remediation | Complete reflection before coding retake |
| POST /api/resume/analyze | Base64 PDF/DOCX or manual:true for saved builder draft |
| GET /api/baseline | Resume estimates plus latest assessment evidence |
| GET/POST /api/learning/plan | Retrieve/generate a persisted learning plan |
| GET/POST /api/career-roadmap | Retrieve/generate roadmap snapshots |

POST /api/auth/google accepts a Google credential and returns an ordinary application session. Existing APIs remain available. GET /api/health is public and returns database, llm, stt, tts, googleAuth and codeExecution plus compatibility fields; capabilities report configuration, not a paid connectivity probe.

## Verification

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run check
npm.cmd exec --prefix frontend -- playwright test --config frontend/playwright.config.js
```

Unit/integration tests isolate storage and mock LLM/STT/TTS/Judge0/Mongo; they do not make paid API calls. Browser tests use mocked API responses and installed Chrome. Set PLAYWRIGHT_CHANNEL=msedge for Edge. Test output directories are ignored. See docs/VERIFICATION.md for the recorded result.

## Production deployment

Frontend: import this repository into Vercel, select frontend as the root directory, set VITE_API_BASE_URL to the HTTPS API origin and build with npm run build. frontend/vercel.json supplies SPA rewrites so deep links reload correctly. Rebuild after changing Vite variables.

Backend: deploy the root render.yaml blueprint or a Node web service using npm ci --prefix backend and npm --prefix backend start. Use Node 24, NODE_ENV=production, the Vercel URL as CLIENT_ORIGIN and MongoDB Atlas credentials. Add AI/speech/Judge0/Google settings as needed in Render's environment UI. Keep secrets out of build output and Git. The deployment must retain the repository's frontend/src/data/interviewQuestions.js because the API reuses that curated bank.

Deploy a single API instance while sessions/rate limits remain process-local. Check /api/health, CORS, Google authorized origins and HTTPS microphone support after deployment. No deployment was performed by the implementation task.

## Troubleshooting

- PowerShell blocks npm.ps1: use npm.cmd.
- Authentication fails: confirm the API is running and the frontend URL matches CLIENT_ORIGIN; login again after an API restart.
- AI capabilities are false: both key and relevant model are required. Restart the API after configuration changes.
- Speech fails: allow microphone/sound, use localhost/HTTPS, check STT/TTS models, and type your answer while troubleshooting.
- Resume has no text: upload a valid unencrypted file with selectable text; scanned PDFs need OCR. Maximum size is 5 MB.
- Judge0 unavailable: verify endpoint/auth headers/language IDs and hosted quota. A service failure cannot unlock a Placement level.
- MongoDB unavailable: check Atlas network rules, encoded credentials and database permissions. Production cannot use the JSON fallback.
- Browser state differs: re-login to restore authoritative server Placement progress; offline browser caches remain for continuity.
- A report says fallback: semantic evaluation did not finish successfully. It must not be presented as AI-scored correctness.


## Credential setup and demo verification

1. Copy missing .env examples using the Windows commands above. For Interview, configure the private Gemini key and models described above. Other modules retain their optional OpenAI/OpenRouter settings.
2. For persistent hosted data, configure Atlas or local MongoDB (`mongodb://127.0.0.1:27017` locally). A failed configured database never silently switches storage.
3. Optionally configure Google Cloud OAuth with matching client IDs in both environment files. Add the exact frontend origin, including port, to authorized JavaScript origins.
4. Configure a [Judge0](https://judge0.com/) server or its [RapidAPI listing](https://rapidapi.com/judge0-official/api/judge0-ce). Copy your endpoint, key and RapidAPI host where applicable. Check language availability on your chosen service.
5. Run `npm.cmd run dev`, then `Invoke-RestMethod http://localhost:4000/api/health`. Expect independent `llm`, `stt`, `tts`, `googleAuth`, `codeExecution` booleans and `database: mongodb` or `file`. True means configured, not that credentials/billing were verified by a paid call.
6. Register, complete your profile, open Interview Setup, select Software Engineer / Mixed / Medium / 10 minutes and start. Allow microphone access; replay audio if autoplay was blocked. Answer with voice, stop, edit the transcript and submit. Review feedback, continue past eight turns, refresh, then finish and open History. Also submit a concise typed answer.
7. For Placement, pass Aptitude, each Coding stage and the AI interview in order. A failed interview opens Learning Hub remediation. Without semantic AI, Placement interview passing is intentionally unavailable.
8. Upload a real selectable-text PDF and DOCX to verify resume extraction and analysis against your own document. No extracted claims are invented when AI is unavailable.

If an API key is rejected, check that it belongs to the correct provider/project, has model access and active billing, and contains no surrounding quotes/whitespace; restart the API. Secrets are never returned in errors. For CORS, match CLIENT_ORIGIN exactly to the browser's origin and rebuild Vite after changing VITE_API_BASE_URL. For microphone failures, check Chrome/Edge site permissions and Windows Settings > Privacy & security > Microphone, select a working input device, and use localhost or HTTPS. Empty recordings can be retried without losing typed text.

Tests use controlled provider responses; they cannot certify your account quota, real microphone transcription quality, Google consent setup, Atlas network access, or hosted Judge0 connectivity. Those require the credential-backed steps above. No paid requests or deployment are performed automatically.

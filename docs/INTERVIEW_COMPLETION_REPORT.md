# AI Interview completion report

Verified 2026-09-22. The private Gemini key is configured. Live question generation, semantic answer evaluation, final-report generation, TTS and STT have now passed individual provider checks. Initial evaluation requests intermittently returned HTTP 503; no fallback grades were produced. A live STT response exposed the SDK's structured `audioTranscription.text` format; the parser was fixed and regression-tested. The live browser journey verified authentication, first-question generation and draft recovery, then failed at answer submission because Gemini returned HTTP 503 high demand. The draft remained intact; no score or pass was recorded. Full live browser acceptance remains incomplete. Physical microphone and audible browser playback are not yet verified.

## Verification matrix

?Browser? below means actual headless Chrome running the React app with simulated provider/audio responses. It is not a live Gemini or physical microphone test.

| Feature | Implemented | Automated Test | Live Test | Status |
|---|---|---|---|---|
| Gemini Question Generation | Official SDK, one validated question | Provider and session tests pass | Live SDK request passed | COMPLETE |
| Adaptive Questions | Previous answers/evaluations, duplicate rejection | Dynamic 20-turn backend and >8-turn browser tests pass | Live browser blocked by Gemini HTTP 503 | FAILED |
| Typed Answers | Nonempty short answers accepted | Backend and Chrome pass | Full live flow blocked by Gemini HTTP 503 | FAILED |
| Microphone Recording | Permission, recording, cleanup and error states | Simulated MediaRecorder and denial pass | Physical microphone not verified | BLOCKED BY USER PERMISSION |
| Gemini STT | SDK structured transcription and text responses | Success/empty/structured-response tests pass | Spoken WAV accurately transcribed | COMPLETE |
| Editable Transcript | Append existing draft, editable before submission | Chrome pass | Physical voice not verified | BLOCKED BY USER PERMISSION |
| Gemini Evaluation | Semantic structured metrics, no remote fallback score | Schema, invalid scores, injection isolation and outage tests pass | Live evaluation passed; intermittent provider 503 observed | COMPLETE |
| Gemini TTS | SDK audio response converted from PCM to WAV | Provider conversion and browser controls pass | Live audio generation and WAV validation passed | COMPLETE |
| Browser TTS Fallback | English voice selection and text remains available | Chrome simulated speech API pass | Audible output not verified | BLOCKED BY USER PERMISSION |
| Interview Timer | Server start/duration, current answer preserved at expiry | Backend expiry and frontend timing tests pass | Local browser timer/refresh verified | COMPLETE |
| Session Restore | Authenticated GET plus local draft | Real isolated API and Chrome refresh pass | Local API persistence verified | COMPLETE |
| Duplicate Prevention | Immediate frontend guard, lock, version check at persistence | Concurrent/stale/retry backend and Chrome 409 tests pass | Local API concurrency verified | COMPLETE |
| Final Report | Full factual history, retained omitted turns, summary and samples | Backend and Chrome pass | Live report passed with factual answer preserved | COMPLETE |
| Weak Topics | Validated/deduplicated labels and existing Learning Hub | Backend and browser navigation pass | Gemini evidence not verified | FAILED |
| Interview History | Existing repository and ownership | Real isolated API/Chrome report reload and history pass | Local storage verified | COMPLETE |
| Practice Interview | Per-answer feedback, typed and voice choices | Backend and Chrome pass | Full live flow blocked by Gemini HTTP 503 | FAILED |
| Placement Interview | Existing gating, private evaluations while active | Backend and Chrome pass | Full live flow blocked by Gemini HTTP 503 | FAILED |
| Placement Pass Security | Gemini provenance for every turn and report; 80% threshold | Outage leaves progress available, no report/pass; genuine mocked Gemini success passes | Automated outage security passes; full live Placement pending | FAILED |

## Checks performed

- `npm.cmd --prefix backend test`: 76 passes (includes two helper-module discovery entries); no failures. Normal tests mock Gemini and consume no quota.
- `npm.cmd --prefix frontend test`: 73 passes; no failures.
- `npm.cmd --prefix backend run check`: pass.
- `npm.cmd --prefix frontend run lint`: pass.
- `npm.cmd --prefix frontend run build`: pass.
- `npx.cmd playwright test e2e/workflows.spec.js e2e/liveApi.spec.js` from frontend: 16 Chrome acceptance tests passed, including audio overlap prevention and browser TTS fallback.
- Initial no-key smoke was blocked before a request. After configuration, live question/TTS passed; recovery checks verified semantic evaluation, final report and corrected STT. Provider 503 failures remained fail-closed.
- `git diff --check`: pass.
- `npx.cmd playwright test --config playwright.live.config.js`: real Gemini browser run failed at answer submission with provider HTTP 503 high demand. Login, setup, first question and draft refresh passed; draft preservation on failure was observed. The opt-in test now reports provider failures promptly instead of waiting for absent feedback.
- After the structured STT fix and overload-message update: backend 76/76, frontend lint and backend syntax checks pass again. Existing frontend 73/73, mocked-browser 16/16 and build results above remain the last completed full checks.
- `.env` ignore verified with `git check-ignore backend/.env`; no environment secrets printed or committed.
- Browser tests assert no page errors for the dynamic interview and audio paths. Backend suites completed without uncaught exceptions or unhandled rejections.

## Implementation and files

The repository already contained uncommitted fixes across several modules. Those changes were preserved. This work adds/changes only Interview behavior, related tests, dependencies and documentation:

- `backend/src/ai/interviewProvider.js`: official @google/genai integration, centralized config, abortable deadlines, bounded retries, sanitized error codes, JSON validation, STT, PCM-to-WAV TTS.
- `backend/src/ai/interviewSchemas.js`: question, answer and report schemas plus server validation.
- `backend/src/interviewAnswer.js`, `interviewEvaluator.js`, `interviewSessions.js`: semantic-only remote assessments, adaptive questions, Gemini provenance, factual report history, atomic version checks, timer and Placement safety.
- `backend/src/speechTranscription.js`, `server.js`: speech routing, MIME/container/size checks, safe health capabilities and errors.
- `backend/package.json`, `package-lock.json`, `.env.example`: SDK, opt-in smoke command, environment placeholders.
- `backend/scripts/interviewSmoke.js`: at most five ordinary live calls with retries disabled; no user storage writes. Uses TTS-produced WAV as a valid STT fixture.
- `backend/test/geminiProvider.test.js`, `geminiSessions.test.js`, `helpers/*`, and updated existing interview/API/workflow/speech tests: deterministic coverage, no deleted tests.
- `frontend/src/pages/Interview.jsx`, `InterviewSetupWorkspace.jsx`, `InterviewResult.jsx`: recording phases and provenance, capability diagnostics, safe errors, summary and next steps.
- `frontend/src/services/speechService.js`, `interviewService.js`: interview-specific capabilities and no remote evaluation fallback. Offline practice remains explicitly completion-only with no fabricated technical metrics.
- `frontend/e2e/workflows.spec.js`, `liveApi.spec.js`: browser integration, real isolated local API/storage with mocked Gemini, speech fallbacks.
- This report, `docs/GEMINI_INTERVIEW.md`, README interview configuration, and a supersession notice in the earlier voice report.

Existing routes, localStorage account scoping, whiteboard and sequential Placement unlock rules remain in use. Session version, timestamps and answerSource are persisted in the existing user repository. No separate storage layer was added. Optional OpenAI/OpenRouter integrations remain for other modules and practice; Placement requires Gemini.

## Remaining acceptance

1. Gemini key configuration and individual live LLM/STT/TTS checks are done. The key remains private.
2. Complete real-browser acceptance; no configured model was substituted. FAILED matrix rows denote checks not yet completed, not a missing key.
3. Retry the opt-in live Software Engineer / Mixed / Medium / 10-minute browser flow after provider capacity recovers. Adaptive turns, final browser report and history still need a successful live journey. Do not substitute a model without explicit configuration.
4. Allow physical microphone access and verify intelligible speech/transcript and audible TTS. Simulated browser tests do not certify either.
5. Verify live Placement with existing gating and repeat AI outage protection without awarding a pass.

AI Interview is not yet declared complete and verified.

## Follow-up implementation

- Gemini STT now reads documented SDK `audioTranscription.text` parts as well as plain-text responses. A regression test covers structured parts without invoking the text-only getter. The live spoken fixture was transcribed exactly: "A database index improves selective reads but adds storage and write overhead."
- HTTP 503 produces a clear high-demand message and preserves the answer. Bounded retries and fail-closed Placement rules remain in force.
- Added `frontend/playwright.live.config.js` and `frontend/live-tests/interview.live.spec.js` as an explicit quota-consuming acceptance suite, excluded from normal tests. It uses a disposable account/store and never changes real user progress. TTS autoplay is disabled only inside this test because live TTS/STT have separate checks.
- Models actually used: Gemini `gemini-3.8-flash`, `gemini-3.5-transcribe`, `gemini-3.1-flash-tts-preview`. No model was replaced.

## Interview setup loading fix

- Setup now displays progress and errors beside Start, preserves selections and always releases its request lock after success/failure.
- First question generation has a 15-second hard backend deadline with no automatic retry; browser request has a 25-second network deadline. The provider deadline also settles when an SDK request fails to honor abort.
- Three focused Chrome tests pass: normal start, overload followed by successful retry, and a stalled request returning to an enabled Start button. Backend 76/76 and frontend 73/73 tests, lint and production build pass.
- Local API restarted with the fix. A live first-question request using Frontend Developer / Mixed / Medium / 20 minutes returned AI_RATE_LIMITED after 1 second. Current start is blocked by Gemini rate/quota limits, not an endless preparing state. No model was changed or fallback interview fabricated.

## User-approved model switch

The user explicitly approved switching the local interview text model to gemini-2.5-flash after the Gemini 3.8 Flash daily quota was exhausted. Updated backend/.env and restarted the API; the local health endpoint responds successfully. STT and TTS models and the API key are unchanged. No live generation calls were made for this switch to preserve quota. Previous live text verification applies to Gemini 3.8 Flash; Gemini 2.5 Flash is configured but not yet live-verified.

## Current model: user-approved Gemini 3.6 Flash

Gemini 2.5 Flash generation returned HTTP 404: unavailable to new users. Following explicit user approval, changed only GEMINI_INTERVIEW_MODEL in backend/.env to gemini-3.6-flash. One real first-question request passed schema validation in 6.7 seconds, using the actual interview prompt and no retries. The API was restarted with this configuration. The key and speech models are unchanged. This verifies first-question generation on 3.6; it does not certify the entire interview flow on that model. No additional generation requests were made during this switch.

## Spoken practice feedback

- Ava automatically reads the answer score, feedback and up to two improvements, with an animated speaking state and Replay/Stop controls. Written evaluation remains visible.
- Continuing stops feedback before the next question. Feedback audio is reused for replay, and the existing browser speech fallback handles unavailable server speech.
- Placement evaluations remain hidden during the assessment.
- Verification: 73 frontend unit tests, lint, production build and three targeted mocked browser tests passed (feedback narration/controls, Placement privacy, and speech overlap/fallback). No live Gemini requests were made for this change; physical audio output was not verified.

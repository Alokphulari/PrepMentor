# Gemini Interview configuration and verification

The Interview module uses the official backend `@google/genai` SDK. React never receives the key. Add these settings privately to `backend/.env` (the example file contains placeholders only):

```dotenv
INTERVIEW_AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_INTERVIEW_MODEL=gemini-3.8-flash
GEMINI_TRANSCRIBE_MODEL=gemini-3.5-transcribe
GEMINI_TTS_MODEL=gemini-3.1-flash-tts-preview
```

Models are centralized and environment-driven. The server uses exactly the configured model. Model access, billing and regional availability are checked only by actual provider requests, never inferred from a nonempty key. Unavailable models return AI_CONFIGURATION_ERROR; there is no silent substitute. Other modules retain their OpenAI/OpenRouter configuration. Optional legacy practice providers use their existing AI_PROVIDER/model variables; Placement Interview requires Gemini.

Start with `npm.cmd run dev`. `Invoke-RestMethod http://localhost:4000/api/health` exposes `interview.provider`, `interview.llm`, `interview.stt`, `interview.tts`. Booleans mean configured, not live verified. The generic top-level llm field continues to describe the existing provider used by other modules. Interview setup shows configuration diagnostics without secrets.

Authenticated sessions own configuration, start/expiry, currentQuestion, turns, version and report. Submit uses turnIndex and version; stale/concurrent updates return 409. AI failures leave the question and client draft retryable and do not record a substitute grade or Placement outcome. Final report generation and history/progression updates commit together. Per-turn and final Gemini provenance plus the existing 80% threshold are required to pass Placement. Active Placement responses never contain answer evaluations or ideal answers.

Use localhost or HTTPS for voice. Click Answer with voice, permit the microphone, speak, then Stop listening. Recording uploads to the backend; Gemini produces an editable transcript appended to existing text. Typed answers work independently. Stop/Replay controls prevent overlapping question audio. Failed Gemini TTS uses browser speechSynthesis when available, and textual questions always remain usable.

| Error | Meaning / recovery |
|---|---|
| AI_NOT_CONFIGURED | Set the private backend Gemini key, restart the backend. |
| AI_AUTH_ERROR | Invalid key or access denied; rotate/check in Google AI Studio. Never paste it in chat. |
| AI_CONFIGURATION_ERROR | Configured provider/model/request is unavailable; inspect configuration against official model access. No model is substituted. |
| AI_RATE_LIMITED | Quota or rate limit; wait/check account quota, then retry. |
| AI_TIMEOUT / AI_PROVIDER_ERROR | Provider timeout/network/service failure; answer remains available for retry. |
| AI_INVALID_RESPONSE | Empty, blocked, duplicated question or malformed/invalid structured response; retry safely. |
| Microphone unavailable | Check site permission and Windows microphone privacy settings/device. Use text while resolving. |
| No intelligible speech | Record again or type; the server will not substitute a transcript. |

Normal automated tests never consume API quota. Once a key is configured, `npm.cmd --prefix backend run interview:smoke` is an explicit opt-in live check. It disables retries, does not mutate user storage, and normally uses five calls: question, evaluation, final report, TTS and STT. Its valid STT fixture is the returned WAV from TTS. A missing key exits before any network request. This verifies provider plumbing, not physical microphone quality or the entire live browser journey.

Official references checked during implementation:

- [JavaScript SDK](https://googleapis.github.io/js-genai/release_docs/)
- [GenerateContent configuration and abort signal](https://googleapis.github.io/js-genai/release_docs/interfaces/types.GenerateContentConfig.html)
- [Audio transcription](https://ai.google.dev/gemini-api/docs/generate-content/transcribe)
- [Speech generation](https://ai.google.dev/gemini-api/docs/generate-content/speech-generation)

See [completion report](INTERVIEW_COMPLETION_REPORT.md) for exact results and remaining live checks.

Explicit live browser acceptance: from `frontend/`, run `npx.cmd playwright test --config playwright.live.config.js`. This uses real Gemini and isolated test user storage; it is excluded from normal automated suites. A provider 503 leaves the candidate draft intact and is reported as a failed live acceptance check, never a successful interview. The agent performs this check after private key configuration. Physical microphone permission and audible playback still require the user's browser.

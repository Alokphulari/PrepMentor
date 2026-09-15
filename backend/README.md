# PrepMentor Backend

Minimal dependency-free Node API used as the first server boundary for PrepMentor.

```bash
npm run dev
```

Available endpoints:

- `GET /` redirects browser traffic to the frontend URL
- `GET /api` shows basic API information
- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (Bearer token required)
- `POST /api/auth/logout` (revokes the current Bearer token)
- `PATCH /api/profile` (Bearer token required)
- `GET /api/history` (Bearer token required)
- `POST /api/history` (Bearer token required)
- `GET /api/placement` (Bearer token required)
- `PUT /api/placement` (Bearer token required)
- `GET /api/resume` (Bearer token required)
- `PUT /api/resume` (Bearer token required)
- `POST /api/interviews/evaluate` (Bearer token required)
- `POST /api/code/review` (Bearer token and configured LLM required)
- `POST /api/speech/transcribe` (Bearer token and configured LLM required)
- `POST /api/speech/synthesize` (Bearer token and configured LLM required)
- `GET /api/interviews/:resultId` (Bearer token required)

The evaluation endpoint uses a disclosed response-completeness rubric and stores the result on the authenticated account. It is not an AI model. Replace this implementation behind the same response contract when a real evaluation service is available.

Voice transcription accepts JSON containing base64 audio and its MIME type,
validates a 6 MB limit, and forwards it to the configured OpenAI-compatible
transcription endpoint. Set `LLM_TRANSCRIPTION_MODEL` in `.env`; it defaults to
`whisper-1`. Audio is processed in memory and is not written to disk.

Question audio is synthesized in memory and returned as base64 MP3. Configure
`LLM_TTS_MODEL` and `LLM_TTS_VOICE` in `.env`; browser speech remains the
frontend fallback when AI audio is unavailable.

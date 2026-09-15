# PrepMentor

PrepMentor is a React/Vite interview and placement-preparation workspace backed by a dependency-free Node API. It includes aptitude practice, sequential Placement assessments, coding exercises, mock interviews with optional voice input, performance history, profile management, and a resume builder.

The Coding Lab supports authenticated LLM semantic review with rate limits and
an offline structural-check fallback. Semantic review analyzes submitted source
but does not execute untrusted code.

## Requirements

- Node.js 20 or newer
- npm

## Install

Install each workspace once:

```bash
npm install --prefix frontend
npm install --prefix backend
```

Copy `frontend/.env.example` to `frontend/.env`. For the included API, keep:

```env
VITE_API_BASE_URL=http://localhost:4000
```

For fresh LLM-generated aptitude, coding, and interview questions, copy
`backend/.env.example` to `backend/.env` and set the server-only values:

```env
LLM_API_KEY=your-provider-key
LLM_MODEL=gpt-4.1-mini
LLM_TRANSCRIPTION_MODEL=whisper-1
LLM_TTS_MODEL=gpt-4o-mini-tts
LLM_TTS_VOICE=alloy
LLM_BASE_URL=https://api.openai.com/v1
```

Never use `VITE_` for the LLM key; Vite variables are exposed to the browser.
The backend accepts an OpenAI-compatible chat-completions endpoint. Aptitude
practice has a curated fallback when the model is unavailable.

Interview questions use server-side AI speech with browser text-to-speech as a
fallback. Voice answers first use the browser speech API; when that service is
blocked (commonly in embedded IDE previews), PrepMentor automatically switches
to recorded-audio transcription through the authenticated backend. AI speech
requires `LLM_API_KEY`. Keep recordings below the 6 MB request limit.

## Run locally

From the repository root, start both the API and frontend:

```bash
npm run dev
```

Open `http://localhost:5173`. The API health endpoint is `http://localhost:4000/api/health`. Stop both services with `Ctrl+C`.

Running `npm run dev` inside `frontend/` also starts both services, preventing authentication failures caused by an offline API. To run services separately, use `npm run dev` inside `backend/` and `npm run dev:client` inside `frontend/` in two terminals.

## Verification

Root commands coordinate the workspace checks:

```bash
npm test
npm run lint
npm run build
npm run check
```

Pull requests and pushes to `main`, `develop`, and feature branches run this
same quality gate through `.github/workflows/ci.yml` using Node.js 20.

Backend development data is stored under `backend/data/` and is not committed. Do not place secrets in frontend environment variables or source files.

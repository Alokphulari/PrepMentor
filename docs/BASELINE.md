# Baseline audit

Before implementation: `npm.cmd test` passed 68 frontend and 31 backend tests (99 total). The first sandboxed attempt could not spawn Node test workers; rerunning with process permissions passed without code changes.

Existing architecture: React 19/Vite/Tailwind, account-scoped local caches, authenticated Node HTTP API, scrypt passwords, JSON persistence, sequential Placement state, offline questions, semantic code review, STT/TTS requests, resume builder, history, daily engagement and deterministic learning/roadmaps.

Confirmed gaps: Placement coding uses MCQs; no sandbox runner, MongoDB or Google sign-in; resume upload is a placeholder and not routed; interview sessions are browser-owned; evaluator considers at most eight questions; results hide semantic feedback; AI requests duplicate configuration and lack retries; speech/evaluation lack rate limits.

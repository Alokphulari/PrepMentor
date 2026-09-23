# Verification record

Verified locally on Windows with Node.js 24.19.0.

| Check | Result |
|---|---|
| Original baseline | 68 frontend + 31 backend tests passed |
| Final frontend unit tests | 68 passed |
| Final backend unit/integration tests | 55 passed |
| Original tests preserved | Yes; none deleted or disabled |
| ESLint | Passed |
| Vite production build | Passed; 2,467 modules transformed |
| `npm.cmd run check` | Passed (lint, tests, build) |
| Headless Chrome workflow tests | 4 passed |
| Real PDF text extraction fixture | Passed |
| Real DOCX text extraction fixture | Passed |
| `git diff --check` | Passed; Windows line-ending notices only |

The authenticated API workflow test covers registration, profile, builder analysis, baseline, sequential unlocks, mocked Judge0 execution, adaptive turns, evaluation, ownership, roadmap, learning plan and persistence after login. Other tests cover invalid provider output, transient failures, timeout handling, STT/TTS, coding failures/remediation, hidden-test privacy, Mongo repository conflicts, and Google token rejection.

The browser tests cover dashboard baseline, resume upload controls alongside the existing builder, unavailable coding execution, typed adaptive interviews and semantic report rendering. They use API mocks, not paid services.

Document fixtures use the real installed parsers. Testing found that the PDF library could crash during Windows worker-thread teardown. Parsing now runs in a separate trusted Node process with a 15-second deadline, a 128 MB JavaScript heap limit, at most two concurrent parsers, and no inherited service credentials. This process executes only the application's document parser; candidate source code is sent exclusively to Judge0.

## External checks still required

- Live MongoDB Atlas connection and deployed networking.
- Live LLM, STT and TTS with the configured account/model permissions.
- Live Judge0 language IDs, credentials, quotas and execution behavior.
- Live Google consent/origin configuration and successful real sign-in.
- Microphone capture, voice playback and autoplay permissions on the demonstration machine.
- Vercel/Render deployment; configuration is prepared but not deployed.

No real credentials were added, no paid provider calls were made, and no commit or push was performed.

## Regression follow-up

See [REGRESSION_FIXES.md](REGRESSION_FIXES.md) for root causes, scoped file inventory and validation. Final checks: 68 frontend tests, 62 backend tests, 12 browser tests; lint, backend syntax and production build passed. Live external AI/audio remains unverified without credentials.

# Regression fixes and adaptive interview follow-up

Completed locally on feature/aadarsh. No commits or pushes. Existing user history, daily activity, resume, Placement state and interview reports were retained.

## Root causes and resulting behavior

| Area | Cause | Fix |
| --- | --- | --- |
| Dashboard visibility | Positional nth-child CSS hid different sections when Skill Baseline was inserted. | Removed those brittle selectors. Existing hero, metrics, Placement journey and Quick Practice remain visible. |
| Streak | The metric used history-only achievements while DailyChecks merged daily activity and history. | Both dashboard displays now use the merged local-day streak; existing local/server history merging remains intact. Page visits do not create activity. |
| Performance cards | The score occupied the action position without a navigation control. | Added labelled, keyboard-accessible ArrowRight buttons for Aptitude, Coding and Interview, preserving average scores. |
| Skill Baseline | Bare borders and repeated missing-data labels differed from the application styles. | Compact icon cards, subtle borders, violet accents, responsive layout and dark surfaces. Separate resume estimates and measured scores; one empty state per category. |
| Learning Hub | New plan cards used generic styles and incoming route state could overwrite saved completion state on reload. | Restored native styling, saved reference/reflection progress, priority and recommendation reason. Backend recommendations open their tasks in the existing lesson workspace. Retake remains gated by completion. |
| Performance | The page only aggregated attempts and chart points. | Added newest-first Recent Performance table with assessment, actual score, consistent performance band and stored createdAt date. Interviews include date/time. |
| Roadmap | Input/cache used the latest activity, including tiny daily/game activity. A global history listener opened a popup for any entry. | Gather stored profile/resume/baseline and assessment evidence; validate structured plans; coalesce concurrent generation and retain saved roadmaps until explicit regeneration. Exclude small activities. Keep labelled deterministic fallback. |
| QOTD and games | Both rendered CareerRoadmap directly. | Removed direct roadmaps. Global notice now requires an explicit opt-in assessment event. History offers roadmap review for assessments. |
| Interview | Next-question generation lacked per-answer semantic evaluation and the client advanced immediately. | Evaluate each answer, then generate one follow-up using evaluation, bounded conversation, role/focus and candidate context. Weak responses trigger clarification; strong responses prompt deeper application/tradeoffs. Reject exact/near lexical duplicates. |
| Practice feedback | No intermediate evaluation view existed. | Submit Answer shows metrics, strengths, improvements, feedback and Strong sample answer before Next Question. Reload restores pending feedback. |
| Placement feedback | New per-answer feedback must not leak assessment hints. | Store evaluations internally and redact them from active POST/GET session responses. Final report shows original questions/answers, scores, feedback and samples. |
| Request races | React state alone did not synchronously lock rapid submissions. | Ref locks protect start, answer and final submission; backend session locks and turn indexes reject duplicate turns. Failed remote requests do not silently advance. |

## Implementation details

Authenticated routes remain POST /api/interview-sessions and POST /api/interview-sessions/:id/answer, with GET /api/interview-sessions/:id for recovery. The server owns question/config/conversation state. Per-answer evaluations validate score, technicalAccuracy, relevance, communication, reasoning, strengths, improvements, feedback and idealAnswer. Behavioral samples request STAR structure; samples are examples, not uniquely perfect answers. Final evaluation uses the entire bounded conversation and binds feedback to the original stored answers.

POST /api/career-roadmap/generate explicitly regenerates the roadmap; GET /api/career-roadmap reuses a saved plan and creates the first plan only when needed. Input scores come from stored user data, not request-body scores. Strengths, gaps and actionable steps are displayed. Legacy currentStrengths and betterApproach fields remain readable.

Offline evaluations are explicitly labelled response-completeness rubrics. They do not claim semantic correctness or invent sample answers. Real AI-generated samples require a configured provider. Speech recording, transcription transport, browser fallback, transcript editing, question playback, replay and stop controls remain intact.

## Files changed in this follow-up

Frontend:
- src/index.css
- src/components/SkillBaseline.jsx
- src/components/AnswerFeedback.jsx (new)
- src/components/CareerRoadmap.jsx
- src/components/CareerRoadmapNotice.jsx
- src/components/PersonalizedLearningPlan.jsx
- src/pages/DashboardHome.jsx
- src/pages/LearningWorkspace.jsx
- src/pages/Performance.jsx
- src/pages/History.jsx
- src/pages/QuestionOfTheDay.jsx
- src/pages/Games.jsx
- src/pages/Interview.jsx
- src/pages/InterviewResult.jsx
- src/pages/InterviewSetupWorkspace.jsx
- e2e/workflows.spec.js

Backend:
- src/interviewAnswer.js (new)
- src/interviewSessions.js
- src/interviewEvaluator.js
- src/interviewResults.js
- src/personalization.js
- src/resumeAnalysis.js
- src/server.js
- test/interviewRegressions.test.js (new)
- test/productionFeatures.test.js
- test/workflow.test.js

Other working-tree changes predate this follow-up and were preserved.

## Verification

Before editing: 68 frontend + 55 backend = 123 passing tests.

After editing:
- npm run check: passed (lint, tests and production build).
- Frontend unit tests: 68 passed.
- Backend unit/integration tests: 62 passed.
- Chrome browser tests: 12 passed (11-test regression suite plus the added recommendation-to-lesson test).
- Backend syntax check: passed.
- Light/dark dashboard mobile and Learning Hub desktop screenshots reviewed. Mobile width overflow assertion passed.

New coverage includes answer schema validation, semantic context, adaptive instructions, duplicate detection, active Placement redaction, final samples, malformed roadmap fallback, authoritative evidence, cache behavior, streak persistence, navigation arrows, QOTD absence, actual dates and sorting, learning gates, saved progress, duplicate clicks, typed answers and mocked voice playback/transcription.

AI/provider calls and voice input were mocked in automated tests. Live LLM/STT/TTS quality and microphone permissions were not verified with external credentials.

## External configuration

For live semantic interviews, sample answers and personalized AI roadmaps, configure backend OPENAI_API_KEY and OPENAI_LLM_MODEL, or the supported OpenRouter text provider. For provider speech, configure OPENAI_STT_MODEL and OPENAI_TTS_MODEL with an OpenAI-compatible audio key/base URL. Browser speech fallback depends on browser support/permissions. Existing Judge0, Google login and Mongo configuration requirements are unchanged. Never put provider keys in the frontend.

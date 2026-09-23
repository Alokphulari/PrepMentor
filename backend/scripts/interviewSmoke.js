// Explicit opt-in live smoke: five provider calls, no user storage mutations.
import { interviewConfigured, interviewProviderConfig, interviewCompletion, synthesizeGeminiSpeech, transcribeGeminiAudio } from "../src/ai/interviewProvider.js";
import { nextInterviewQuestion } from "../src/interviewSessions.js";
import { evaluateAnswer } from "../src/interviewAnswer.js";
import { evaluateInterviewSemantically } from "../src/interviewEvaluator.js";

const config = { role: "Software Engineer", interviewType: "Mixed", difficulty: "medium", duration: 10, focusAreas: ["Databases"] };
const generate = (instruction, data, validate, options) => interviewCompletion(instruction, data, validate, { ...options, retries: 0 });
if (!interviewConfigured() || interviewProviderConfig().provider !== "gemini") {
  console.log("BLOCKED BY GEMINI KEY: configure GEMINI_API_KEY and INTERVIEW_AI_PROVIDER=gemini in backend/.env.");
  process.exitCode = 2;
} else {
  let question, turn;
  async function check(name, operation) {
    try { const result = await operation(); console.log(`${name}: PASS`); return result; }
    catch (error) { console.log(`${name}: FAILED (${error.code || "AI_INVALID_RESPONSE"})`); process.exitCode = 1; return null; }
  }
  question = await check("Question generation", () => nextInterviewQuestion(config, [], generate));
  if (question) {
    turn = { ...question, transcript: "I would measure representative read and write workloads before choosing an index. Indexes improve selective lookups but add storage and write overhead. I would inspect query plans and latency before and after the change." };
    turn.answerEvaluation = await check("Semantic answer evaluation", () => evaluateAnswer(config, [], turn, {}, generate));
    if (turn.answerEvaluation) await check("Final report", () => evaluateInterviewSemantically({ config, questions: [turn], answers: { 0: turn.transcript } }, { role: config.role, type: config.interviewType }, generate));
  }
  const speech = await check("TTS", () => synthesizeGeminiSpeech("Explain one benefit and one cost of a database index.", { retries: 0 }));
  if (speech) await check("STT (valid Gemini-generated WAV fixture)", () => transcribeGeminiAudio(Buffer.from(speech.audio, "base64"), speech.mimeType, { retries: 0 }));
  else console.log("STT: BLOCKED (TTS fixture unavailable)");
}

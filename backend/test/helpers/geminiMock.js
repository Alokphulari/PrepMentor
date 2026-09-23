export function geminiMock(context, { fail = () => false, transform = (value) => value } = {}) {
  process.env.INTERVIEW_AI_PROVIDER = "gemini";
  process.env.GEMINI_API_KEY = "test-only";
  let count = 0;
  return context.mock.method(globalThis, "fetch", async (_url, options) => {
    const body = JSON.parse(options.body);
    const instruction = body.systemInstruction?.parts?.[0]?.text || "";
    const data = JSON.parse(body.contents[0].parts[0].text);
    if (fail(instruction)) return new Response(JSON.stringify({ error: { code: 503, message: "Unavailable" } }), { status: 503 });
    let value;
    if (instruction.startsWith("Act as")) value = { question: `Explain topic${++count}`, focus: "Engineering", category: "Technical", topic: "Engineering", difficulty: "medium", isFollowUp: count > 1 };
    else if (instruction.startsWith("Evaluate the CURRENT")) value = { score: 82, technicalAccuracy: 80, relevance: 90, communication: 85, reasoning: 80, completeness: 80, clarity: 85, specificity: 80, problemSolving: 80, strengths: ["Relevant"], improvements: ["Explain costs"], weakTopics: ["Indexing"], feedback: "Relevant answer", idealAnswer: "Compare read and write costs." };
    else value = { score: 82, metrics: { communication: 80, technical: 85, problemSolving: 80, confidence: 80, answerRelevance: 90 }, strengths: ["Relevant"], weaknesses: ["Indexing"], recommendations: ["Practice tradeoffs"], summary: "Relevant evidence", nextSteps: ["Review indexing"], weakTopics: [{ topic: "Indexing", score: 60, reason: "Missing costs" }], questionFeedback: data.questions.map((_, index) => ({ turnNumber: index + 1, question: "Invented question must never survive", answer: "Invented answer", score: 82, feedback: "Relevant", idealAnswer: "Compare read and write costs", betterApproach: "Measure workloads" })) };
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(transform(value, instruction)) }] }, finishReason: "STOP" }] }), { headers: { "Content-Type": "application/json" } });
  });
}

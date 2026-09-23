const string = { type: "string" };
const score = { type: "number", minimum: 0, maximum: 100 };
const strings = { type: "array", items: string };
const object = (properties) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
export const questionSchema = object({ question: string, focus: string, category: string, topic: string, difficulty: { type: "string", enum: ["easy", "medium", "hard"] }, isFollowUp: { type: "boolean" } });
export const answerSchema = object({ score, technicalAccuracy: score, relevance: score, communication: score, reasoning: score, completeness: score, clarity: score, specificity: score, problemSolving: score, strengths: strings, improvements: strings, weakTopics: strings, feedback: string, idealAnswer: string });
export const reportSchema = object({ score, metrics: object({ communication: score, technical: score, problemSolving: score, confidence: score, answerRelevance: score }), strengths: strings, weaknesses: strings, recommendations: strings, summary: string, nextSteps: strings, weakTopics: { type: "array", items: object({ topic: string, score, reason: string }) }, questionFeedback: { type: "array", items: object({ turnNumber: { type: "integer", minimum: 1, maximum: 20 }, score, feedback: string, idealAnswer: string, betterApproach: string }) } });

export function validateSchema(value, schema) {
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected object");
    for (const key of schema.required || []) if (!Object.hasOwn(value, key)) throw new Error("Missing field");
    for (const [key, child] of Object.entries(schema.properties)) if (Object.hasOwn(value, key)) validateSchema(value[key], child);
  } else if (schema.type === "array") {
    if (!Array.isArray(value) || value.length > 20) throw new Error("Invalid array");
    value.forEach((item) => validateSchema(item, schema.items));
  } else if (schema.type === "number" || schema.type === "integer") {
    if (typeof value !== "number" || !Number.isFinite(value) || value < schema.minimum || value > schema.maximum || (schema.type === "integer" && !Number.isInteger(value))) throw new Error("Invalid number");
  } else if (typeof value !== schema.type || (schema.type === "string" && (!value.trim() || value.length > 10000))) throw new Error("Invalid value");
  if (schema.enum && !schema.enum.includes(value)) throw new Error("Invalid choice");
}

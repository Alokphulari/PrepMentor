import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { structuredCompletion } from "./ai/aiClient.js";
import { list, object, score, text } from "./ai/structuredOutput.js";
import { findUserById, mutateUser } from "./userStore.js";

const categories = ["programming", "webDevelopment", "coreCS", "problemSolving", "interviewReadiness"];
let activeParsers = 0;
export function validateResumeUpload(value) {
  if (!value || typeof value.fileName !== "string" || typeof value.data !== "string" || value.data.length > 7000000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value.data)) throw new Error("Provide a PDF or DOCX file of at most 5 MB.");
  const buffer = Buffer.from(value.data, "base64");
  if (!buffer.length || buffer.length > 5 * 1024 * 1024 || buffer.toString("base64") !== value.data) throw new Error("Invalid file encoding or size.");
  const fileName = value.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-160);
  const type = fileName.toLowerCase().endsWith(".pdf") && value.mimeType === "application/pdf" && buffer.subarray(0, 5).toString() === "%PDF-" ? "pdf" : fileName.toLowerCase().endsWith(".docx") && value.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && buffer[0] === 80 && buffer[1] === 75 ? "docx" : null;
  if (!type) throw new Error("File content, extension and MIME type must match PDF or DOCX.");
  return { buffer, fileName, type };
}
export function extractResumeText(file) {
  if (activeParsers >= 2) return Promise.reject(Object.assign(new Error("Document processing is busy. Please try again shortly."), { status: 429 }));
  return new Promise((resolve, reject) => {
    // Only this trusted parser module runs locally. Documents are data, and no
    // candidate code, document scripts, user paths or shell commands are executed.
    // A process isolates native PDF-library crashes seen in Windows worker threads.
    const worker = fork(new URL("./documentWorker.js", import.meta.url), [], {
      execArgv: ["--max-old-space-size=128"], windowsHide: true, serialization: "advanced",
      stdio: ["ignore", "ignore", "ignore", "ipc"],
      env: Object.fromEntries(["SystemRoot", "PATH", "TEMP", "TMP"].filter((key) => process.env[key]).map((key) => [key, process.env[key]])),
    });
    activeParsers += 1;
    let received = false;
    const timeout = setTimeout(() => { worker.kill(); reject(new Error("Document extraction timed out.")); }, 15000);
    worker.once("message", (result) => { received = true; result.error ? reject(new Error(result.error)) : resolve(result.text); });
    worker.once("error", () => { clearTimeout(timeout); reject(new Error("Unable to extract document text.")); });
    worker.once("close", (code) => { activeParsers -= 1; clearTimeout(timeout); if (code !== 0 || !received) reject(new Error("Document extraction could not finish.")); });
    worker.send(file);
  });
}
export function validateResumeAnalysis(value) {
  object(value);
  const personal = object(value.personalInfo);
  const personalInfo = Object.fromEntries(["name", "email", "phone", "location"].map((key) => [key, personal[key] === null || personal[key] === undefined ? null : text(personal[key], 200)]));
  const baseline = Object.fromEntries(categories.map((key) => [key, value.baseline?.[key] === null ? null : score(value.baseline?.[key])]));
  return { personalInfo, ...Object.fromEntries(["skills", "technologies", "education", "experience", "projects", "certifications", "strengths", "missingAreas", "targetRoles"].map((key) => [key, list(value[key], 40)])), baseline };
}
export async function analyzeResume(userId, value, extract = extractResumeText, generate = structuredCompletion) {
  const user = await findUserById(userId);
  let content, fileName;
  if (value.manual === true) {
    if (!user.resume) throw new Error("Save your resume draft before analyzing it.");
    content = JSON.stringify(user.resume).slice(0, 40000); fileName = "Manual resume";
  } else {
    const file = validateResumeUpload(value); fileName = file.fileName;
    content = await extract(file);
  }
  if (!content?.trim()) throw new Error("No text was found. Scanned resumes need OCR before upload.");
  let analysis;
  try {
    analysis = { ...await generate("Extract only facts supported by this resume. Never infer sensitive traits or invent experience. Missing personal info must be null, lists must be empty when absent. Return personalInfo {name,email,phone,location}, skills[],technologies[],education[],experience[],projects[],certifications[],strengths[],missingAreas[],targetRoles[] (all arrays contain strings), baseline {programming,webDevelopment,coreCS,problemSolving,interviewReadiness} with 0-100 estimates or null when there is no evidence. Baselines are resume estimates, not measured skill.", { resume: content, profile: { targetRole: user.targetRole, skills: user.skills }, assessments: (user.history || []).slice(0, 10) }, validateResumeAnalysis), source: "AI resume evidence estimate" };
  } catch {
    analysis = { personalInfo: { name: null, email: null, phone: null, location: null }, skills: [], technologies: [], education: [], experience: [], projects: [], certifications: [], strengths: [], missingAreas: [], targetRoles: [], baseline: Object.fromEntries(categories.map((key) => [key, null])), source: "Text extracted; AI analysis unavailable" };
  }
  const result = { ...analysis, id: randomUUID(), fileName, extractedCharacters: content.length, createdAt: new Date().toISOString() };
  await mutateUser(userId, () => ({ resumeAnalysis: result, resumeUploaded: true }));
  return result;
}
export async function getSkillBaseline(userId) {
  const user = await findUserById(userId);
  const types = { programming: "Coding", problemSolving: "Aptitude", interviewReadiness: "Interview" };
  return { analysis: user.resumeAnalysis || null, categories: categories.map((category) => {
    const measured = (user.history || []).find((entry) => (entry.type === types[category] || (types[category] === "Aptitude" && /aptitude/i.test(entry.type))) && !(entry.evaluationMode || "").includes("rubric") && !["self-reported", "semantic-or-static-review"].includes(entry.evidenceType));
    const estimate = user.resumeAnalysis?.baseline?.[category] ?? null;
    return { category, estimate, latestScore: measured?.score ?? null, source: measured ? `${estimate !== null ? "Resume + " : ""}${measured.type} assessment` : estimate !== null ? "resume evidence estimate" : "not yet assessed" };
  }) };
}

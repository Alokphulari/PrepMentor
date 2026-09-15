import assert from "node:assert/strict";
import test from "node:test";
import { validateResume } from "../src/resume.js";

test("resume validation normalizes supported fields", () => {
  const resume = validateResume({
    name: "  Test Student  ",
    email: "student@example.test",
    graduationYear: "ignored",
    education: [{ title: "B.Tech", subtitle: "Example University", date: 2026, description: "Computer Science" }],
    experience: [],
    projects: [{ title: "PrepMentor", subtitle: "React", description: "Career preparation workspace" }],
    certifications: [{ title: "Cloud Fundamentals", subtitle: "Example Academy", date: 2025 }],
    achievements: [{ title: "Hackathon finalist", description: "Built an accessibility tool" }],
  });

  assert.equal(resume.name, "Test Student");
  assert.equal(resume.education[0].date, "2026");
  assert.equal(resume.projects[0].title, "PrepMentor");
  assert.equal(resume.certifications[0].date, "2025");
  assert.equal(resume.achievements[0].title, "Hackathon finalist");
  assert.equal("graduationYear" in resume, false);
  assert.equal(Number.isFinite(Date.parse(resume.updatedAt)), true);
});

test("resume validation enforces field and collection limits", () => {
  const resume = validateResume({
    name: "x".repeat(200),
    summary: "s".repeat(4000),
    projects: Array.from({ length: 25 }, (_, index) => ({ title: `Project ${index}` })),
  });

  assert.equal(resume.name.length, 120);
  assert.equal(resume.summary.length, 3000);
  assert.equal(resume.projects.length, 20);
});

test("resume validation rejects malformed nested values", () => {
  assert.throws(() => validateResume([]), /must be an object/i);
  assert.throws(() => validateResume({ name: { unsafe: true } }), /name must be text/i);
  assert.throws(() => validateResume({ education: {} }), /education must be a list/i);
  assert.throws(() => validateResume({ projects: ["not-an-object"] }), /item 1 must be an object/i);
  assert.throws(() => validateResume({ experience: [{ title: ["invalid"] }] }), /title must be text/i);
});

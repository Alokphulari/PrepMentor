import { findUserById, updateUser } from "./userStore.js";

function text(value, limit = 2000, label = "Resume field") {
  if (value === undefined || value === null || value === "") return "";
  if (!["string", "number"].includes(typeof value)) {
    throw new Error(`${label} must be text.`);
  }
  return String(value).trim().slice(0, limit);
}

function resumeItems(value, section) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error(`${section} must be a list.`);
  return value.slice(0, 20).map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`${section} item ${index + 1} must be an object.`);
    }
    return {
      title: text(item.title, 160, `${section} title`),
      subtitle: text(item.subtitle, 160, `${section} subtitle`),
      date: text(item.date, 80, `${section} date`),
      description: text(item.description, 2000, `${section} description`),
    };
  });
}

export function validateResume(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Resume payload must be an object.");
  }
  return {
    name: text(value.name, 120, "Name"),
    email: text(value.email, 180, "Email"),
    phone: text(value.phone, 40, "Phone"),
    location: text(value.location, 160, "Location"),
    summary: text(value.summary, 3000, "Summary"),
    skills: text(value.skills, 2000, "Skills"),
    education: resumeItems(value.education, "Education"),
    experience: resumeItems(value.experience, "Experience"),
    projects: resumeItems(value.projects, "Projects"),
    certifications: resumeItems(value.certifications, "Certifications"),
    achievements: resumeItems(value.achievements, "Achievements"),
    updatedAt: new Date().toISOString(),
  };
}

export async function getResume(userId) {
  const user = await findUserById(userId);
  return user?.resume || null;
}

export async function saveResume(userId, value) {
  const resume = validateResume(value);
  await updateUser(userId, { resume, resumeUploaded: true });
  return resume;
}

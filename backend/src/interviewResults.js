import { randomUUID } from "node:crypto";
import { findUserById, mutateUser } from "./userStore.js";

function metricLabel(value) {
  return String(value).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (letter) => letter.toUpperCase()).slice(0, 160);
}

function resultTopicPerformance(metrics) {
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) return [];
  return Object.entries(metrics).flatMap(([key, value]) => {
    const percentage = Number(value);
    if (!Number.isFinite(percentage)) return [];
    return [{ topic: metricLabel(key), percentage: Math.max(0, Math.min(100, Math.round(percentage))) }];
  }).slice(0, 20);
}

export async function saveInterviewResult(userId, evaluation, duration = "30 min") {
  const result = {
    id: randomUUID(),
    ...evaluation,
    createdAt: new Date().toISOString(),
  };
  const historyEntry = {
    id: result.id,
    title: `${result.role} Interview`.slice(0, 160),
    type: "Interview",
    score: result.score,
    duration: String(duration).slice(0, 40),
    createdAt: result.createdAt,
    topicPerformance: resultTopicPerformance(result.metrics),
  };
  const user = await mutateUser(userId, (current) => ({
    interviewResults: [result, ...(Array.isArray(current.interviewResults) ? current.interviewResults : [])]
      .slice(0, 50),
    history: [historyEntry, ...(Array.isArray(current.history) ? current.history : [])]
      .filter((item, index, entries) => entries.findIndex((candidate) => candidate.id === item.id) === index)
      .slice(0, 100),
  }));
  return user ? result : null;
}

export async function getInterviewResult(userId, resultId) {
  const user = await findUserById(userId);
  return (Array.isArray(user?.interviewResults) ? user.interviewResults : [])
    .find((result) => result.id === resultId) || null;
}

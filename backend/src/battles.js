import { randomBytes } from "node:crypto";

const rooms = new Map();
const modes = new Set(["aptitude", "coding", "interview", "typing", "speaking"]);
const questionBank = [
  { question: "What is 15% of 200?", options: ["20", "25", "30", "35"], answer: "30" },
  { question: "What comes next: 2, 4, 6, 8, ?", options: ["9", "10", "11", "12"], answer: "10" },
  { question: "Choose the synonym of ‘rapid’.", options: ["Slow", "Quick", "Quiet", "Weak"], answer: "Quick" },
  { question: "If 6 workers finish a task in 10 days, how many days will 12 workers take?", options: ["4", "5", "6", "8"], answer: "5" },
  { question: "Book is to Reading as Fork is to…", options: ["Drawing", "Writing", "Eating", "Running"], answer: "Eating" },
];

function getRoom(code) {
  const room = rooms.get(String(code || "").toUpperCase());
  if (!room) throw Object.assign(new Error("Battle room not found."), { status: 404 });
  return room;
}

function publicRoom(room, userId) {
  return {
    code: room.code, mode: room.mode, status: room.status,
    questions: room.questions.map(({ answer, ...question }) => question),
    players: room.players.map((player) => ({ name: player.name, you: player.userId === userId, submitted: player.submitted, score: room.status === "complete" ? player.score : null })),
  };
}

function playerIn(room, userId) {
  const player = room.players.find((item) => item.userId === userId);
  if (!player) throw Object.assign(new Error("You are not a player in this battle."), { status: 403 });
  return player;
}

export function createBattle(user, requestedMode) {
  const mode = modes.has(requestedMode) ? requestedMode : "aptitude";
  let code;
  do code = randomBytes(3).toString("hex").toUpperCase(); while (rooms.has(code));
  const room = { code, mode, status: "waiting", questions: questionBank.map((question, index) => ({ ...question, id: `${code}-${index + 1}` })), players: [{ userId: user.id, name: user.name || user.email || "Player 1", submitted: false, score: null, answers: null }], createdAt: Date.now() };
  rooms.set(code, room);
  return publicRoom(room, user.id);
}

export function joinBattle(user, code) {
  const room = getRoom(code);
  if (room.players.some((player) => player.userId === user.id)) return publicRoom(room, user.id);
  if (room.status !== "waiting" || room.players.length >= 2) throw Object.assign(new Error("This battle room is full."), { status: 409 });
  room.players.push({ userId: user.id, name: user.name || user.email || "Player 2", submitted: false, score: null, answers: null });
  room.status = "active";
  return publicRoom(room, user.id);
}

export function getBattle(user, code) {
  const room = getRoom(code);
  playerIn(room, user.id);
  return publicRoom(room, user.id);
}

export function submitBattle(user, code, answers) {
  const room = getRoom(code);
  const player = playerIn(room, user.id);
  if (room.status !== "active") throw Object.assign(new Error("The battle is not ready yet."), { status: 409 });
  if (player.submitted) return publicRoom(room, user.id);
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) throw new Error("Answers must be an object.");
  player.answers = Object.fromEntries(Object.entries(answers).filter(([id, answer]) => room.questions.some((question) => question.id === id && question.options.includes(answer))));
  player.score = Math.round((room.questions.reduce((score, question) => score + (player.answers[question.id] === question.answer ? 1 : 0), 0) / room.questions.length) * 100);
  player.submitted = true;
  if (room.players.every((item) => item.submitted)) room.status = "complete";
  return publicRoom(room, user.id);
}

setInterval(() => { const expiry = Date.now() - 24 * 60 * 60 * 1000; for (const [code, room] of rooms) if (room.createdAt < expiry) rooms.delete(code); }, 60 * 60 * 1000).unref();

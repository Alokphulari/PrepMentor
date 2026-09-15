import { findUserById, mutateUser } from "./userStore.js";

export const DEFAULT_PLACEMENT_STATE = {
  aptitude: { easy: "available", medium: "locked", hard: "locked" },
  coding: { easy: "locked", medium: "locked", hard: "locked" },
  interview: { status: "locked", whiteboard: "locked" },
};

const allowedStatuses = new Set(["locked", "available", "passed", "failed"]);
const statePaths = [
  ["aptitude", "easy"],
  ["aptitude", "medium"],
  ["aptitude", "hard"],
  ["coding", "easy"],
  ["coding", "medium"],
  ["coding", "hard"],
  ["interview", "status"],
  ["interview", "whiteboard"],
];

function requires(previousStatus, nextStatus, label) {
  if (nextStatus !== "locked" && previousStatus !== "passed") {
    throw new Error(`${label} cannot unlock before the previous level is passed.`);
  }
}

export function validatePlacementState(value) {
  const state = {
    aptitude: { ...DEFAULT_PLACEMENT_STATE.aptitude, ...value?.aptitude },
    coding: { ...DEFAULT_PLACEMENT_STATE.coding, ...value?.coding },
    interview: { ...DEFAULT_PLACEMENT_STATE.interview, ...value?.interview },
  };
  const statuses = [
    ...Object.values(state.aptitude),
    ...Object.values(state.coding),
    ...Object.values(state.interview),
  ];
  if (statuses.some((status) => !allowedStatuses.has(status))) {
    throw new Error("Placement state contains an unsupported status.");
  }
  if (state.aptitude.easy === "locked") {
    throw new Error("Aptitude Easy must remain available, failed, or passed.");
  }
  requires(state.aptitude.easy, state.aptitude.medium, "Aptitude Medium");
  requires(state.aptitude.medium, state.aptitude.hard, "Aptitude Hard");
  requires(state.aptitude.hard, state.coding.easy, "Coding Easy");
  requires(state.coding.easy, state.coding.medium, "Coding Medium");
  requires(state.coding.medium, state.coding.hard, "Coding Hard");
  requires(state.coding.hard, state.interview.status, "Interview");
  return state;
}

export function validatePlacementTransition(previousValue, nextValue) {
  const previous = validatePlacementState(previousValue);
  const next = validatePlacementState(nextValue);

  for (const [section, level] of statePaths) {
    const from = previous[section][level];
    const to = next[section][level];
    const label = `${section} ${level}`;

    if (from === "passed" && to !== "passed") {
      throw new Error(`${label} cannot regress after it is passed.`);
    }
    if (from === "locked" && !["locked", "available"].includes(to)) {
      throw new Error(`${label} must be unlocked before it can be attempted.`);
    }
    if (["available", "failed"].includes(from) && to === "locked") {
      throw new Error(`${label} cannot be locked again after it is unlocked.`);
    }
  }

  return next;
}

export async function getPlacementState(userId) {
  const user = await findUserById(userId);
  return validatePlacementState(user?.placementState || DEFAULT_PLACEMENT_STATE);
}

export async function savePlacementState(userId, value) {
  const user = await mutateUser(userId, (current) => ({
    placementState: validatePlacementTransition(
      current.placementState || DEFAULT_PLACEMENT_STATE,
      value
    ),
  }));
  return user?.placementState || null;
}

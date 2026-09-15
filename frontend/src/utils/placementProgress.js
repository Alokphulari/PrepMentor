export const DEFAULT_PLACEMENT_STATE = {
  aptitude: { easy: "available", medium: "locked", hard: "locked" },
  coding: { easy: "locked", medium: "locked", hard: "locked" },
  interview: { status: "locked", whiteboard: "locked" },
};

export function normalizePlacementState(value) {
  const normalized = structuredClone(DEFAULT_PLACEMENT_STATE);
  if (!value || typeof value !== "object" || Array.isArray(value)) return normalized;

  const stages = [
    ["aptitude", "easy"],
    ["aptitude", "medium"],
    ["aptitude", "hard"],
    ["coding", "easy"],
    ["coding", "medium"],
    ["coding", "hard"],
    ["interview", "status"],
  ];
  let currentStageReached = false;

  stages.forEach(([module, level]) => {
    if (currentStageReached) return;
    const savedStatus = value[module]?.[level];
    if (savedStatus === "passed") {
      normalized[module][level] = "passed";
      return;
    }
    normalized[module][level] = savedStatus === "failed" ? "failed" : "available";
    currentStageReached = true;
  });

  const whiteboardStatus = value.interview?.whiteboard;
  if (["available", "failed", "passed"].includes(whiteboardStatus) && normalized.interview.status === "passed") {
    normalized.interview.whiteboard = whiteboardStatus;
  }
  return normalized;
}

const JOURNEY_STAGES = [
  ["aptitude", "easy"],
  ["aptitude", "medium"],
  ["aptitude", "hard"],
  ["coding", "easy"],
  ["coding", "medium"],
  ["coding", "hard"],
  ["interview", "status"],
];

function passedCount(state) {
  return JOURNEY_STAGES.findIndex(([module, level]) => state[module][level] !== "passed");
}

export function mergePlacementStates(localValue, remoteValue) {
  const local = normalizePlacementState(localValue);
  const remote = normalizePlacementState(remoteValue);
  const localPassed = passedCount(local);
  const remotePassed = passedCount(remote);
  const completed = Math.max(
    localPassed === -1 ? JOURNEY_STAGES.length : localPassed,
    remotePassed === -1 ? JOURNEY_STAGES.length : remotePassed,
  );
  const merged = structuredClone(DEFAULT_PLACEMENT_STATE);

  JOURNEY_STAGES.slice(0, completed).forEach(([module, level]) => {
    merged[module][level] = "passed";
  });
  if (completed < JOURNEY_STAGES.length) {
    const [module, level] = JOURNEY_STAGES[completed];
    merged[module][level] = local[module][level] === "failed" || remote[module][level] === "failed"
      ? "failed"
      : "available";
  }

  if (merged.interview.status === "passed") {
    const whiteboardStatuses = [local.interview.whiteboard, remote.interview.whiteboard];
    merged.interview.whiteboard = whiteboardStatuses.includes("passed")
      ? "passed"
      : whiteboardStatuses.includes("failed")
        ? "failed"
        : whiteboardStatuses.includes("available")
          ? "available"
          : "locked";
  }

  return normalizePlacementState(merged);
}

export function getPlacementCompletion(value) {
  const state = normalizePlacementState(value);
  const completed = JOURNEY_STAGES.filter(([module, level]) => state[module][level] === "passed").length;
  return {
    completed,
    total: JOURNEY_STAGES.length,
    percentage: Math.round((completed / JOURNEY_STAGES.length) * 100),
  };
}

export function retryFailedPlacementLevel(value, module, level) {
  const state = normalizePlacementState(value);
  if (!["aptitude", "coding"].includes(module) || !["easy", "medium", "hard"].includes(level)) {
    return state;
  }
  if (state[module][level] !== "failed") return state;
  return {
    ...state,
    [module]: {
      ...state[module],
      [level]: "available",
    },
  };
}

import { getHistory, getSyncedHistory } from "../services/history";
import { usePlacement } from "../context/PlacementContext";
import {
  Target,
  Code2,
  Mic,
  Lock,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getPlacementCompletion } from "../utils/placementProgress";

function Placement() {
  const { placementState } = usePlacement();
  const navigate = useNavigate();

  /*
   * ----------------------------------------
   * DETERMINE CURRENT APTITUDE LEVEL
   * ----------------------------------------
   */

  /*
   * ----------------------------------------
   * DETERMINE CURRENT CODING LEVEL
   * ----------------------------------------
   */

  /*
   * ----------------------------------------
   * DETERMINE STAGE STATUS
   * ----------------------------------------
   */

  const aptitudeCompleted =
    placementState.aptitude.hard === "passed";

  const codingUnlocked =
    placementState.coding.easy !== "locked";

  const codingCompleted =
    placementState.coding.hard === "passed";

  const interviewUnlocked =
    placementState.interview.status !== "locked";

  const currentAptitudeLevel = ["easy", "medium", "hard"].find(
    (level) => placementState.aptitude[level] !== "passed"
  );
  const aptitudeNeedsReview = currentAptitudeLevel
    ? placementState.aptitude[currentAptitudeLevel] === "failed"
    : false;
  const currentCodingLevel = ["easy", "medium", "hard"].find(
    (level) => placementState.coding[level] !== "passed" && placementState.coding[level] !== "locked"
  );
  const codingNeedsReview = currentCodingLevel
    ? placementState.coding[currentCodingLevel] === "failed"
    : false;

  /*
   * ----------------------------------------
   * PROGRESS
   * ----------------------------------------
   */

  const completion = getPlacementCompletion(placementState);

  /*
   * ----------------------------------------
   * STAGES
   * ----------------------------------------
   */

  const stages = [
    {
      number: 1,
      title: "Aptitude",
      description:
        "Test your quantitative, logical, and verbal reasoning skills.",
      icon: Target,
      locked: false,
      completed: aptitudeCompleted,
    },

    {
      number: 2,
      title: "Coding",
      description:
        "Solve coding problems across increasing difficulty levels.",
      icon: Code2,
      locked: !codingUnlocked,
      completed: codingCompleted,
    },

    {
      number: 3,
      title: "AI Voice Interview",
      description:
        "Complete an adaptive AI-powered interview.",
      icon: Mic,
      locked: !interviewUnlocked,
      completed:
        placementState.interview.status === "passed",
    },
  ];

  /*
   * ----------------------------------------
   * BUTTON ACTIONS
   * ----------------------------------------
   */

  const handleAptitude = async () => {
    await getSyncedHistory().catch(()=>{});
    const level = ["easy", "medium", "hard"].find(
      (item) => placementState.aptitude[item] !== "passed"
    ) || "hard";
    if (placementState.aptitude[level] === "failed") {
      navigate("/learning", {
        state: {
          topicPerformance: getHistory().find((entry)=>entry.type.includes("Aptitude")&&entry.title.toLowerCase().includes(level))?.topicPerformance || [],
          placementMode: true,
          placementLevel: level,
          module: "aptitude",
        },
      });
      return;
    }
    navigate("/placement/aptitude");
  };

  const handleCoding = async () => {
    await getSyncedHistory().catch(()=>{});
    const level = ["easy", "medium", "hard"].find(
      (item) => placementState.coding[item] !== "passed"
    ) || "hard";
    if (placementState.coding[level] === "failed") {
      navigate("/learning", {
        state: {
          topicPerformance: getHistory().find((entry)=>entry.type==="Coding"&&entry.difficulty===level)?.topicPerformance || [],
          placementMode: true,
          placementLevel: level,
          module: "coding",
        },
      });
      return;
    }
    navigate("/placement/coding");
  };

  const handleInterview = async () => {
    await getSyncedHistory().catch(()=>{});
    if(placementState.interview.status === "failed"){navigate("/learning",{state:{module:"interview",placementLevel:"status",placementMode:true,topicPerformance:getHistory().find((entry)=>entry.type==="Interview")?.topicPerformance||[]}});return;}
    navigate("/interview/setup", { state: { mode: "placement" } });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* HEADER */}
      <section>
        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
          Placement Module
        </p>

        <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
          Placement Preparation
        </h1>

        <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-2xl">
          Complete each assessment stage to progressively unlock
          the next stage. Your performance determines your
          placement readiness.
        </p>
      </section>

      {/* PROGRESS */}
      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">

        <div className="flex items-center justify-between mb-3">

          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Placement Progress
            </p>

            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {completion.completed} / {completion.total}
            </p>
          </div>

          <Target
            className="text-blue-600"
            size={28}
          />

        </div>

        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">

          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500"
            style={{
              width: `${completion.percentage}%`,
            }}
          />

        </div>

        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {completion.completed === completion.total
            ? "Placement assessment completed."
            : `${completion.completed} of ${completion.total} required milestones completed. Pass the current level to continue.`}
        </p>

      </section>

      {/* STAGES */}
      <section className="space-y-5">

        {stages.map((stage) => {
          const Icon = stage.icon;

          /*
           * ------------------------------
           * APTITUDE
           * ------------------------------
           */

          if (stage.number === 1) {
            return (
              <div
                key={stage.number}
                className={`bg-white dark:bg-gray-900 border rounded-2xl p-6 ${
                  stage.completed
                    ? "border-green-200 dark:border-green-900"
                    : "border-blue-200 dark:border-blue-900"
                }`}
              >

                <div className="flex flex-col lg:flex-row lg:items-center gap-6">

                  {/* ICON */}
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                      stage.completed
                        ? "bg-green-100 dark:bg-green-950/40 text-green-600"
                        : "bg-blue-100 dark:bg-blue-950/40 text-blue-600"
                    }`}
                  >
                    <Icon size={26} />
                  </div>

                  {/* INFORMATION */}
                  <div className="flex-1">

                    <div className="flex items-center gap-3">

                      <span className="text-xs font-bold text-gray-400">
                        STAGE 1
                      </span>

                      {stage.completed ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                          <CheckCircle2 size={13} />
                          Completed
                        </span>
                      ) : (
                        <span className={`flex items-center gap-1 text-xs font-semibold ${aptitudeNeedsReview ? "text-amber-600" : "text-blue-600"}`}>
                          <CheckCircle2 size={13} />
                          {aptitudeNeedsReview ? "Needs Review" : "Available"}
                        </span>
                      )}

                    </div>

                    <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                      Aptitude
                    </h2>

                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {stage.description}
                    </p>

                    {/* LEVELS */}
                    <div className="flex flex-wrap gap-2 mt-4">

                      <span
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                          placementState.aptitude.easy === "passed"
                            ? "bg-green-100 text-green-700"
                            : placementState.aptitude.easy === "failed"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        Easy
                        {placementState.aptitude.easy === "passed"
                          ? " ✓"
                          : ""}
                      </span>

                      <span
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                          placementState.aptitude.medium === "passed"
                            ? "bg-green-100 text-green-700"
                            : placementState.aptitude.medium === "failed"
                            ? "bg-amber-100 text-amber-700"
                            : placementState.aptitude.medium ===
                              "available"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        Medium
                        {placementState.aptitude.medium === "passed"
                          ? " ✓"
                          : ""}
                      </span>

                      <span
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                          placementState.aptitude.hard === "passed"
                            ? "bg-green-100 text-green-700"
                            : placementState.aptitude.hard === "failed"
                            ? "bg-amber-100 text-amber-700"
                            : placementState.aptitude.hard ===
                              "available"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        Hard
                        {placementState.aptitude.hard === "passed"
                          ? " ✓"
                          : ""}
                      </span>

                    </div>

                  </div>

                  {/* ACTION */}
                  <div>

                    {stage.completed ? (
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-100 text-green-700 text-sm font-semibold">
                        <CheckCircle2 size={16} />
                        Completed
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleAptitude}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
                      >
                        {aptitudeNeedsReview ? "Review Aptitude" : "Continue Aptitude"}
                        <ArrowRight size={17} />
                      </button>
                    )}

                  </div>

                </div>

              </div>
            );
          }

          /*
           * ------------------------------
           * CODING
           * ------------------------------
           */

          if (stage.number === 2) {
            return (
              <div
                key={stage.number}
                className={`bg-white dark:bg-gray-900 border rounded-2xl p-6 ${
                  stage.locked
                    ? "border-gray-200 dark:border-gray-800 opacity-75"
                    : stage.completed
                    ? "border-green-200 dark:border-green-900"
                    : "border-blue-200 dark:border-blue-900"
                }`}
              >

                <div className="flex flex-col lg:flex-row lg:items-center gap-6">

                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                      stage.locked
                        ? "bg-gray-100 dark:bg-gray-800 text-gray-400"
                        : stage.completed
                        ? "bg-green-100 dark:bg-green-950/40 text-green-600"
                        : "bg-blue-100 dark:bg-blue-950/40 text-blue-600"
                    }`}
                  >
                    <Icon size={26} />
                  </div>

                  <div className="flex-1">

                    <div className="flex items-center gap-3">

                      <span className="text-xs font-bold text-gray-400">
                        STAGE 2
                      </span>

                      {stage.locked ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-gray-400">
                          <Lock size={13} />
                          Locked
                        </span>
                      ) : stage.completed ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                          <CheckCircle2 size={13} />
                          Completed
                        </span>
                      ) : (
                        <span className={`flex items-center gap-1 text-xs font-semibold ${codingNeedsReview ? "text-amber-600" : "text-blue-600"}`}>
                          <CheckCircle2 size={13} />
                          {codingNeedsReview ? "Needs Review" : "Available"}
                        </span>
                      )}

                    </div>

                    <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                      Coding
                    </h2>

                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {stage.description}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-4">

                      {["easy", "medium", "hard"].map(
                        (level) => {
                          const status =
                            placementState.coding[level];

                          return (
                            <span
                              key={level}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                status === "passed"
                                  ? "bg-green-100 text-green-700"
                                  : status === "failed"
                                  ? "bg-amber-100 text-amber-700"
                                  : status === "available"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {level.charAt(0).toUpperCase() +
                                level.slice(1)}

                              {status === "passed"
                                ? " ✓"
                                : ""}
                            </span>
                          );
                        }
                      )}

                    </div>

                  </div>

                  <div>

                    {stage.locked ? (
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 text-sm font-semibold">
                        <Lock size={16} />
                        Locked
                      </div>
                    ) : stage.completed ? (
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-100 text-green-700 text-sm font-semibold">
                        <CheckCircle2 size={16} />
                        Completed
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCoding}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
                      >
                        {codingNeedsReview ? "Review Coding" : "Continue Coding"}
                        <ArrowRight size={17} />
                      </button>
                    )}

                  </div>

                </div>

              </div>
            );
          }

          /*
           * ------------------------------
           * INTERVIEW
           * ------------------------------
           */

          return (
            <div
              key={stage.number}
              className={`bg-white dark:bg-gray-900 border rounded-2xl p-6 ${
                stage.locked
                  ? "border-gray-200 dark:border-gray-800 opacity-75"
                  : stage.completed
                  ? "border-green-200 dark:border-green-900"
                  : "border-blue-200 dark:border-blue-900"
              }`}
            >

              <div className="flex flex-col lg:flex-row lg:items-center gap-6">

                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    stage.locked
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-400"
                      : "bg-blue-100 dark:bg-blue-950/40 text-blue-600"
                  }`}
                >
                  <Icon size={26} />
                </div>

                <div className="flex-1">

                  <div className="flex items-center gap-3">

                    <span className="text-xs font-bold text-gray-400">
                      STAGE 3
                    </span>

                    {stage.locked ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-gray-400">
                        <Lock size={13} />
                        Locked
                      </span>
                    ) : stage.completed ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                        <CheckCircle2 size={13} />
                        Completed
                      </span>
                    ) : (
                      <span className={`flex items-center gap-1 text-xs font-semibold ${placementState.interview.status === "failed" ? "text-amber-600" : "text-blue-600"}`}>
                        <CheckCircle2 size={13} />
                        {placementState.interview.status === "failed" ? "Needs Review" : "Available"}
                      </span>
                    )}

                  </div>

                  <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                    AI Voice Interview
                  </h2>

                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {stage.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mt-4">

                    <span className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-300">
                      Adaptive Q&A
                    </span>

                    <span className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-300">
                      Whiteboard
                    </span>

                  </div>

                </div>

                <div>

                  {stage.locked ? (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 text-sm font-semibold">
                      <Lock size={16} />
                      Locked
                    </div>
                  ) : stage.completed ? (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-100 text-green-700 text-sm font-semibold">
                      <CheckCircle2 size={16} />
                      Completed
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleInterview}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
                    >
                      {placementState.interview.status === "failed" ? "Retry Interview" : "Start Interview"}
                      <ArrowRight size={17} />
                    </button>
                  )}

                </div>

              </div>

            </div>
          );
        })}

      </section>

      <section className="surface-card rounded-2xl p-6"><h2 className="font-bold">Final Report</h2>{placementState.interview.status === "passed" ? <Link className="mt-3 inline-block font-bold text-indigo-600" to="/placement/report">View final Placement report</Link> : <p className="mt-2 text-sm text-gray-500">Pass Aptitude, Coding, and Interview to unlock your final report.</p>}</section>
      {/* IMPORTANT RULE */}
      <section className="bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900 rounded-2xl p-6">

        <h2 className="font-bold text-purple-900 dark:text-purple-200">
          How Placement Mode works
        </h2>

        <p className="mt-2 text-sm text-purple-800 dark:text-purple-300">
          Placement assessments are sequential. Pass each
          level to unlock the next one. If you fail, PrepMentor
          identifies your weak topics and redirects you to
          Practice Mode for improvement.
        </p>

      </section>

    </div>
  );
}

export default Placement;

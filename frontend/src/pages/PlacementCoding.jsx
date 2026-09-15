import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Code2,
  XCircle,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { usePlacement } from "../context/PlacementContext";
import { addHistoryEntry } from "../services/history";
import { markDailyQuestionActivity } from "../services/dailyActivity";
import { getAssessmentPercentage, hasPassedAssessment, PASS_PERCENTAGE } from "../utils/assessmentRules";
import { normalizePlacementCodingSession, PLACEMENT_CODING_SESSION_KEY } from "../utils/placementCodingSession";
import { getAccountStorageKey, readStorage, writeStorage } from "../utils/storage";
import { generateOfflineQuestions } from "../utils/offlineQuestionGenerator";
import { generateQuestionBatch } from "../services/questionService";
import CareerRoadmap from "../components/CareerRoadmap";

function clearSavedSession(storageKey) {
  try {
    globalThis.localStorage?.removeItem(storageKey);
  } catch {
    // An unavailable browser store should never block an assessment.
  }
}

function PlacementCoding() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    placementState,
    passCodingEasy,
    passCodingMedium,
    passCodingHard,
    failCoding,
  } = usePlacement();

  /*
   * --------------------------------------------------
   * DETERMINE WHICH LEVEL CAN BE ATTEMPTED
   * --------------------------------------------------
   *
   * IMPORTANT:
   * We determine the level only when the assessment starts.
   * Once submitted, assessmentLevel does NOT change.
   */

  const getAvailableLevel = () => {
    if (placementState.coding.easy === "available") {
      return "easy";
    }

    if (placementState.coding.medium === "available") {
      return "medium";
    }

    if (placementState.coding.hard === "available") {
      return "hard";
    }

    return "easy";
  };

  const availableLevel = getAvailableLevel();
  const storageKey = getAccountStorageKey(PLACEMENT_CODING_SESSION_KEY, user);
  const [restoredSession] = useState(() => normalizePlacementCodingSession(
    readStorage(storageKey, null),
    availableLevel,
  ));
  const [assessmentLevel, setAssessmentLevel] = useState(() => restoredSession?.level || availableLevel);

  /*
   * --------------------------------------------------
   * QUESTIONS
   * --------------------------------------------------
   */

  const questionsByLevel = useMemo(() => ({
    easy: [
      {
        id: 1,
        question: "What is the output of: console.log(2 + 3)?",
        options: ["23", "5", "6", "Error"],
        answer: "5",
        topic: "Basic Programming",
      },
      {
        id: 2,
        question: "Which data structure follows the FIFO principle?",
        options: ["Stack", "Queue", "Tree", "Graph"],
        answer: "Queue",
        topic: "Data Structures",
      },
      {
        id: 3,
        question:
          "What is the time complexity of accessing an array element by index?",
        options: ["O(1)", "O(n)", "O(log n)", "O(n²)"],
        answer: "O(1)",
        topic: "Complexity",
      },
      {
        id: 4,
        question:
          "Which keyword is commonly used to declare a constant in JavaScript?",
        options: ["var", "let", "const", "static"],
        answer: "const",
        topic: "JavaScript",
      },
      {
        id: 5,
        question:
          "Which loop is commonly used when the number of iterations is known?",
        options: [
          "for loop",
          "while loop",
          "do-while loop",
          "recursive loop",
        ],
        answer: "for loop",
        topic: "Programming Fundamentals",
      },
    ],

    medium: [
      {
        id: 1,
        question:
          "What is the average time complexity of searching in a balanced Binary Search Tree?",
        options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
        answer: "O(log n)",
        topic: "Trees",
      },
      {
        id: 2,
        question:
          "Which sorting algorithm has an average time complexity of O(n log n)?",
        options: [
          "Bubble Sort",
          "Selection Sort",
          "Merge Sort",
          "Linear Search",
        ],
        answer: "Merge Sort",
        topic: "Sorting",
      },
      {
        id: 3,
        question:
          "Which data structure is typically used for BFS traversal?",
        options: ["Stack", "Queue", "Heap", "Set"],
        answer: "Queue",
        topic: "Graphs",
      },
      {
        id: 4,
        question: "What does recursion require to eventually stop?",
        options: [
          "A loop",
          "A base case",
          "A class",
          "A database",
        ],
        answer: "A base case",
        topic: "Recursion",
      },
      {
        id: 5,
        question:
          "Which structure provides average O(1) lookup by key?",
        options: [
          "Array",
          "Linked List",
          "Hash Table",
          "Binary Tree",
        ],
        answer: "Hash Table",
        topic: "Hashing",
      },
    ],

    hard: [
      {
        id: 1,
        question:
          "Which algorithm is commonly used to find the shortest path in a graph with non-negative edge weights?",
        options: [
          "DFS",
          "Dijkstra's Algorithm",
          "Binary Search",
          "Merge Sort",
        ],
        answer: "Dijkstra's Algorithm",
        topic: "Graph Algorithms",
      },
      {
        id: 2,
        question:
          "What is the worst-case time complexity of Quick Sort?",
        options: [
          "O(log n)",
          "O(n)",
          "O(n log n)",
          "O(n²)",
        ],
        answer: "O(n²)",
        topic: "Sorting",
      },
      {
        id: 3,
        question:
          "Which technique solves problems by storing results of overlapping subproblems?",
        options: [
          "Greedy",
          "Dynamic Programming",
          "Binary Search",
          "Backtracking only",
        ],
        answer: "Dynamic Programming",
        topic: "Dynamic Programming",
      },
      {
        id: 4,
        question:
          "What is the space complexity of an adjacency matrix for a graph with V vertices?",
        options: [
          "O(V)",
          "O(log V)",
          "O(V²)",
          "O(E)",
        ],
        answer: "O(V²)",
        topic: "Graphs",
      },
      {
        id: 5,
        question:
          "Which traversal of a Binary Search Tree produces sorted order?",
        options: [
          "Preorder",
          "Postorder",
          "Inorder",
          "Level order",
        ],
        answer: "Inorder",
        topic: "Trees",
      },
    ],
  }), []);

  const getFallbackQuestions = useCallback((level, count = 30) => {
    return generateOfflineQuestions({ category: "programming", difficulty: level, count });
  }, []);

  const [questions, setQuestions] = useState(() => restoredSession?.questions || questionsByLevel[assessmentLevel]);
  const [loadingQuestions, setLoadingQuestions] = useState(() => !restoredSession);
  const [generationSource, setGenerationSource] = useState(() => restoredSession?.generationSource || "curated");
  const [needsGeneration, setNeedsGeneration] = useState(() => !restoredSession);

  const levelTitle =
    assessmentLevel === "easy"
      ? "Easy"
      : assessmentLevel === "medium"
      ? "Medium"
      : "Hard";

  /*
   * --------------------------------------------------
   * STATE
   * --------------------------------------------------
   */

  const [selectedAnswers, setSelectedAnswers] = useState(() => restoredSession?.selectedAnswers || {});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);

  useEffect(() => {
    const status = placementState.coding[assessmentLevel];
    if (!submitted && status !== "available") {
      navigate("/placement", { replace: true });
    }
  }, [assessmentLevel, navigate, placementState.coding, submitted]);

  useEffect(() => {
    if (!needsGeneration || submitted || placementState.coding[assessmentLevel] !== "available") return undefined;
    let active = true;
    generateQuestionBatch({
      kind: "aptitude",
      count: 30,
      difficulty: assessmentLevel,
      category: "programming fundamentals, data structures, algorithms, and coding complexity",
    })
      .then((response) => {
        if (!active) return;
        setQuestions(response.questions);
        setGenerationSource(response.source || "llm");
        setSelectedAnswers({});
        setNeedsGeneration(false);
      })
      .catch(() => {
        if (!active) return;
        setQuestions(getFallbackQuestions(assessmentLevel));
        setGenerationSource("curated-fallback");
        setSelectedAnswers({});
        setNeedsGeneration(false);
      })
      .finally(() => active && setLoadingQuestions(false));
    return () => {
      active = false;
    };
  }, [assessmentLevel, getFallbackQuestions, needsGeneration, placementState.coding, submitted]);

  useEffect(() => {
    if (loadingQuestions || needsGeneration || submitted || questions.length < 30) return;
    writeStorage(storageKey, {
      level: assessmentLevel,
      questions,
      selectedAnswers,
      generationSource,
    });
  }, [assessmentLevel, generationSource, loadingQuestions, needsGeneration, questions, selectedAnswers, storageKey, submitted]);

  useEffect(() => {
    if (!submitted || !result) return;
    resultRef.current?.focus();
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result, submitted]);

  /*
   * --------------------------------------------------
   * SELECT ANSWER
   * --------------------------------------------------
   */

  const handleAnswer = (questionId, answer) => {
    if (submitted) return;

    markDailyQuestionActivity();
    setSelectedAnswers((previous) => ({
      ...previous,
      [questionId]: answer,
    }));
  };

  /*
   * --------------------------------------------------
   * SUBMIT
   * --------------------------------------------------
   */

  const handleSubmit = () => {
    if (submitted) return;

    if (Object.keys(selectedAnswers).length !== questions.length) {
      return;
    }

    let correct = 0;

    const topicPerformance = questions.map((question) => {
      const userAnswer = selectedAnswers[question.id];

      const isCorrect = userAnswer === question.answer;

      if (isCorrect) {
        correct += 1;
      }

      return {
        topic: question.topic,
        correct: isCorrect ? 1 : 0,
        total: 1,
        percentage: isCorrect ? 100 : 0,
      };
    });

    const percentage = getAssessmentPercentage(correct, questions.length);

    const passed = hasPassedAssessment(correct, questions.length);
    clearSavedSession(storageKey);

    /*
     * FIRST show the result.
     */
    setResult({
      level: assessmentLevel,
      correct,
      total: questions.length,
      percentage,
      passed,
      topicPerformance,
    });

    setSubmitted(true);
    addHistoryEntry({
      title: `Placement Coding · ${levelTitle}`,
      type: "Placement Coding",
      score: percentage,
      duration: "Self-paced",
      topicPerformance,
    });

    /*
     * THEN update placement progress.
     *
     * assessmentLevel is used instead of calculating
     * the level again from the changed context.
     */

    if (passed) {
      if (assessmentLevel === "easy") {
        passCodingEasy();
      } else if (assessmentLevel === "medium") {
        passCodingMedium();
      } else if (assessmentLevel === "hard") {
        passCodingHard();
      }
    } else {
      failCoding(assessmentLevel);
    }
  };

  /*
   * --------------------------------------------------
   * CONTINUE
   * --------------------------------------------------
   */

  const handleContinue = () => {
    if (!result) return;

    /*
     * If passed, go back to Placement.
     * Placement will now show the next unlocked level.
     */

    if (result.passed && result.level !== "hard") {
      const nextLevel = result.level === "easy" ? "medium" : "hard";
      setLoadingQuestions(true);
      setNeedsGeneration(true);
      setAssessmentLevel(nextLevel);
      setSelectedAnswers({});
      setSubmitted(false);
      setResult(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (result.passed) {
      navigate("/placement");
      return;
    }

    /*
     * If failed, send student to Learning Hub.
     */

    navigate("/learning", {
      state: {
        topicPerformance: result.topicPerformance,
        placementMode: true,
        placementLevel: assessmentLevel,
        module: "coding",
      },
    });
  };

  /*
   * --------------------------------------------------
   * RENDER
   * --------------------------------------------------
   */

  const answeredCount = Object.keys(selectedAnswers).length;
  const completion = Math.round((answeredCount / questions.length) * 100);

  if (loadingQuestions) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" role="status" aria-label="Generating Placement coding questions"/><h1 className="mt-5 text-xl font-bold">Preparing 30 {assessmentLevel} coding questions</h1><p className="mt-2 text-sm text-gray-500">Building a fresh assessment of important coding concepts…</p></div></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Back */}
      <button
        type="button"
        onClick={() => navigate("/placement")}
        className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 transition"
      >
        <ArrowLeft size={18} />
        Back to Placement
      </button>

      {/* Header */}
      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-7">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">

          <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
            <Code2 size={32} />
          </div>

          <div>

            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              Placement Coding
            </p>

            <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
              {levelTitle} Level
            </h1>

            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Complete all {questions.length} questions to continue your placement journey. Source: {generationSource === "llm" ? "LLM generated" : "curated fallback"}.
            </p>

          </div>

        </div>

      </section>

      {/* Status */}
      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">

        <div className="flex items-center justify-between gap-4">

          <div>

            <p className="text-xs font-semibold uppercase text-gray-400">
              Current Level
            </p>

            <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
              Coding — {levelTitle}
            </h2>

          </div>

          <div className="px-4 py-2 rounded-lg bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-sm font-semibold">
            Pass Mark: {PASS_PERCENTAGE}%
          </div>

        </div>

      </section>

      {/* Questions */}
      {!submitted && (
        <section className="space-y-5">

          <div className="surface-card rounded-2xl p-5" aria-live="polite">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-semibold text-gray-700 dark:text-gray-200">Assessment progress</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{answeredCount} of {questions.length} answered</span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800" role="progressbar" aria-label="Questions answered" aria-valuemin="0" aria-valuemax={questions.length} aria-valuenow={answeredCount}>
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 transition-[width] duration-500" style={{ width: `${completion}%` }} />
            </div>
          </div>

          {questions.map((question, index) => {

            const selected = selectedAnswers[question.id];

            return (
              <div
                key={question.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6"
              >

                <div className="flex gap-4">

                  <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                    {index + 1}
                  </div>

                  <div className="flex-1">

                    <p className="text-xs font-semibold text-blue-600 mb-2">
                      Question {index + 1}
                    </p>

                    <h2 id={`coding-question-${question.id}`} className="text-lg font-semibold text-gray-900 dark:text-white">
                      {question.question}
                    </h2>

                    <div role="group" aria-labelledby={`coding-question-${question.id}`} className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">

                      {question.options.map((option) => {

                        const isSelected = selected === option;

                        return (
                          <button
                            key={option}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() =>
                              handleAnswer(
                                question.id,
                                option
                              )
                            }
                            className={`w-full text-left px-4 py-3.5 rounded-xl border transition font-medium ${
                              isSelected
                                ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                                : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                            }`}
                          >
                            {option}
                          </button>
                        );

                      })}

                    </div>

                  </div>

                </div>

              </div>
            );

          })}

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              answeredCount !== questions.length
            }
            className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Submit Coding Assessment
            <ArrowRight size={18} />
          </button>

          {answeredCount !== questions.length && (
            <p className="text-center text-sm text-gray-500" aria-live="polite">
              Answer {questions.length - answeredCount} more {questions.length - answeredCount === 1 ? "question" : "questions"} before submitting.
            </p>
          )}

        </section>
      )}

      {/* RESULT */}
      {submitted && result && (
        <div className="space-y-6">
        <section
          ref={resultRef}
          tabIndex="-1"
          aria-live="polite"
          className={`rounded-2xl border p-8 ${
            result.passed
              ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900"
              : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900"
          }`}
        >

          <div className="flex items-start gap-4">

            {result.passed ? (
              <CheckCircle2
                size={34}
                className="text-green-600 shrink-0"
              />
            ) : (
              <XCircle
                size={34}
                className="text-red-500 shrink-0"
              />
            )}

            <div>

              <h2
                className={`text-2xl font-bold ${
                  result.passed
                    ? "text-green-800 dark:text-green-200"
                    : "text-red-800 dark:text-red-200"
                }`}
              >
                {result.passed
                  ? `Coding ${result.level} Passed!`
                  : `Coding ${result.level} Not Passed`}
              </h2>

              <p
                className={`mt-2 ${
                  result.passed
                    ? "text-green-700 dark:text-green-300"
                    : "text-red-700 dark:text-red-300"
                }`}
              >
                You scored{" "}
                <strong>
                  {result.correct} / {result.total}
                </strong>{" "}
                ({result.percentage}%).
              </p>

            </div>

          </div>

          {/* Passed message */}
          {result.passed && result.level === "easy" && (
            <div className="mt-6 p-4 rounded-xl bg-white/70 dark:bg-gray-900/40">
              <p className="font-semibold text-green-800 dark:text-green-200">
                Great job!
              </p>

              <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                Coding Medium is now unlocked.
              </p>
            </div>
          )}

          {result.passed && result.level === "medium" && (
            <div className="mt-6 p-4 rounded-xl bg-white/70 dark:bg-gray-900/40">
              <p className="font-semibold text-green-800 dark:text-green-200">
                Excellent!
              </p>

              <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                Coding Hard is now unlocked.
              </p>
            </div>
          )}

          {result.passed && result.level === "hard" && (
            <div className="mt-6 p-4 rounded-xl bg-white/70 dark:bg-gray-900/40">
              <p className="font-semibold text-green-800 dark:text-green-200">
                Placement Coding Complete!
              </p>

              <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                AI Voice Interview is now unlocked.
              </p>
            </div>
          )}

          {/* Failed */}
          {!result.passed && (
            <div className="mt-6 p-4 rounded-xl bg-white/70 dark:bg-gray-900/40">
              <p className="font-semibold text-red-800 dark:text-red-200">
                Keep practicing.
              </p>

              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                Your weak coding topics have been identified.
                Visit the Learning Hub and practice before trying
                Placement Mode again.
              </p>
            </div>
          )}

          {/* Continue */}
          <button
            type="button"
            onClick={handleContinue}
            className={`mt-6 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition ${
              result.passed
                ? "bg-green-600 hover:bg-green-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {result.passed
              ? result.level === "hard"
                ? "Continue to Interview"
                : `Continue to ${result.level === "easy" ? "Medium" : "Hard"}`
              : "Go to Learning Hub"}

            <ArrowRight size={17} />
          </button>

        </section>
        <CareerRoadmap
          score={result.percentage}
          module={`Placement coding · ${result.level}`}
          topicPerformance={result.topicPerformance}
        />
        </div>
      )}

    </div>
  );
}

export default PlacementCoding;

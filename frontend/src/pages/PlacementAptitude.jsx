import { hasRemoteApi } from "../services/api";
import { authorizedRequest } from "../services/authService";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePlacement } from "../context/PlacementContext";
import { addHistoryEntry } from "../services/history";
import { markDailyQuestionActivity } from "../services/dailyActivity";
import { getAssessmentPercentage, getMinimumCorrectAnswers, hasPassedAssessment } from "../utils/assessmentRules";
import { normalizePlacementAptitudeSession, PLACEMENT_APTITUDE_SESSION_KEY } from "../utils/aptitudeSession";
import { getAccountStorageKey, readStorage, writeStorage } from "../utils/storage";
import { generateOfflineQuestions } from "../utils/offlineQuestionGenerator";
import { generateAptitudeSession } from "../services/questionService";
import CareerRoadmap from "../components/CareerRoadmap";

const QUESTIONS = {
  easy: [
    {
      question: "What is 20% of 150?",
      options: ["20", "25", "30", "35"],
      answer: "30",
    },
    {
      question: "If 5 + 7 = 12, what is 12 × 2?",
      options: ["20", "22", "24", "26"],
      answer: "24",
    },
    {
      question: "What is 25% of 200?",
      options: ["25", "40", "50", "75"],
      answer: "50",
    },
    {
      question: "A train travels 60 km in 1 hour. How far will it travel in 3 hours?",
      options: ["120 km", "150 km", "180 km", "200 km"],
      answer: "180 km",
    },
    {
      question: "What is the average of 10 and 20?",
      options: ["10", "15", "20", "30"],
      answer: "15",
    },
  ],

  medium: [
    {
      question:
        "A number is increased by 25% and then decreased by 20%. What is the overall percentage change?",
      options: ["0%", "5% increase", "5% decrease", "10% increase"],
      answer: "0%",
    },
    {
      question:
        "If the ratio of boys to girls is 3:2 and there are 30 boys, how many girls are there?",
      options: ["15", "20", "25", "30"],
      answer: "20",
    },
    {
      question:
        "A product costs ₹800 and is sold at a 15% discount. What is the selling price?",
      options: ["₹680", "₹700", "₹720", "₹740"],
      answer: "₹680",
    },
    {
      question:
        "If 8 workers complete a task in 12 days, how many days will 6 workers take?",
      options: ["14 days", "16 days", "18 days", "20 days"],
      answer: "16 days",
    },
    {
      question:
        "A car travels 240 km in 4 hours. What is its average speed?",
      options: ["40 km/h", "50 km/h", "60 km/h", "80 km/h"],
      answer: "60 km/h",
    },
  ],

  hard: [
    {
      question:
        "A number is increased by 25% and then decreased by 20%. What is the overall percentage change?",
      options: ["0%", "5% increase", "5% decrease", "10% increase"],
      answer: "0%",
    },
    {
      question:
        "If 3x + 7 = 28, what is the value of x?",
      options: ["5", "6", "7", "8"],
      answer: "7",
    },
    {
      question:
        "A train 180 meters long crosses a pole in 9 seconds. What is its speed?",
      options: ["60 km/h", "72 km/h", "80 km/h", "90 km/h"],
      answer: "72 km/h",
    },
    {
      question:
        "The probability of getting a head when a fair coin is tossed once is:",
      options: ["0", "1/4", "1/2", "1"],
      answer: "1/2",
    },
    {
      question:
        "If the selling price is ₹1,200 after a 20% profit, what was the cost price?",
      options: ["₹900", "₹960", "₹1,000", "₹1,100"],
      answer: "₹1,000",
    },
  ],
};

function getPlacementFallback(level, count = 30) {
  return generateOfflineQuestions({ category: "quantitative", difficulty: level, count });
}

function getFirstAvailableLevel(placementState) {
  if (placementState?.aptitude?.easy !== "passed") {
    return "easy";
  }

  if (placementState?.aptitude?.medium !== "passed") {
    return "medium";
  }

  return "hard";
}

function clearSavedSession(storageKey) {
  try {
    globalThis.localStorage?.removeItem(storageKey);
  } catch {
    // An unavailable browser store should never block an assessment.
  }
}

export default function PlacementAptitude() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    placementState, applyServerPlacement,
    passAptitudeEasy,
    passAptitudeMedium,
    passAptitudeHard,
    failAptitude,
  } = usePlacement();

  const availableLevel = getFirstAvailableLevel(placementState);
  const storageKey = getAccountStorageKey(PLACEMENT_APTITUDE_SESSION_KEY, user);
  const [restoredSession] = useState(() => normalizePlacementAptitudeSession(
    (hasRemoteApi && !readStorage(storageKey, null)?.serverSessionId) ? null : readStorage(storageKey, null),
    availableLevel,
  ));

  /*
   * IMPORTANT:
   * We keep the currently selected level separately from
   * placementState.
   *
   * This prevents React from immediately jumping to Medium
   * when Easy is completed.
   */
  const [serverSessionId, setServerSessionId] = useState(() => restoredSession?.serverSessionId || null);
  const [submissionError, setSubmissionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);
  const [level, setLevel] = useState(() => restoredSession?.level || availableLevel);

  const [questionIndex, setQuestionIndex] = useState(() => restoredSession?.questionIndex || 0);

  const [selectedAnswer, setSelectedAnswer] = useState(() => restoredSession?.selectedAnswer || null);

  const [answers, setAnswers] = useState(()=>restoredSession?.answers || {});
  const [score, setScore] = useState(() => restoredSession?.score || 0);

  const [showResult, setShowResult] = useState(false);

  const [lastResult, setLastResult] = useState(null);

  const [questions, setQuestions] = useState(() => restoredSession?.questions || QUESTIONS[level] || QUESTIONS.easy);

  const [loadingQuestions, setLoadingQuestions] = useState(() => !restoredSession);

  const [generationSource, setGenerationSource] = useState(() => restoredSession?.generationSource || "curated");

  const [needsGeneration, setNeedsGeneration] = useState(() => !restoredSession);

  useEffect(() => {
    const status = placementState.aptitude[level];
    if (!showResult && status !== "available") {
      navigate("/placement", { replace: true });
    }
  }, [level, navigate, placementState.aptitude, showResult]);

  /*
   * If the user refreshes before starting anything,
   * make sure the level matches the saved placement state.
   *
   * BUT don't change the level while a result screen is being shown.
   */
  useEffect(() => {
    if (!needsGeneration || showResult || placementState.aptitude[level] !== "available") return undefined;
    let active = true;
    (hasRemoteApi ? authorizedRequest("/api/placement/aptitude/start", { method: "POST", body: JSON.stringify({ level }) }) : generateAptitudeSession({ category: "quantitative", difficulty: level, count: 30 }))
      .then((result) => {
        if (!active) return;
        setServerSessionId(result.id || null);
        setSubmissionError("");
        setQuestions(result.questions);
        setGenerationSource(result.source || "curated");
        setQuestionIndex(0);
        setSelectedAnswer(null);
        setScore(0);
        setAnswers({});
        setNeedsGeneration(false);
      })
      .catch((error) => {
        if (!active) return;
        if (hasRemoteApi) { setSubmissionError(error.message); return; }
        setQuestions(getPlacementFallback(level));
        setGenerationSource("curated-fallback");
        setQuestionIndex(0);
        setSelectedAnswer(null);
        setScore(0);
        setAnswers({});
        setNeedsGeneration(false);
      })
      .finally(() => active && setLoadingQuestions(false));
    return () => {
      active = false;
    };
  }, [level, needsGeneration, placementState.aptitude, showResult]);

  useEffect(() => {
    if (loadingQuestions || needsGeneration || showResult || questions.length < 30) return;
    writeStorage(storageKey, {
      level,
      questions,
      serverSessionId,
      questionIndex,
      selectedAnswer,
      score,
      generationSource,
      answers,
    });
  }, [answers, generationSource, level, loadingQuestions, needsGeneration, questionIndex, questions, score, selectedAnswer, showResult, storageKey, serverSessionId]);

  const currentQuestion = questions[questionIndex];

  const isLastQuestion = questionIndex === questions.length - 1;

  const levelTitle =
    level.charAt(0).toUpperCase() + level.slice(1);

  /*
   * ----------------------------------------
   * SELECT ANSWER
   * ----------------------------------------
   */
  const handleSelectAnswer = (answer) => {
    if (showResult || submitting) return;

    markDailyQuestionActivity();
    setSelectedAnswer(answer);
  };

  /*
   * ----------------------------------------
   * NEXT QUESTION / SUBMIT
   * ----------------------------------------
   */
  const handleNext = async () => {
    if (submitLock.current) return;
    if (!selectedAnswer) {
      return;
    }

    const isCorrect =
      selectedAnswer === currentQuestion.answer;

    const newScore = isCorrect ? score + 1 : score;
    const finalAnswers={...answers,[questionIndex]:selectedAnswer};
    setAnswers(finalAnswers);

    if (!isLastQuestion) {
      if (isCorrect) {
        setScore(newScore);
      }

      setQuestionIndex((previous) => previous + 1);
      setSelectedAnswer(null);

      return;
    }

    /*
     * Last question.
     */
    if (hasRemoteApi) {
      submitLock.current = true; setSubmitting(true); setSubmissionError("");
      try {
        const result = await authorizedRequest("/api/placement/aptitude/submit", { method: "POST", body: JSON.stringify({ sessionId: serverSessionId, answers: finalAnswers }) });
        setScore(result.correct);
        setLastResult({ level, score: result.correct, passed: result.passed, topicPerformance: result.topicPerformance });
        setShowResult(true);
        clearSavedSession(storageKey);
        addHistoryEntry(result.entry, { sync: false });
        applyServerPlacement(result.placementState);
      } catch (error) { setSubmissionError(error.message); }
      finally { submitLock.current = false; setSubmitting(false); }
      return;
    }
    const finalScore = newScore;

    setScore(finalScore);
    clearSavedSession(storageKey);

    const passed = hasPassedAssessment(finalScore, questions.length);

    const groups=new Map();
    questions.forEach((question,index)=>{if(finalAnswers[index]===undefined)return;const topic=question.topic||"Aptitude";const item=groups.get(topic)||{topic,correct:0,total:0};item.total++;if(finalAnswers[index]===question.answer)item.correct++;groups.set(topic,item);});
    const topicPerformance=[...groups.values()].map((item)=>({...item,percentage:getAssessmentPercentage(item.correct,item.total)}));
    setLastResult({
      topicPerformance,
      level,
      score: finalScore,
      passed,
    });
    addHistoryEntry({
      title: `Placement Aptitude · ${levelTitle}`,
      type: "Placement Aptitude",
      mode: "placement",
      difficulty: level,
      score: getAssessmentPercentage(finalScore, questions.length),
      duration: "Self-paced",
      topicPerformance,
    });

    /*
     * Update placement state.
     *
     * IMPORTANT:
     * We DO NOT change `level` here.
     *
     * Therefore the result screen stays visible.
     */
    if (level === "easy") {
      if (passed) {
        passAptitudeEasy();
      } else {
        failAptitude("easy");
      }
    }

    if (level === "medium") {
      if (passed) {
        passAptitudeMedium();
      } else {
        failAptitude("medium");
      }
    }

    if (level === "hard") {
      if (passed) {
        passAptitudeHard();
      } else {
        failAptitude("hard");
      }
    }

    setShowResult(true);
  };

  /*
   * ----------------------------------------
   * CONTINUE TO NEXT LEVEL
   * ----------------------------------------
   */
  const handleContinue = () => {
    if (!lastResult) return;

    if (!lastResult.passed) {
      navigate("/learning", {
        state: {
          topicPerformance: lastResult.topicPerformance,
          placementMode: true,
          placementLevel: level,
          module: "aptitude",
        },
      });
      return;
    }

    if (level === "easy") {
      setLoadingQuestions(true);
      setNeedsGeneration(true);
      setLevel("medium");
    } else if (level === "medium") {
      setLoadingQuestions(true);
      setNeedsGeneration(true);
      setLevel("hard");
    } else {
      /*
       * Hard aptitude completed.
       * Go back to placement dashboard.
       */
      navigate("/placement");
      return;
    }

    setQuestionIndex(0);
    setSelectedAnswer(null);
    setScore(0);
        setAnswers({});
    setLastResult(null);
    setShowResult(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /*
   * ----------------------------------------
   * BACK
   * ----------------------------------------
   */
  const handleBack = () => {
    navigate("/placement");
  };

  /*
   * ----------------------------------------
   * RESULT SCREEN
   * ----------------------------------------
   */
  if (submissionError && needsGeneration) return <section className="surface-card rounded-3xl p-6"><p role="alert">{submissionError}</p><button onClick={() => window.location.reload()} className="mt-4 font-bold text-indigo-600">Retry loading assessment</button></section>;

  if (showResult && lastResult) {
    const percentage = getAssessmentPercentage(lastResult.score, questions.length);

    return (
      <div className="placement-aptitude" style={styles.page}>
        <div style={styles.container}>

          <button
            onClick={handleBack}
            style={styles.backButton}
          >
            ← Back to Placement
          </button>

          <div style={styles.resultCard}>

            <div style={styles.resultIcon}>
              {lastResult.passed ? "✓" : "×"}
            </div>

            <div style={styles.resultTitle}>
              {lastResult.passed
                ? "Assessment Passed!"
                : "Assessment Not Passed"}
            </div>

            <p style={styles.resultSubtitle}>
              {levelTitle} Aptitude Assessment
            </p>

            <div style={styles.scoreBox}>
              <div style={styles.scoreNumber}>
                {lastResult.score} / {questions.length}
              </div>

              <div style={styles.scorePercentage}>
                {percentage}%
              </div>
            </div>

            {lastResult.passed ? (
              <div style={styles.successMessage}>
                <strong>Great job!</strong>

                <p>
                  You passed the {level} aptitude level.
                  {level !== "hard"
                    ? " The next level is now ready."
                    : " You have completed all aptitude levels."}
                </p>
              </div>
            ) : (
              <div style={styles.failureMessage}>
                <strong>Keep practicing!</strong>

                <p>
                  You need at least {getMinimumCorrectAnswers(questions.length)} correct answers out
                  of {questions.length} to pass this level.
                </p>
              </div>
            )}

            <button
              onClick={handleContinue}
              style={styles.primaryButton}
            >
              {lastResult.passed
                ? level === "hard"
                  ? "Continue to Placement"
                  : `Continue to ${
                      level === "easy" ? "Medium" : "Hard"
                    } Level`
                : "Review Weak Areas"}
            </button>

          </div>
          <CareerRoadmap
            score={percentage}
            module={`Placement aptitude · ${levelTitle}`}
            topicPerformance={lastResult?.topicPerformance || []}
          />
        </div>
      </div>
    );
  }

  if (loadingQuestions) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" role="status" aria-label="Generating Placement aptitude questions"/><h1 className="mt-5 text-xl font-bold">Preparing 30 {level} questions</h1><p className="mt-2 text-sm text-gray-500">Building a fresh Placement assessment for this level…</p></div></div>;
  }

  /*
   * ----------------------------------------
   * TEST SCREEN
   * ----------------------------------------
   */

  const progress =
    ((questionIndex + 1) / questions.length) * 100;

  return (
    <div className="placement-aptitude" style={styles.page}>

      <div style={styles.container}>

        {/* BACK */}
        <button
          onClick={handleBack}
          style={styles.backButton}
        >
          ← Back to Placement
        </button>

        {/* HEADER */}
        <div style={styles.headerCard}>

          <div style={styles.targetIcon}>
            ◎
          </div>

          <div>
            <div style={styles.smallBlueText}>
              Placement Aptitude
            </div>

            <h1 style={styles.title}>
              {levelTitle} Level
            </h1>

            <p style={styles.subtitle}>
              Complete all {questions.length} questions to continue your
              placement journey. Source: {generationSource === "server-curated" ? "server-scored curated assessment" : generationSource === "llm" ? "LLM generated" : "curated fallback"}.
            </p>
          </div>

        </div>

        {/* PROGRESS */}
        <div style={styles.progressCard}>

          <div style={styles.progressTop}>

            <div>
              <div style={styles.progressLabel}>
                Question
              </div>

              <strong style={styles.questionCount}>
                {questionIndex + 1} / {questions.length}
              </strong>
            </div>

            <div style={styles.levelBadge}>
              {levelTitle}
            </div>

          </div>

          <div style={styles.progressBackground}>
            <div
              style={{
                ...styles.progressBar,
                width: `${progress}%`,
              }}
            />
          </div>

        </div>

        {/* QUESTION */}
        <div style={styles.questionCard}>

          <div style={styles.questionNumber}>
            Question {questionIndex + 1}
          </div>

          <h2 style={styles.questionText}>
            {currentQuestion.question}
          </h2>

          <div style={styles.optionsContainer}>

            {currentQuestion.options.map(
              (option, index) => {

                const isSelected =
                  selectedAnswer === option;

                return (
                  <button
                    key={`${level}-${questionIndex}-${index}`}
                    onClick={() =>
                      handleSelectAnswer(option)
                    }
                    style={{
                      ...styles.optionButton,
                      ...(isSelected
                        ? styles.optionSelected
                        : {}),
                    }}
                  >

                    <span
                      style={{
                        ...styles.optionLetter,
                        ...(isSelected
                          ? styles.optionLetterSelected
                          : {}),
                      }}
                    >
                      {String.fromCharCode(65 + index)}
                    </span>

                    <span style={styles.optionText}>
                      {option}
                    </span>

                    {isSelected && (
                      <span style={styles.checkMark}>
                        ✓
                      </span>
                    )}

                  </button>
                );
              }
            )}

          </div>

          {/* NEXT BUTTON */}
          <div style={styles.actionContainer}>

            {submissionError && <p role="alert" className="text-rose-500">{submissionError}</p>}{submitting && <p role="status">Saving your assessment...</p>}
            <button
              onClick={handleNext}
              disabled={!selectedAnswer || submitting}
              style={{
                ...styles.nextButton,
                ...(!selectedAnswer
                  ? styles.nextButtonDisabled
                  : {}),
              }}
            >
              {isLastQuestion
                ? "Submit Test"
                : "Next Question"}
              <span style={styles.arrow}>
                →
              </span>
            </button>

          </div>

        </div>

      </div>
    </div>
  );
}

/*
 * =====================================================
 * STYLES
 * =====================================================
 *
 * These styles are local to this component.
 * They do NOT modify App.css or index.css.
 */

const styles = {
  page: {
    minHeight: "100vh",
    background: "var(--app-bg)",
    padding: "32px 24px 60px",
    boxSizing: "border-box",
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: "1100px",
    margin: "0 auto",
  },

  backButton: {
    border: "none",
    background: "transparent",
    color: "var(--app-text)",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    padding: "8px 0",
    marginBottom: "28px",
  },

  headerCard: {
    background: "var(--app-surface-solid)",
    border: "1px solid var(--app-border)",
    borderRadius: "18px",
    padding: "36px",
    display: "flex",
    alignItems: "center",
    gap: "24px",
    marginBottom: "28px",
    boxShadow: "0 2px 8px rgba(20, 30, 50, 0.03)",
  },

  targetIcon: {
    width: "62px",
    height: "62px",
    borderRadius: "16px",
    background: "var(--app-primary-soft)",
    color: "var(--app-primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "40px",
    fontWeight: "700",
    flexShrink: 0,
  },

  smallBlueText: {
    color: "var(--app-primary)",
    fontSize: "15px",
    fontWeight: "700",
    marginBottom: "4px",
  },

  title: {
    margin: "0",
    color: "var(--app-text)",
    fontSize: "32px",
    lineHeight: "1.2",
    fontWeight: "750",
  },

  subtitle: {
    margin: "8px 0 0",
    color: "var(--app-muted)",
    fontSize: "16px",
    lineHeight: "1.5",
  },

  progressCard: {
    background: "var(--app-surface-solid)",
    border: "1px solid var(--app-border)",
    borderRadius: "18px",
    padding: "26px 30px",
    marginBottom: "28px",
  },

  progressTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "18px",
  },

  progressLabel: {
    color: "var(--app-muted)",
    fontSize: "14px",
    marginBottom: "3px",
  },

  questionCount: {
    color: "var(--app-text)",
    fontSize: "19px",
  },

  levelBadge: {
    background: "var(--app-primary-soft)",
    color: "var(--app-primary)",
    borderRadius: "9px",
    padding: "8px 14px",
    fontSize: "14px",
    fontWeight: "700",
  },

  progressBackground: {
    height: "8px",
    background: "var(--app-track)",
    borderRadius: "10px",
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    background: "var(--app-primary-gradient)",
    borderRadius: "10px",
    transition: "width 0.25s ease",
  },

  questionCard: {
    background: "var(--app-surface-solid)",
    border: "1px solid var(--app-border)",
    borderRadius: "18px",
    padding: "34px",
    boxShadow: "0 2px 8px rgba(20, 30, 50, 0.03)",
  },

  questionNumber: {
    color: "var(--app-primary)",
    fontSize: "14px",
    fontWeight: "700",
    marginBottom: "12px",
  },

  questionText: {
    color: "var(--app-text)",
    fontSize: "22px",
    lineHeight: "1.45",
    margin: "0 0 28px",
    fontWeight: "700",
  },

  optionsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  optionButton: {
    width: "100%",
    minHeight: "62px",
    border: "1px solid #d9dee7",
    background: "var(--app-surface-solid)",
    borderRadius: "12px",
    padding: "12px 18px",
    display: "flex",
    alignItems: "center",
    textAlign: "left",
    cursor: "pointer",
    transition: "all 0.15s ease",
    fontSize: "16px",
    color: "var(--app-text)",
  },

  optionSelected: {
    border: "2px solid var(--app-primary)",
    background: "var(--app-primary-soft-strong)",
  },

  optionLetter: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    background: "#f0f2f5",
    color: "#344054",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    marginRight: "14px",
    flexShrink: 0,
  },

  optionLetterSelected: {
    background: "var(--app-primary-gradient)",
    color: "#ffffff",
  },

  optionText: {
    flex: 1,
    fontWeight: "500",
  },

  checkMark: {
    color: "var(--app-primary)",
    fontSize: "20px",
    fontWeight: "800",
    marginLeft: "10px",
  },

  actionContainer: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "28px",
  },

  nextButton: {
    border: "none",
    background: "var(--app-primary-gradient)",
    color: "#ffffff",
    borderRadius: "10px",
    padding: "13px 22px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: "160px",
    justifyContent: "center",
  },

  nextButtonDisabled: {
    background: "#cbd5e1",
    color: "#ffffff",
    cursor: "not-allowed",
  },

  arrow: {
    fontSize: "18px",
  },

  /*
   * RESULT
   */

  resultCard: {
    background: "var(--app-surface-solid)",
    border: "1px solid var(--app-border)",
    borderRadius: "18px",
    padding: "50px 40px",
    textAlign: "center",
    maxWidth: "700px",
    margin: "40px auto",
    boxShadow: "0 4px 15px rgba(20, 30, 50, 0.05)",
  },

  resultIcon: {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    background: "#e8f8ee",
    color: "#16a34a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "38px",
    fontWeight: "800",
    margin: "0 auto 22px",
  },

  resultTitle: {
    color: "var(--app-text)",
    fontSize: "30px",
    fontWeight: "750",
    marginBottom: "8px",
  },

  resultSubtitle: {
    color: "var(--app-muted)",
    fontSize: "16px",
    margin: "0 0 28px",
  },

  scoreBox: {
    background: "#f7f9fc",
    borderRadius: "14px",
    padding: "22px",
    marginBottom: "24px",
  },

  scoreNumber: {
    color: "#101828",
    fontSize: "30px",
    fontWeight: "800",
  },

  scorePercentage: {
    color: "#667085",
    fontSize: "14px",
    marginTop: "4px",
  },

  successMessage: {
    background: "#ecfdf3",
    border: "1px solid #abefc6",
    color: "#067647",
    borderRadius: "12px",
    padding: "18px",
    marginBottom: "25px",
    textAlign: "left",
  },

  failureMessage: {
    background: "#fff4ed",
    border: "1px solid #fed7aa",
    color: "#c2410c",
    borderRadius: "12px",
    padding: "18px",
    marginBottom: "25px",
    textAlign: "left",
  },

  primaryButton: {
    border: "none",
    background: "var(--app-primary-gradient)",
    color: "#ffffff",
    borderRadius: "10px",
    padding: "14px 25px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    minWidth: "220px",
  },
};

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Brain,
  Trophy,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { addHistoryEntry } from "../services/history";

const questions = [
  {
    question: "What is 20% of 250?",
    options: ["25", "40", "50", "60"],
    answer: "50",
    topic: "Percentages",
  },
  {
    question: "If a train travels 120 km in 2 hours, what is its average speed?",
    options: ["40 km/h", "50 km/h", "60 km/h", "80 km/h"],
    answer: "60 km/h",
    topic: "Time & Speed",
  },
  {
    question: "What comes next in the sequence: 2, 4, 8, 16, ?",
    options: ["20", "24", "30", "32"],
    answer: "32",
    topic: "Number Series",
  },
  {
    question: "If ALL roses are flowers and SOME flowers fade quickly, which statement is definitely true?",
    options: [
      "All roses fade quickly",
      "Some roses fade quickly",
      "All roses are flowers",
      "No roses fade quickly",
    ],
    answer: "All roses are flowers",
    topic: "Logical Reasoning",
  },
  {
    question: "Choose the word closest in meaning to 'abundant'.",
    options: ["Rare", "Plentiful", "Weak", "Empty"],
    answer: "Plentiful",
    topic: "Verbal Ability",
  },
];

function AptitudeQuiz() {
  const navigate = useNavigate();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [answers, setAnswers] = useState({});
  const [finished, setFinished] = useState(false);

  const question = questions[currentQuestion];

  const handleNext = () => {
    if (!selectedAnswer) {
      return;
    }

    const updatedAnswers = {
      ...answers,
      [currentQuestion]: selectedAnswer,
    };

    setAnswers(updatedAnswers);

    if (currentQuestion === questions.length - 1) {
      const finalScore = questions.reduce(
        (total, item, index) => total + (updatedAnswers[index] === item.answer ? 1 : 0),
        0
      );
      addHistoryEntry({
        title: "General Aptitude Practice",
        type: "Practice",
        score: Math.round((finalScore / questions.length) * 100),
        duration: "Self-paced",
      });
      setFinished(true);
      return;
    }

    const nextQuestion = currentQuestion + 1;

    setCurrentQuestion(nextQuestion);
    setSelectedAnswer(updatedAnswers[nextQuestion] || "");
  };

  const calculateScore = () => {
    return questions.reduce((score, item, index) => {
      return score + (answers[index] === item.answer ? 1 : 0);
    }, 0);
  };

  const score = calculateScore();

  const getTopicPerformance = () => {
    const topicResults = {};

    questions.forEach((question, index) => {
      if (!topicResults[question.topic]) {
        topicResults[question.topic] = {
          correct: 0,
          total: 0,
        };
      }

      topicResults[question.topic].total += 1;

      if (answers[index] === question.answer) {
        topicResults[question.topic].correct += 1;
      }
    });

    return Object.entries(topicResults).map(([topic, result]) => ({
      topic,
      correct: result.correct,
      total: result.total,
      percentage: Math.round(
        (result.correct / result.total) * 100
      ),
    }));
  };

  const topicPerformance = getTopicPerformance();


  if (finished) {
    const percentage = Math.round((score / questions.length) * 100);

    return (
      <div className="max-w-3xl mx-auto">

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center">

          <div className="w-16 h-16 mx-auto rounded-2xl bg-yellow-100 text-yellow-600 flex items-center justify-center">
            <Trophy size={32} />
          </div>

          <h1 className="mt-5 text-3xl font-bold text-gray-900 dark:text-white">
            Practice Complete
          </h1>

          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Here's how you performed in this aptitude session.
          </p>

          <div className="mt-8">
            <p className="text-5xl font-bold text-blue-600">
              {percentage}%
            </p>

            <p className="mt-2 text-gray-500 dark:text-gray-400">
              {score} out of {questions.length} correct
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">

            <div className="rounded-xl bg-green-50 dark:bg-green-950/30 p-4">
              <p className="text-2xl font-bold text-green-600">
                {score}
              </p>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Correct
              </p>
            </div>

            <div className="rounded-xl bg-red-50 dark:bg-red-950/30 p-4">
              <p className="text-2xl font-bold text-red-500">
                {questions.length - score}
              </p>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Incorrect
              </p>
            </div>

          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">

            <button
              type="button"
              onClick={() =>
                navigate("/learning", {
                  state: {
                    topicPerformance,
                    overallScore: score,
                    totalQuestions: questions.length,
                  },
                })
              }
              className="px-5 py-3 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-semibold"
            >
              View Weak Topics
            </button>

            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
            >
              Back to Dashboard
            </button>

          </div>

        </div>

      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">

        <button
          type="button"
          onClick={() => navigate("/practice/aptitude")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft size={17} />
          Back
        </button>

        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Brain size={18} className="text-blue-600" />
          Practice Mode
        </div>

      </div>

      {/* Progress */}
      <div className="mb-6">

        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Question {currentQuestion + 1} of {questions.length}
          </span>

          <span className="text-gray-500">
            {Math.round(
              ((currentQuestion + 1) / questions.length) * 100
            )}%
          </span>
        </div>

        <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{
              width: `${((currentQuestion + 1) / questions.length) * 100}%`,
            }}
          />
        </div>

      </div>

      {/* Question */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-7">

        <p className="text-sm font-semibold text-blue-600">
          {question.topic}
        </p>

        <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
          {question.question}
        </h1>

        <div className="mt-7 space-y-3">

          {question.options.map((option) => {
            const selected = selectedAnswer === option;

            return (
              <button
                key={option}
                type="button"
                onClick={() => setSelectedAnswer(option)}
                className={`w-full flex items-center justify-between text-left px-5 py-4 rounded-xl border transition ${
                  selected
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                    : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300"
                }`}
              >
                <span className="font-medium">
                  {option}
                </span>

                {selected && (
                  <CheckCircle size={20} className="text-blue-600" />
                )}
              </button>
            );
          })}

        </div>

        <div className="mt-8 flex justify-end">

          <button
            type="button"
            disabled={!selectedAnswer}
            onClick={handleNext}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentQuestion === questions.length - 1
              ? "Finish"
              : "Next"}

            <ArrowRight size={17} />
          </button>

        </div>

      </div>

    </div>
  );
}

export default AptitudeQuiz;

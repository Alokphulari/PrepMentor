import { useNavigate } from "react-router-dom";

import {
  Brain,
  Clock,
  Target,
  BookOpen,
  ArrowRight,
} from "lucide-react";

function AptitudePractice() {
  const navigate = useNavigate();
  const topics = [
    "Quantitative Aptitude",
    "Logical Reasoning",
    "Verbal Ability",
    "Data Interpretation",
  ];

  const difficulties = [
    {
      name: "Easy",
      description: "Build your fundamentals.",
    },
    {
      name: "Medium",
      description: "Challenge your understanding.",
    },
    {
      name: "Hard",
      description: "Test advanced problem solving.",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <section>
        <p className="text-sm font-semibold text-blue-600">
          Practice Module
        </p>

        <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
          Aptitude Practice
        </h1>

        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Practice any aptitude topic and difficulty whenever you want.
        </p>
      </section>

      {/* Topics */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={20} className="text-blue-600" />

          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Choose a Topic
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {topics.map((topic) => (
            <button
              key={topic}
              type="button"
              className="text-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-blue-400 hover:shadow-sm transition"
            >
              <Brain className="text-blue-600" size={24} />

              <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
                {topic}
              </h3>

              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Practice questions
              </p>
            </button>
          ))}

        </div>
      </section>

      {/* Difficulty */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Target size={20} className="text-blue-600" />

          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Choose Difficulty
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {difficulties.map((difficulty) => (
            <div
              key={difficulty.name}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6"
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {difficulty.name}
              </h3>

              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {difficulty.description}
              </p>

              <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
                <Clock size={15} />
                Flexible practice
              </div>

              <button
                type="button"
                onClick={() => navigate("/practice/aptitude/quiz")}
                className="mt-5 flex items-center gap-2 text-sm font-semibold text-blue-600"
              >
                Start
                <ArrowRight size={16} />
              </button>
            </div>
          ))}

        </div>
      </section>

      {/* Important distinction */}
      <section className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-2xl p-6">

        <h2 className="font-bold text-blue-900 dark:text-blue-200">
          Practice Mode is always open
        </h2>

        <p className="mt-2 text-sm text-blue-800 dark:text-blue-300">
          You can practice any topic or difficulty here regardless of
          your placement stage. Practice performance will later help
          PrepMentor identify weak areas and recommend learning material.
        </p>

      </section>

    </div>
  );
}

export default AptitudePractice;
import {
  Brain,
  BookOpen,
  PlayCircle,
  ArrowRight,
  Target,
  TrendingUp,
} from "lucide-react";

import { useNavigate, useLocation } from "react-router-dom";
import { usePlacement } from "../context/PlacementContext";

function LearningHub() {
  const navigate = useNavigate();
  const location = useLocation();
  const { retryAptitude, retryCoding } = usePlacement();

  const performance = location.state?.topicPerformance || [];
  const placementMode = Boolean(location.state?.placementMode);
  const placementLevel = location.state?.placementLevel;
  const placementModule = location.state?.module;

  const handleReturn = () => {
    if (placementMode && placementLevel) {
      if (placementModule === "coding") {
        retryCoding(placementLevel);
        navigate("/placement/coding");
      } else {
        retryAptitude(placementLevel);
        navigate("/placement/aptitude");
      }
      return;
    }
    navigate("/practice/aptitude");
  };

  const weakTopics = performance
    .filter((item) => item.percentage < 70)
    .map((item) => ({
      topic: item.topic,
      score: item.percentage,
      description: `Improve your ${item.topic.toLowerCase()} skills through focused practice.`,
    }));

  const courses = weakTopics.map((item) => ({
    title: `Master ${item.topic}`,
    topic: item.topic,
    type: "Recommended Learning",
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <section>
        <p className="text-sm font-semibold text-purple-600">
          AI Learning Hub
        </p>

        <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
          Improve Your Weak Areas
        </h1>

        <p className="mt-2 text-gray-500 dark:text-gray-400">
          PrepMentor identifies areas that need improvement and recommends
          learning resources.
        </p>
      </section>

      {/* Weak Topics */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Target size={21} className="text-red-500" />

          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Your Weak Topics
          </h2>
        </div>

        {weakTopics.length === 0 ? (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-2xl p-6">
            <h3 className="font-bold text-green-800 dark:text-green-200">
              Excellent performance!
            </h3>

            <p className="mt-2 text-sm text-green-700 dark:text-green-300">
              No major weak topics were identified in this practice session.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {weakTopics.map((item) => (
              <div
                key={item.topic}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6"
              >
                <div className="flex items-center justify-between">

                  <div className="w-11 h-11 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-500 flex items-center justify-center">
                    <Brain size={22} />
                  </div>

                  <span className="text-sm font-bold text-red-500">
                    {item.score}%
                  </span>

                </div>

                <h3 className="mt-5 text-lg font-bold text-gray-900 dark:text-white">
                  {item.topic}
                </h3>

                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {item.description}
                </p>

                <div className="mt-4 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500"
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recommended Learning */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={21} className="text-blue-600" />

          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Recommended Learning
          </h2>
        </div>

        {courses.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Complete a practice session to receive personalized learning
              recommendations.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map((course) => (
              <div
                key={course.title}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                  <div className="flex items-center gap-4">

                    <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                      <PlayCircle size={22} />
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-blue-600">
                        {course.type}
                      </p>

                      <h3 className="mt-1 font-bold text-gray-900 dark:text-white">
                        {course.title}
                      </h3>

                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Recommended for {course.topic}
                      </p>
                    </div>

                  </div>

                  <button
                    type="button"
                    onClick={handleReturn}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                  >
                    Start Learning
                    <ArrowRight size={16} />
                  </button>

                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Improvement Loop */}
      <section className="bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900 rounded-2xl p-6">
        <div className="flex items-start gap-4">

          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900 text-purple-600 flex items-center justify-center">
            <TrendingUp size={24} />
          </div>

          <div>
            <h2 className="font-bold text-purple-900 dark:text-purple-200">
              Your improvement loop
            </h2>

            <p className="mt-2 text-sm text-purple-800 dark:text-purple-300">
              Learn the weak topic, practice it again, and let PrepMentor
              reassess your performance.
            </p>
          </div>

        </div>
      </section>

      {/* Back to Practice */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleReturn}
          className="flex items-center gap-2 px-5 py-3 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          {placementMode ? "Retry Placement Assessment" : "Back to Practice"}
          <ArrowRight size={17} />
        </button>
      </div>

    </div>
  );
}

export default LearningHub;

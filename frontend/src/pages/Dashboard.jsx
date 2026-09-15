import {
  BookOpen,
  Brain,
  Code2,
  Mic,
  Flame,
  Trophy,
  Target,
  ArrowRight,
  Lock,
  CheckCircle,
  CircleHelp,
  Gamepad2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();
  const placementStages = [
    {
      title: "Aptitude",
      description: "Test quantitative, logical, and verbal reasoning.",
      icon: Brain,
      status: "active",
      levels: ["Easy", "Medium", "Hard"],
    },
    {
      title: "Coding",
      description: "Progress through coding assessments.",
      icon: Code2,
      status: "locked",
      levels: ["Easy", "Medium", "Hard"],
    },
    {
      title: "AI Voice Interview",
      description: "Practice adaptive interview questions and whiteboard.",
      icon: Mic,
      status: "locked",
      levels: ["Adaptive Q&A", "Whiteboard"],
    },
  ];

  const practiceModules = [
    {
      title: "Aptitude Practice",
      description: "Practice any aptitude topic and difficulty.",
      icon: Brain,
      path: "/practice/aptitude",
    },
    {
      title: "Coding Practice",
      description: "Solve coding problems at your own pace.",
      icon: Code2,
      path: "/coding-interview",
    },
    {
      title: "AI Voice Interview",
      description: "Practice interviews whenever you want.",
      icon: Mic,
      path: "/interview/setup",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <section>
        <p className="text-sm font-semibold text-blue-600">
          Welcome back
        </p>

        <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
          Your PrepMentor Dashboard
        </h1>

        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Practice, prepare, improve, and get placement ready.
        </p>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Placement Stage
              </p>

              <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                Aptitude
              </p>
            </div>

            <Target className="text-blue-600" size={24} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Practice Sessions
              </p>

              <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                0
              </p>
            </div>

            <BookOpen className="text-blue-600" size={24} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Current Streak
              </p>

              <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                0 days
              </p>
            </div>

            <Flame className="text-orange-500" size={24} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Badges
              </p>

              <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                0
              </p>
            </div>

            <Trophy className="text-yellow-500" size={24} />
          </div>
        </div>

      </section>

      {/* Practice Module */}
      <section>
        <div className="flex items-end justify-between mb-4">

          <div>
            <p className="text-sm font-semibold text-blue-600">
              Always Open
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Practice Module
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Practice anything, anytime. No eligibility restrictions.
            </p>
          </div>

          <BookOpen className="text-blue-600" size={28} />

        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {practiceModules.map((module) => {
            const Icon = module.icon;

            return (
              <div
                key={module.title}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:shadow-md transition"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                  <Icon size={24} />
                </div>

                <h3 className="mt-5 text-lg font-bold text-gray-900 dark:text-white">
                  {module.title}
                </h3>

                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {module.description}
                </p>

                <button
                  type="button"
                  onClick={() => navigate(module.path)}
                  className="mt-5 flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  Start Practice
                  <ArrowRight size={16} />
                </button>
              </div>
            );
          })}

        </div>
      </section>

      {/* Placement Module */}
      <section>

        <div className="mb-4">
          <p className="text-sm font-semibold text-purple-600">
            Gated & Sequential
          </p>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Placement Module
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Pass each stage to unlock the next one.
          </p>
        </div>

        <div className="space-y-4">

          {placementStages.map((stage, index) => {
            const Icon = stage.icon;
            const isActive = stage.status === "active";

            return (
              <div
                key={stage.title}
                className={`bg-white dark:bg-gray-900 border rounded-2xl p-6 ${
                  isActive
                    ? "border-blue-300 dark:border-blue-800"
                    : "border-gray-200 dark:border-gray-800"
                }`}
              >

                <div className="flex items-start gap-5">

                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isActive
                        ? "bg-blue-100 text-blue-600 dark:bg-blue-950"
                        : "bg-gray-100 text-gray-400 dark:bg-gray-800"
                    }`}
                  >
                    <Icon size={24} />
                  </div>

                  <div className="flex-1">

                    <div className="flex items-center gap-3">

                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {index + 1}. {stage.title}
                      </h3>

                      {isActive ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          Current
                        </span>
                      ) : (
                        <Lock size={16} className="text-gray-400" />
                      )}

                    </div>

                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {stage.description}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-4">

                      {stage.levels.map((level, levelIndex) => (
                        <span
                          key={level}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                            isActive && levelIndex === 0
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-400 dark:bg-gray-800"
                          }`}
                        >
                          {level}
                        </span>
                      ))}

                    </div>

                  </div>

                  {isActive && (
                    <button
                      type="button"
                      onClick={() => navigate("/placement/aptitude")}
                      className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
                    >
                      Continue
                      <ArrowRight size={16} />
                    </button>
                  )}

                </div>

              </div>
            );
          })}

        </div>

      </section>

      {/* Daily Engagement */}
      <section>

        <div className="mb-4">
          <p className="text-sm font-semibold text-orange-600">
            Daily Engagement
          </p>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Keep Your Streak Going
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
            <Flame className="text-orange-500" size={26} />

            <h3 className="mt-4 font-bold text-gray-900 dark:text-white">
              Daily Streak
            </h3>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Practice every day and build your preparation streak.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
            <CircleHelp className="text-blue-500" size={26} />

            <h3 className="mt-4 font-bold text-gray-900 dark:text-white">
              Question of the Day
            </h3>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Challenge yourself with a new question every day.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
            <Gamepad2 className="text-purple-500" size={26} />

            <h3 className="mt-4 font-bold text-gray-900 dark:text-white">
              Coding Games
            </h3>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Improve coding skills through interactive challenges.
            </p>
          </div>

        </div>

      </section>

      {/* AI Insight */}
      <section className="bg-blue-600 rounded-2xl p-6 text-white">

        <div className="flex items-start gap-4">

          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <CheckCircle size={25} />
          </div>

          <div>
            <h2 className="text-lg font-bold">
              AI Preparation Insight
            </h2>

            <p className="mt-1 text-sm text-blue-100">
              Complete more practice sessions to let PrepMentor
              identify your strengths and weak topics.
            </p>
          </div>

        </div>

      </section>

    </div>
  );
}

export default Dashboard;
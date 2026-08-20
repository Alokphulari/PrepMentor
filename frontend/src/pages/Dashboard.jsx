import {
  ArrowRight,
  BarChart3,
  Brain,
  Calendar,
  CheckCircle2,
  Clock3,
  Code2,
  FileText,
  Flame,
  Mic,
  Target,
  TrendingUp,
} from "lucide-react";

import { Link } from "react-router-dom";

function Dashboard() {
  const stats = [
    {
      title: "Interviews Completed",
      value: "12",
      change: "+3 this month",
      icon: Mic,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Average Score",
      value: "82%",
      change: "+8% from last month",
      icon: Target,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      title: "Practice Hours",
      value: "18.5h",
      change: "+4.2h this month",
      icon: Clock3,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      title: "Current Streak",
      value: "7 days",
      change: "Personal best",
      icon: Flame,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-600",
    },
  ];

  const recentInterviews = [
    {
      role: "Frontend Developer",
      type: "Technical",
      score: 88,
      date: "Today",
      duration: "32 min",
    },
    {
      role: "Software Engineer",
      type: "Behavioral",
      score: 81,
      date: "Yesterday",
      duration: "27 min",
    },
    {
      role: "React Developer",
      type: "Technical",
      score: 76,
      date: "3 days ago",
      duration: "35 min",
    },
  ];

  const recommendations = [
    {
      title: "Practice JavaScript Fundamentals",
      description:
        "Strengthen your understanding of closures, promises, and asynchronous JavaScript.",
      icon: Code2,
      action: "Practice now",
      link: "/coding-interview",
    },
    {
      title: "Improve Behavioral Answers",
      description:
        "Practice explaining your experience using clear and structured answers.",
      icon: Brain,
      action: "Start practice",
      link: "/interview/setup",
    },
    {
      title: "Analyze Your Resume",
      description:
        "Review your resume and discover areas that could be improved.",
      icon: FileText,
      action: "View resume",
      link: "/resume",
    },
  ];

  return (
    <div className="space-y-8">

      {/* Welcome Header */}
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

        <div>
          <p className="text-sm font-medium text-blue-600">
            Thursday, August 20, 2026
          </p>

          <h1 className="mt-1 text-3xl font-bold text-gray-900">
            Welcome back, Alok! 👋
          </h1>

          <p className="mt-2 text-gray-500">
            Keep practicing. You're getting closer to interview-ready.
          </p>
        </div>

        <Link
          to="/interview/setup"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-sm"
        >
          <Mic size={18} />
          Start Interview
        </Link>

      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">

        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="bg-white border border-gray-200 rounded-2xl p-5"
            >

              <div className="flex items-start justify-between">

                <div>
                  <p className="text-sm text-gray-500">
                    {stat.title}
                  </p>

                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>

                <div
                  className={`w-11 h-11 rounded-xl ${stat.iconBg} ${stat.iconColor} flex items-center justify-center`}
                >
                  <Icon size={21} />
                </div>

              </div>

              <div className="mt-4 flex items-center gap-1.5 text-sm">

                <TrendingUp
                  size={15}
                  className="text-green-500"
                />

                <span className="text-green-600 font-medium">
                  {stat.change}
                </span>

              </div>

            </div>
          );
        })}

      </section>

      {/* Main Grid */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Performance */}
        <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl p-6">

          <div className="flex items-center justify-between">

            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Performance Overview
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Your interview scores over the last 6 sessions
              </p>
            </div>

            <Link
              to="/history"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View history
            </Link>

          </div>

          {/* Chart */}
          <div className="mt-8">

            <div className="h-64 flex items-end gap-4 sm:gap-7 border-b border-gray-200 px-2">

              {[58, 67, 63, 74, 81, 88].map((score, index) => (
                <div
                  key={index}
                  className="flex-1 h-full flex flex-col justify-end items-center gap-2"
                >

                  <span className="text-xs font-medium text-gray-500">
                    {score}%
                  </span>

                  <div
                    className="w-full max-w-12 bg-blue-500 rounded-t-lg hover:bg-blue-600 transition"
                    style={{
                      height: `${score * 0.7}%`,
                    }}
                  />

                </div>
              ))}

            </div>

            <div className="grid grid-cols-6 mt-3 text-xs text-gray-400 text-center">
              <span>Session 1</span>
              <span>Session 2</span>
              <span>Session 3</span>
              <span>Session 4</span>
              <span>Session 5</span>
              <span>Session 6</span>
            </div>

          </div>

        </div>

        {/* Weekly Goal */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
              <BarChart3 size={20} />
            </div>

            <div>
              <h2 className="font-semibold text-gray-900">
                Weekly Goal
              </h2>

              <p className="text-sm text-gray-500">
                Interview practice
              </p>
            </div>

          </div>

          <div className="mt-8 flex justify-center">

            <div className="relative w-40 h-40 rounded-full border-[14px] border-gray-100 flex items-center justify-center">

              <div className="absolute inset-[-14px] rounded-full border-[14px] border-transparent border-t-green-500 border-r-green-500 rotate-12" />

              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">
                  4/5
                </p>

                <p className="text-sm text-gray-500">
                  sessions
                </p>
              </div>

            </div>

          </div>

          <div className="mt-7">

            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">
                Progress
              </span>

              <span className="font-semibold text-gray-900">
                80%
              </span>
            </div>

            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full w-4/5 bg-green-500 rounded-full" />
            </div>

          </div>

          <p className="mt-5 text-sm text-gray-500 text-center">
            Complete one more session to reach your weekly goal.
          </p>

        </div>

      </section>

      {/* Recent Interviews */}
      <section className="bg-white border border-gray-200 rounded-2xl">

        <div className="p-6 border-b border-gray-200 flex items-center justify-between">

          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Interviews
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Your latest practice sessions
            </p>
          </div>

          <Link
            to="/history"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View all
          </Link>

        </div>

        <div className="divide-y divide-gray-100">

          {recentInterviews.map((interview) => (
            <div
              key={`${interview.role}-${interview.date}`}
              className="p-5 flex flex-col md:flex-row md:items-center gap-4"
            >

              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Mic size={20} />
              </div>

              <div className="flex-1">

                <h3 className="font-semibold text-gray-900">
                  {interview.role}
                </h3>

                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">

                  <span className="px-2 py-1 bg-gray-100 rounded-md">
                    {interview.type}
                  </span>

                  <span className="flex items-center gap-1">
                    <Calendar size={13} />
                    {interview.date}
                  </span>

                  <span className="flex items-center gap-1">
                    <Clock3 size={13} />
                    {interview.duration}
                  </span>

                </div>

              </div>

              <div className="flex items-center gap-5">

                <div className="text-right">

                  <p
                    className={`text-xl font-bold ${
                      interview.score >= 80
                        ? "text-green-600"
                        : "text-orange-500"
                    }`}
                  >
                    {interview.score}%
                  </p>

                  <p className="text-xs text-gray-400">
                    Score
                  </p>

                </div>

                <Link
                  to="/history"
                  className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <ArrowRight size={18} />
                </Link>

              </div>

            </div>
          ))}

        </div>

      </section>

      {/* Recommendations */}
      <section>

        <div className="mb-5">

          <h2 className="text-lg font-semibold text-gray-900">
            Recommended Practice
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Based on your recent performance
          </p>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {recommendations.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition"
              >

                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Icon size={21} />
                </div>

                <h3 className="mt-5 font-semibold text-gray-900">
                  {item.title}
                </h3>

                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  {item.description}
                </p>

                <Link
                  to={item.link}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  {item.action}
                  <ArrowRight size={16} />
                </Link>

              </div>
            );
          })}

        </div>

      </section>

      {/* Motivation */}
      <section className="bg-blue-600 rounded-2xl p-7 md:p-8 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-6">

        <div>

          <div className="flex items-center gap-2">
            <CheckCircle2 size={21} />
            <span className="font-semibold">
              You're making progress!
            </span>
          </div>

          <p className="mt-2 text-blue-100 max-w-xl">
            You've improved your average interview score by 8% this
            month. Keep your momentum going.
          </p>

        </div>

        <Link
          to="/interview/setup"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition shrink-0"
        >
          Practice Now
          <ArrowRight size={18} />
        </Link>

      </section>

    </div>
  );
}

export default Dashboard;
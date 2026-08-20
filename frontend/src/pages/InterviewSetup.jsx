import { useState } from "react";
import {
  ArrowRight,
  Briefcase,
  Check,
  Clock3,
  Code2,
  Mic,
  Sparkles,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function InterviewSetup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    role: "Frontend Developer",
    interviewType: "Technical",
    difficulty: "Medium",
    duration: 30,
  });

  const roles = [
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "Software Engineer",
    "Data Analyst",
    "DevOps Engineer",
  ];

  const interviewTypes = [
    {
      name: "Technical",
      description: "Technical questions and problem solving",
      icon: Code2,
    },
    {
      name: "Behavioral",
      description: "Communication and experience-based questions",
      icon: Users,
    },
    {
      name: "Mixed",
      description: "Technical and behavioral questions",
      icon: Sparkles,
    },
  ];

  const difficulties = [
    {
      name: "Easy",
      description: "Good for beginners",
    },
    {
      name: "Medium",
      description: "Balanced challenge",
    },
    {
      name: "Hard",
      description: "Advanced interview level",
    },
  ];

  const durations = [15, 30, 45, 60];

  const handleStartInterview = () => {
    const interviewConfig = {
      ...formData,
      createdAt: new Date().toISOString(),
    };

    sessionStorage.setItem(
      "interviewConfig",
      JSON.stringify(interviewConfig)
    );

    navigate("/interview");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <section className="text-center max-w-2xl mx-auto">

        <div className="mx-auto w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
          <Mic size={24} />
        </div>

        <p className="mt-5 text-sm font-semibold text-blue-600 uppercase tracking-wider">
          Mock Interview
        </p>

        <h1 className="mt-2 text-3xl md:text-4xl font-bold text-gray-900">
          Configure your interview
        </h1>

        <p className="mt-3 text-gray-500">
          Choose your role, interview style, difficulty, and duration.
          PrepMentor will use these settings to personalize your session.
        </p>

      </section>

      {/* Setup Card */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 space-y-8">

        {/* Role */}
        <div>

          <div className="flex items-center gap-2 mb-3">

            <Briefcase
              size={18}
              className="text-blue-600"
            />

            <label
              htmlFor="role"
              className="font-semibold text-gray-900"
            >
              Job Role
            </label>

          </div>

          <select
            id="role"
            value={formData.role}
            onChange={(event) =>
              setFormData((previous) => ({
                ...previous,
                role: event.target.value,
              }))
            }
            className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

        </div>

        {/* Interview Type */}
        <div>

          <div className="flex items-center gap-2 mb-4">

            <Mic
              size={18}
              className="text-blue-600"
            />

            <h2 className="font-semibold text-gray-900">
              Interview Type
            </h2>

          </div>

          <div className="grid md:grid-cols-3 gap-4">

            {interviewTypes.map((type) => {
              const Icon = type.icon;
              const selected =
                formData.interviewType === type.name;

              return (
                <button
                  key={type.name}
                  type="button"
                  onClick={() =>
                    setFormData((previous) => ({
                      ...previous,
                      interviewType: type.name,
                    }))
                  }
                  className={`relative text-left p-5 rounded-xl border-2 transition ${
                    selected
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >

                  {selected && (
                    <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <Check size={14} />
                    </span>
                  )}

                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      selected
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <Icon size={20} />
                  </div>

                  <h3 className="mt-4 font-semibold text-gray-900">
                    {type.name}
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    {type.description}
                  </p>

                </button>
              );
            })}

          </div>

        </div>

        {/* Difficulty */}
        <div>

          <h2 className="font-semibold text-gray-900 mb-4">
            Difficulty
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {difficulties.map((difficulty) => {
              const selected =
                formData.difficulty === difficulty.name;

              return (
                <button
                  key={difficulty.name}
                  type="button"
                  onClick={() =>
                    setFormData((previous) => ({
                      ...previous,
                      difficulty: difficulty.name,
                    }))
                  }
                  className={`p-4 rounded-xl border-2 text-left transition ${
                    selected
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >

                  <div className="flex items-center justify-between">

                    <span className="font-semibold text-gray-900">
                      {difficulty.name}
                    </span>

                    {selected && (
                      <Check
                        size={18}
                        className="text-blue-600"
                      />
                    )}

                  </div>

                  <p className="mt-1 text-sm text-gray-500">
                    {difficulty.description}
                  </p>

                </button>
              );
            })}

          </div>

        </div>

        {/* Duration */}
        <div>

          <div className="flex items-center gap-2 mb-4">

            <Clock3
              size={18}
              className="text-blue-600"
            />

            <h2 className="font-semibold text-gray-900">
              Interview Duration
            </h2>

          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

            {durations.map((duration) => {
              const selected =
                formData.duration === duration;

              return (
                <button
                  key={duration}
                  type="button"
                  onClick={() =>
                    setFormData((previous) => ({
                      ...previous,
                      duration,
                    }))
                  }
                  className={`py-4 rounded-xl border-2 font-semibold transition ${
                    selected
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {duration} min
                </button>
              );
            })}

          </div>

        </div>

      </section>

      {/* Summary */}
      <section className="bg-blue-50 border border-blue-100 rounded-2xl p-6">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

          <div>

            <p className="text-sm font-medium text-blue-700">
              Your interview
            </p>

            <h2 className="mt-1 text-xl font-bold text-gray-900">
              {formData.role} · {formData.interviewType}
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              {formData.difficulty} difficulty · {formData.duration} minutes
            </p>

          </div>

          <button
            type="button"
            onClick={handleStartInterview}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-sm"
          >
            Start Interview
            <ArrowRight size={18} />
          </button>

        </div>

      </section>

      {/* Information */}
      <section className="grid md:grid-cols-3 gap-4">

        <div className="bg-white border border-gray-200 rounded-xl p-5">

          <Sparkles
            size={20}
            className="text-blue-600"
          />

          <h3 className="mt-3 font-semibold">
            Personalized Questions
          </h3>

          <p className="mt-2 text-sm text-gray-500">
            Questions are tailored to your selected role and difficulty.
          </p>

        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">

          <Mic
            size={20}
            className="text-blue-600"
          />

          <h3 className="mt-3 font-semibold">
            AI Interviewer
          </h3>

          <p className="mt-2 text-sm text-gray-500">
            Practice answering questions in a realistic interview flow.
          </p>

        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">

          <Code2
            size={20}
            className="text-blue-600"
          />

          <h3 className="mt-3 font-semibold">
            Detailed Feedback
          </h3>

          <p className="mt-2 text-sm text-gray-500">
            Review your performance after completing the interview.
          </p>

        </div>

      </section>

    </div>
  );
}

export default InterviewSetup;
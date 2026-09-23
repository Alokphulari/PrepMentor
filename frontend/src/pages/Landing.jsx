import {
  ArrowRight,
  BrainCircuit,
  BookOpen,
  Target,
  Mic,
  FileText,
  BarChart3,
  Code2,
  CheckCircle2,
} from "lucide-react";

import { Link } from "react-router-dom";

function Landing() {
  const features = [
    {
      icon: BrainCircuit,
      title: "Aptitude Preparation",
      description:
        "Build quantitative, logical reasoning, and verbal skills for placement assessments.",
    },
    {
      icon: Mic,
      title: "AI Mock Interviews",
      description:
        "Practice realistic interviews with an AI interviewer and receive personalized feedback.",
    },
    {
      icon: FileText,
      title: "Resume Analysis",
      description:
        "Review your resume, identify your skills, and tailor your preparation to your target role.",
    },
    {
      icon: Code2,
      title: "Coding Practice",
      description:
        "Solve technical coding questions and improve your problem-solving skills.",
    },
    {
      icon: BarChart3,
      title: "Performance Tracking",
      description:
        "Track your aptitude, coding, and interview performance as you prepare for placements.",
    },
    {
      icon: BookOpen,
      title: "Personalized Learning Hub",
      description:
        "Strengthen weak topics with learning resources and practice tasks before your next attempt.",
    },
  ];

  const steps = [
    {
      number: "01",
      title: "Set Your Goal",
      description:
        "Build your profile, choose your target role, and add your resume to personalize preparation.",
    },
    {
      number: "02",
      title: "Practice Core Skills",
      description:
        "Develop your aptitude and coding skills through focused practice at your level.",
    },
    {
      number: "03",
      title: "Take Placement Rounds",
      description:
        "Progress through aptitude, coding, and AI interview rounds in the Placement module.",
    },
    {
      number: "04",
      title: "Learn and Improve",
      description:
        "Review your results, work on weak areas in the Learning Hub, and track your progress.",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* Navbar */}
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                P
              </span>
            </div>

            <span className="text-xl font-bold">
              PrepMentor
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#features" className="hover:text-blue-600 transition">
              Features
            </a>

            <a href="#how-it-works" className="hover:text-blue-600 transition">
              How It Works
            </a>

            <a href="#why-prepmentor" className="hover:text-blue-600 transition">
              Why PrepMentor
            </a>
          </nav>

          {/* Auth */}
          <div className="flex items-center gap-3">

            <Link
              to="/login"
              className="hidden sm:block px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600"
            >
              Login
            </Link>

            <Link
              to="/register"
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              Get Started
            </Link>

          </div>

        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">

        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">

          <div className="max-w-4xl mx-auto text-center">

            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-blue-600 rounded-full" />
              Complete Placement Preparation
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
              Practice Smarter.
              <br />
              <span className="text-blue-600">
                Get Placement Ready.
              </span>
            </h1>

            <p className="mt-6 text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Prepare for every stage of placement with aptitude practice,
              coding challenges, AI mock interviews, resume analysis, and
              personalized learning?all in one place.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">

              <Link
                to="/register"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
              >
                Start Practicing
                <ArrowRight size={18} />
              </Link>

              <Link
                to="/login"
                className="w-full sm:w-auto px-7 py-3.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
              >
                I Already Have an Account
              </Link>

            </div>

          </div>

        </div>

      </section>

      {/* Features */}
      <section
        id="features"
        className="py-20 md:py-28 bg-gray-50"
      >

        <div className="max-w-7xl mx-auto px-6">

          <div className="max-w-2xl mx-auto text-center">

            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
              Everything You Need
            </p>

            <h2 className="mt-3 text-3xl md:text-4xl font-bold">
              One platform for complete placement preparation
            </h2>

            <p className="mt-4 text-gray-600">
              Build your skills across every placement round and use
              your results to guide what you learn next.
            </p>

          </div>

          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">

            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-lg hover:-translate-y-1 transition"
                >

                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Icon size={24} />
                  </div>

                  <h3 className="mt-5 text-lg font-semibold">
                    {feature.title}
                  </h3>

                  <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>

                </div>
              );
            })}

          </div>

        </div>

      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="py-20 md:py-28"
      >

        <div className="max-w-7xl mx-auto px-6">

          <div className="text-center max-w-2xl mx-auto">

            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
              Simple Process
            </p>

            <h2 className="mt-3 text-3xl md:text-4xl font-bold">
              From preparation to confidence
            </h2>

          </div>

          <div className="mt-14 grid md:grid-cols-4 gap-8">

            {steps.map((step) => (
              <div key={step.number} className="relative">

                <p className="text-5xl font-bold text-blue-100">
                  {step.number}
                </p>

                <h3 className="mt-2 text-lg font-semibold">
                  {step.title}
                </h3>

                <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                  {step.description}
                </p>

              </div>
            ))}

          </div>

        </div>

      </section>

      {/* Why PrepMentor */}
      <section
        id="why-prepmentor"
        className="py-20 md:py-28 bg-gray-50"
      >

        <div className="max-w-7xl mx-auto px-6">

          <div className="grid md:grid-cols-2 gap-12 items-center">

            <div>

              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
                Why PrepMentor?
              </p>

              <h2 className="mt-3 text-3xl md:text-4xl font-bold">
                Preparation that adapts to you
              </h2>

              <p className="mt-5 text-gray-600 leading-relaxed">
                PrepMentor brings aptitude, coding, interviews, and learning
                together so you can build the skills that matter for your
                target role and prepare for each placement round.
              </p>

              <div className="mt-8 space-y-4">

                {[
                  "Aptitude and coding skill development",
                  "Sequential placement assessments",
                  "AI mock interviews with voice practice",
                  "Resume analysis and personalized learning",
                  "Progress and performance across modules",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle2
                      size={20}
                      className="text-green-500 shrink-0"
                    />

                    <span className="text-gray-700">
                      {item}
                    </span>
                  </div>
                ))}

              </div>

            </div>

            <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-xl">

              <div className="text-center">

                <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
                  <Target size={30} />
                </div>

                <h3 className="mt-6 text-2xl font-bold">
                  Ready for your placement journey?
                </h3>

                <p className="mt-3 text-gray-600">
                  Start practicing today and turn your weaknesses into
                  strengths.
                </p>

                <Link
                  to="/register"
                  className="mt-7 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition"
                >
                  Start Free Practice
                  <ArrowRight size={18} />
                </Link>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200">

        <div className="max-w-7xl mx-auto px-6 py-8">

          <div className="flex flex-col md:flex-row items-center justify-between gap-4">

            <div className="flex items-center gap-2">

              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold">
                  P
                </span>
              </div>

              <span className="font-semibold">
                PrepMentor
              </span>

            </div>

            <p className="text-sm text-gray-500">
              © 2026 PrepMentor. Complete placement preparation.
            </p>

          </div>

        </div>

      </footer>

    </div>
  );
}

export default Landing;
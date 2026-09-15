import { Link } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

function AuthLayout({ children, title, subtitle }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="auth-shell flex min-h-screen bg-gray-50 transition-colors dark:bg-gray-950">

      <button type="button" onClick={toggleTheme} className="fixed right-5 top-5 z-20 rounded-xl border border-gray-200 bg-white/90 p-2.5 text-gray-600 shadow-sm backdrop-blur hover:text-indigo-600 dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-300" aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}>
        {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
      </button>

      {/* Left Side */}
      <div className="relative hidden overflow-hidden bg-[#171a2b] p-12 text-white lg:flex lg:w-1/2 lg:flex-col lg:justify-between">

        <div className="pointer-events-none absolute -right-32 top-1/4 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl" />

        <Link to="/" className="flex items-center gap-2 w-fit">
          <div className="w-10 h-10 rounded-xl bg-white text-blue-600 flex items-center justify-center font-bold text-xl">
            P
          </div>

          <span className="text-2xl font-bold">
            PrepMentor
          </span>
        </Link>

        <div className="max-w-lg">

          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-300">
            Deliberate interview preparation
          </p>

          <h1 className="mt-4 text-4xl xl:text-5xl font-bold leading-tight">
            Prepare with confidence.
            <br />
            Perform at your best.
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-slate-300">
            Practice interviews, improve your technical skills, analyze
            your resume, and track your progress with PrepMentor.
          </p>

        </div>

        <p className="text-sm text-slate-400">
          © 2026 PrepMentor
        </p>

      </div>

      {/* Right Side */}
      <div className="flex-1 flex items-center justify-center p-6">

        <div className="w-full max-w-md">

          {/* Mobile Logo */}
          <Link
            to="/"
            className="lg:hidden flex items-center justify-center gap-2 mb-10"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              P
            </div>

            <span className="text-xl font-bold text-gray-900 dark:text-white">
              PrepMentor
            </span>
          </Link>

          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-xl shadow-gray-900/5 dark:border-gray-800 dark:bg-gray-900 dark:shadow-black/20">

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {title}
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              {subtitle}
            </p>

            <div className="mt-8">
              {children}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default AuthLayout;

import { Link } from "react-router-dom";

function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Left Side */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-600 text-white p-12 flex-col justify-between">

        <Link to="/" className="flex items-center gap-2 w-fit">
          <div className="w-10 h-10 rounded-xl bg-white text-blue-600 flex items-center justify-center font-bold text-xl">
            P
          </div>

          <span className="text-2xl font-bold">
            PrepMentor
          </span>
        </Link>

        <div className="max-w-lg">

          <p className="text-blue-100 text-sm font-semibold uppercase tracking-wider">
            AI-Powered Interview Preparation
          </p>

          <h1 className="mt-4 text-4xl xl:text-5xl font-bold leading-tight">
            Prepare with confidence.
            <br />
            Perform at your best.
          </h1>

          <p className="mt-6 text-blue-100 text-lg leading-relaxed">
            Practice interviews, improve your technical skills, analyze
            your resume, and track your progress with PrepMentor.
          </p>

        </div>

        <p className="text-sm text-blue-200">
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

            <span className="text-xl font-bold text-gray-900">
              PrepMentor
            </span>
          </Link>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">

            <h2 className="text-2xl font-bold text-gray-900">
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
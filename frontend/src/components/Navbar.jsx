import {
  Bell,
  ChevronDown,
  Moon,
  Sun,
} from "lucide-react";

import { useTheme } from "../context/ThemeContext";

function Navbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 sticky top-0 z-50 transition-colors">

      {/* Logo */}
      <div className="flex items-center gap-2">

        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
          <span className="text-white font-bold text-lg">
            P
          </span>
        </div>

        <span className="text-xl font-bold text-gray-900 dark:text-white">
          PrepMentor
        </span>

      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          aria-label={
            theme === "light"
              ? "Switch to dark mode"
              : "Switch to light mode"
          }
          title={
            theme === "light"
              ? "Switch to dark mode"
              : "Switch to light mode"
          }
        >
          {theme === "light" ? (
            <Moon size={20} />
          ) : (
            <Sun size={20} />
          )}
        </button>

        {/* Notification */}
        <button
          type="button"
          className="relative p-2.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          aria-label="Notifications"
        >
          <Bell size={21} />

          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Profile */}
        <button
          type="button"
          className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-2 py-1.5 transition"
        >

          <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 flex items-center justify-center font-semibold">
            A
          </div>

          <div className="hidden sm:block text-left">

            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Alok
            </p>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Student
            </p>

          </div>

          <ChevronDown
            size={17}
            className="text-gray-500 dark:text-gray-400 hidden sm:block"
          />

        </button>

      </div>
    </header>
  );
}

export default Navbar;
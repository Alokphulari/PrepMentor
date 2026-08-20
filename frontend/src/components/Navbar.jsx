import { Bell, ChevronDown } from "lucide-react";

function Navbar() {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-50">
      
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
          <span className="text-white font-bold text-lg">
            P
          </span>
        </div>

        <span className="text-xl font-bold text-gray-900">
          PrepMentor
        </span>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-5">

        {/* Notification */}
        <button
          type="button"
          className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
          aria-label="Notifications"
        >
          <Bell size={21} />

          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Profile */}
        <button
          type="button"
          className="flex items-center gap-3 hover:bg-gray-50 rounded-lg px-2 py-1.5 transition"
        >
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">
            A
          </div>

          <div className="hidden sm:block text-left">
            <p className="text-sm font-semibold text-gray-900">
              Alok
            </p>

            <p className="text-xs text-gray-500">
              Student
            </p>
          </div>

          <ChevronDown
            size={17}
            className="text-gray-500 hidden sm:block"
          />
        </button>

      </div>
    </header>
  );
}

export default Navbar;
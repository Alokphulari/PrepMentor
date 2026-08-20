import {
  LayoutDashboard,
  FileText,
  Mic,
  Code2,
  BarChart3,
  History,
  User,
} from "lucide-react";

import { NavLink } from "react-router-dom";

function Sidebar() {
  const mainLinks = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Resume",
      path: "/resume",
      icon: FileText,
    },
    {
      name: "Interviews",
      path: "/interview/setup",
      icon: Mic,
    },
    {
      name: "Coding Practice",
      path: "/coding-interview",
      icon: Code2,
    },
    {
      name: "Performance",
      path: "/history",
      icon: BarChart3,
    },
    {
      name: "History",
      path: "/history",
      icon: History,
    },
  ];

  const bottomLinks = [
    {
      name: "Profile",
      path: "/profile",
      icon: User,
    },
  ];

  return (
    <aside className="w-64 min-h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-colors">

      {/* Main Navigation */}
      <div className="flex-1 p-4">

        <p className="px-3 mb-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          Main Menu
        </p>

        <nav className="space-y-1">

          {mainLinks.map((link) => {
            const Icon = link.icon;

            return (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                  }`
                }
              >
                <Icon size={20} strokeWidth={1.8} />

                <span>{link.name}</span>
              </NavLink>
            );
          })}

        </nav>
      </div>

      {/* Bottom Navigation */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">

        <nav className="space-y-1">

          {bottomLinks.map((link) => {
            const Icon = link.icon;

            return (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                  }`
                }
              >
                <Icon size={20} strokeWidth={1.8} />

                <span>{link.name}</span>
              </NavLink>
            );
          })}

        </nav>

        {/* Version */}
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-4">
          PrepMentor v1.0
        </p>

      </div>

    </aside>
  );
}

export default Sidebar;
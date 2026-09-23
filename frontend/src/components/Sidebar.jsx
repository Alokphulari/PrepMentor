import {
  LayoutDashboard,
  BarChart3,
  BookOpen,
  History,
  User,
  Target,
  BrainCircuit,
  CalendarCheck2,
  Gamepad2,
  Mic2,
  X,
} from "lucide-react";

import { NavLink, useLocation } from "react-router-dom";

function Sidebar({ open, onClose }) {
  const { pathname } = useLocation();
  const mainLinks = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Practice",
      path: "/practice",
      icon: BrainCircuit,
    },
    {
      name: "Interview Practice",
      path: "/interview/setup",
      icon: Mic2,
      activePrefix: "/interview",
    },
    {
      name: "Placement",
      path: "/placement",
      icon: Target,
    },
    {
      name: "Performance",
      path: "/performance",
      icon: BarChart3,
    },
    {
      name: "Learning Hub",
      path: "/learning",
      icon: BookOpen,
    },
    {
      name: "History",
      path: "/history",
      icon: History,
    },
    {
      name: "Question of the Day",
      path: "/question-of-the-day",
      icon: CalendarCheck2,
    },
    {
      name: "Games",
      path: "/games",
      icon: Gamepad2,
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
    <>
    {open && (
      <button data-print-hide type="button" onClick={onClose} aria-label="Close navigation" className="fixed inset-0 z-40 bg-gray-950/45 backdrop-blur-sm lg:hidden" />
    )}
    <aside id="app-navigation" data-print-hide aria-label="Primary navigation" className={`fixed bottom-0 left-0 top-0 z-50 flex w-[280px] flex-col border-r border-gray-200 bg-white shadow-2xl transition-[transform,visibility] duration-300 dark:border-gray-800 dark:bg-gray-950 lg:visible lg:sticky lg:top-[72px] lg:z-30 lg:h-[calc(100vh-72px)] lg:w-64 lg:translate-x-0 lg:shadow-none ${open ? "visible translate-x-0" : "invisible -translate-x-full"}`}>

      <div className="flex items-center justify-between px-5 pt-5 lg:hidden">
        <span className="font-extrabold tracking-tight">PrepMentor</span>
        <button type="button" onClick={onClose} aria-label="Close navigation" className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={20} /></button>
      </div>

      {/* Main Navigation */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">

        <p className="px-3 mb-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          Main Menu
        </p>

        <nav className="space-y-1">

          {mainLinks.map((link) => {
            const Icon = link.icon;
            const sectionActive = link.activePrefix
              ? pathname.startsWith(link.activePrefix)
              : pathname === link.path || pathname.startsWith(`${link.path}/`);

            return (
              <NavLink
                key={link.path}
                to={link.path}
                onClick={onClose}
                aria-current={sectionActive ? "page" : undefined}
                className={`group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200 ${sectionActive
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/20"
                  : "text-gray-600 hover:translate-x-0.5 hover:bg-indigo-50 hover:text-indigo-700 dark:text-gray-300 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300"
                }`}
              >
                <span className={`absolute inset-y-2 left-0 w-1 rounded-r-full ${sectionActive ? "bg-white" : "bg-transparent group-hover:bg-indigo-400"}`} />
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${sectionActive ? "bg-white/15" : "bg-gray-100 group-hover:bg-white dark:bg-gray-800 dark:group-hover:bg-gray-900"}`}><Icon size={18} strokeWidth={2} /></span>

                <span className="flex-1">{link.name}</span>
                {sectionActive && <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_0_4px_rgba(110,231,183,0.16)]" aria-hidden="true" />}
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
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/20"
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
    </>
  );
}

export default Sidebar;

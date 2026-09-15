import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import CareerRoadmapNotice from "./CareerRoadmapNotice";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

function getRouteTitle(pathname) {
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname === "/profile" || pathname === "/complete-profile") return "Profile";
  if (pathname === "/resume") return "Resume Studio";
  if (pathname === "/practice") return "Practice Mode";
  if (pathname.startsWith("/practice/aptitude")) return "Aptitude Practice";
  if (pathname === "/learning") return "Learning Hub";
  if (pathname.startsWith("/placement")) return "Placement Journey";
  if (pathname === "/coding-interview") return "Coding Practice";
  if (pathname.startsWith("/interview/result")) return "Interview Result";
  if (pathname.startsWith("/interview")) return "Mock Interview";
  if (pathname === "/performance") return "Performance";
  if (pathname === "/history") return "History";
  if (pathname === "/achievements") return "Badges & Achievements";
  if (pathname === "/question-of-the-day") return "Question of the Day";
  if (pathname === "/games") return "Games";
  return "Workspace";
}

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const routeTitle = getRouteTitle(location.pathname);

  useEffect(() => {
    document.title = `${routeTitle} | PrepMentor`;
    const focusTimer = window.setTimeout(() => {
      document.getElementById("main-content")?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "auto" });
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, [location.pathname, routeTitle]);

  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [sidebarOpen]);

  return (
    <div className="app-shell min-h-screen text-gray-900 transition-colors dark:text-white">
      <a href="#main-content" className="fixed left-4 top-3 z-[120] -translate-y-20 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-xl transition-transform focus:translate-y-0">Skip to main content</a>
      <p className="sr-only" aria-live="polite" aria-atomic="true">{routeTitle} page</p>
      <Navbar sidebarOpen={sidebarOpen} onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main id="main-content" tabIndex={-1} className="app-main min-w-0 flex-1 px-4 py-5 outline-none sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          <div key={location.pathname} className="page-enter mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
        <CareerRoadmapNotice />
      </div>
    </div>
  );
}

export default Layout;

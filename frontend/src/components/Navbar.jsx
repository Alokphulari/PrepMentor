import {
  Bell,
  Award,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  FileText,
  LogOut,
  Menu,
  Moon,
  Sun,
  Target,
  User,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { usePlacement } from "../context/PlacementContext";
import { getHistory, HISTORY_UPDATED_EVENT } from "../services/history";
import { getAccountStorageKey, readStorage, writeStorage } from "../utils/storage";
import { getAchievementProgress } from "../utils/achievements";

const NOTIFICATION_KEY = "prepmentor_notifications_seen";

function Navbar({ onMenuClick, sidebarOpen }) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { placementState } = usePlacement();
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const notificationRef = useRef(null);
  const profileTriggerRef = useRef(null);
  const notificationTriggerRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [history, setHistory] = useState(getHistory);
  const displayName = user?.name || user?.fullName || "Student";
  const role = user?.targetRole || user?.careerInterests || "Student";
  const initial = displayName.charAt(0).toUpperCase();
  const notificationStorageKey = getAccountStorageKey(NOTIFICATION_KEY, user);
  const notifications = useMemo(() => {
    const stages = [
      ["Aptitude Easy", placementState.aptitude.easy, "/placement/aptitude"],
      ["Aptitude Medium", placementState.aptitude.medium, "/placement/aptitude"],
      ["Aptitude Hard", placementState.aptitude.hard, "/placement/aptitude"],
      ["Coding Easy", placementState.coding.easy, "/placement/coding"],
      ["Coding Medium", placementState.coding.medium, "/placement/coding"],
      ["Coding Hard", placementState.coding.hard, "/placement/coding"],
      ["Mock Interview", placementState.interview.status, "/interview/setup"],
    ];
    const current = stages.find(([, status]) => status === "available" || status === "failed");
    const items = [];
    if (current) {
      items.push({ id: `placement-${current[0]}-${current[1]}`, icon: Target, title: current[1] === "failed" ? `${current[0]} needs review` : `${current[0]} is ready`, detail: current[1] === "failed" ? "Open your learning recommendations before retrying." : "Continue your sequential Placement journey.", path: current[1] === "failed" ? "/learning" : current[2], tone: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40" });
    }
    const latestBadge = getAchievementProgress(history, placementState).achievements.filter((badge) => badge.earned).at(-1);
    if (latestBadge) {
      items.push({ id: `achievement-${latestBadge.id}`, icon: Award, title: `${latestBadge.title} badge unlocked`, detail: "View your complete achievement collection.", path: "/achievements", tone: "text-amber-600 bg-amber-50 dark:bg-amber-950/40" });
    }
    history.slice(0, 2).forEach((attempt) => items.push({ id: `attempt-${attempt.id}`, icon: CheckCircle2, title: `${attempt.score}% · ${attempt.title}`, detail: "Your latest result was saved to performance history.", path: "/history", tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" }));
    if (!user?.profileCompleted) {
      items.push({ id: "profile-incomplete", icon: User, title: "Complete your profile", detail: "Add your goals and education to personalize PrepMentor.", path: "/complete-profile", tone: "text-amber-600 bg-amber-50 dark:bg-amber-950/40" });
    }
    return items.slice(0, 4);
  }, [history, placementState, user?.profileCompleted]);
  const notificationSignature = notifications.map((item) => item.id).join("|");
  const hasUnread = Boolean(notifications.length && readStorage(notificationStorageKey, "") !== notificationSignature);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!profileOpen && !notificationOpen) return undefined;
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (notificationOpen) {
        setNotificationOpen(false);
        notificationTriggerRef.current?.focus();
      } else {
        setProfileOpen(false);
        profileTriggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [notificationOpen, profileOpen]);

  useEffect(() => {
    const refresh = () => setHistory(getHistory());
    window.addEventListener(HISTORY_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(HISTORY_UPDATED_EVENT, refresh);
  }, []);

  const toggleNotifications = () => {
    const opening = !notificationOpen;
    setNotificationOpen(opening);
    setProfileOpen(false);
    if (opening) writeStorage(notificationStorageKey, notificationSignature);
  };

  const goTo = (path) => {
    setNotificationOpen(false);
    setProfileOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setNotificationOpen(false);
    setProfileOpen(false);
    logout();
    navigate("/login");
  };

  return (
    <header data-print-hide className="sticky top-0 z-50 flex h-[72px] items-center justify-between border-b border-gray-200/80 bg-white/85 px-4 backdrop-blur-xl transition-colors dark:border-gray-800 dark:bg-gray-950/82 sm:px-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onMenuClick} className="rounded-xl p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 lg:hidden" aria-label="Open navigation" aria-controls="app-navigation" aria-expanded={sidebarOpen}>
          <Menu size={22} />
        </button>
        <button type="button" onClick={() => navigate("/dashboard")} className="flex items-center gap-3 rounded-xl text-left">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-lg font-black text-white shadow-lg shadow-indigo-600/20">
            P
          </div>
          <div className="hidden sm:block">
            <span className="block text-[17px] font-extrabold tracking-tight text-gray-950 dark:text-white">PrepMentor</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Career workspace</span>
          </div>
        </button>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <button type="button" onClick={toggleTheme} className="rounded-xl p-2.5 text-gray-600 transition hover:bg-gray-100 hover:text-indigo-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-indigo-300" aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}>
          {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
        </button>
        <div ref={notificationRef} className="relative"><button ref={notificationTriggerRef} type="button" onClick={toggleNotifications} className="relative rounded-xl p-2.5 text-gray-600 transition hover:bg-gray-100 hover:text-indigo-600 dark:text-gray-300 dark:hover:bg-gray-800" aria-label="Notifications" aria-haspopup="true" aria-controls="notification-panel" aria-expanded={notificationOpen}>
          <Bell size={19} />
          {hasUnread && <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-rose-500 dark:border-gray-950" />}
        </button>{notificationOpen && <div id="notification-panel" aria-label="Notifications" className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-900/10 dark:border-gray-700 dark:bg-gray-900"><div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800"><p className="text-sm font-extrabold">Updates</p><p className="mt-0.5 text-xs text-gray-400">Your next actions and recent results</p></div>{notifications.length ? <div className="p-2">{notifications.map(({ id, icon: Icon, title, detail, path, tone })=><button key={id} type="button" onClick={()=>goTo(path)} className="flex w-full gap-3 rounded-xl p-3 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={18}/></span><span><span className="block text-sm font-bold">{title}</span><span className="mt-1 block text-xs leading-5 text-gray-500 dark:text-gray-400">{detail}</span></span></button>)}</div> : <div className="px-5 py-8 text-center"><Bell className="mx-auto text-gray-300" size={24}/><p className="mt-3 text-sm font-bold">You’re all caught up</p></div>}</div>}</div>

        <div ref={menuRef} className="relative ml-1">
          <button ref={profileTriggerRef} type="button" onClick={() => { setProfileOpen((open) => !open); setNotificationOpen(false); }} className="flex items-center gap-2.5 rounded-xl border border-transparent px-1.5 py-1 transition hover:border-gray-200 hover:bg-white dark:hover:border-gray-700 dark:hover:bg-gray-900" aria-haspopup="menu" aria-controls="profile-menu" aria-expanded={profileOpen}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-teal-100 text-sm font-bold text-indigo-700 dark:from-indigo-950 dark:to-teal-950 dark:text-indigo-200">{initial}</div>
            <div className="hidden text-left md:block">
              <p className="max-w-32 truncate text-sm font-semibold text-gray-900 dark:text-white">{displayName}</p>
              <p className="max-w-32 truncate text-xs text-gray-500 dark:text-gray-400">{role}</p>
            </div>
            <ChevronDown size={15} className={`hidden text-gray-400 transition-transform md:block ${profileOpen ? "rotate-180" : ""}`} />
          </button>

          {profileOpen && (
            <div id="profile-menu" role="menu" className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-gray-200 bg-white p-2 shadow-xl shadow-gray-900/10 dark:border-gray-700 dark:bg-gray-900">
              <button role="menuitem" type="button" onClick={() => goTo("/profile")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"><User size={17} /> Profile</button>
              <button role="menuitem" type="button" onClick={() => goTo("/resume")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"><FileText size={17} /> Resume studio</button>
              <button role="menuitem" type="button" onClick={() => goTo("/practice")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"><BrainCircuit size={17} /> Practice mode</button>
              <button role="menuitem" type="button" onClick={() => goTo("/achievements")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"><Award size={17} /> Badges & achievements</button>
              <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
              <button role="menuitem" type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"><LogOut size={17} /> Log out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;

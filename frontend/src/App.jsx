import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Public pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";

const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));
const Dashboard = lazy(() => import("./pages/DashboardHome"));
const Profile = lazy(() => import("./pages/Profile"));
const Resume = lazy(() => import("./pages/ResumeBuilder"));
const AptitudePractice = lazy(() => import("./pages/AptitudePracticeHome"));
const AptitudeQuiz = lazy(() => import("./pages/AptitudePracticeSession"));
const LearningHub = lazy(() => import("./pages/LearningWorkspace"));
const PracticeHub = lazy(() => import("./pages/PracticeHub"));
const QuestionOfTheDay = lazy(() => import("./pages/QuestionOfTheDay"));
const Games = lazy(() => import("./pages/Games"));
const Placement = lazy(() => import("./pages/Placement"));
const PlacementAptitude = lazy(() => import("./pages/PlacementAptitude"));
const PlacementCoding = lazy(() => import("./pages/PlacementCoding"));
const InterviewSetup = lazy(() => import("./pages/InterviewSetupWorkspace"));
const Interview = lazy(() => import("./pages/Interview"));
const InterviewResult = lazy(() => import("./pages/InterviewResult"));
const CodingInterview = lazy(() => import("./pages/CodingWorkspace"));
const History = lazy(() => import("./pages/History"));
const Performance = lazy(() => import("./pages/Performance"));
const Achievements = lazy(() => import("./pages/Achievements"));

// 404
import NotFound from "./pages/NotFound";

// Layout
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import GuestRoute from "./components/GuestRoute";

function RouteLoader() {
  return <div className="flex min-h-72 items-center justify-center" role="status" aria-label="Loading page"><div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 dark:border-indigo-950 dark:border-t-indigo-400" /></div>;
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoader />}>
      <Routes>

        {/* ================================
            PUBLIC ROUTES
        ================================= */}

        <Route
          path="/"
          element={<Landing />}
        />

        <Route
          path="/login"
          element={<GuestRoute><Login /></GuestRoute>}
        />

        <Route
          path="/register"
          element={<GuestRoute><Register /></GuestRoute>}
        />


        {/* ================================
            APPLICATION ROUTES
        ================================= */}

        <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>

          {/* Dashboard */}
          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          {/* Profile / Onboarding */}
          <Route
            path="/complete-profile"
            element={<CompleteProfile />}
          />

          <Route
            path="/profile"
            element={<Profile />}
          />

          <Route
            path="/resume"
            element={<Resume />}
          />


          {/* ================================
              PRACTICE MODULE
          ================================= */}

          <Route
            path="/practice"
            element={<PracticeHub />}
          />

          <Route
            path="/practice/aptitude"
            element={<AptitudePractice />}
          />

          <Route
            path="/practice/aptitude/quiz"
            element={<AptitudeQuiz />}
          />

          <Route
            path="/learning"
            element={<LearningHub />}
          />

          <Route
            path="/question-of-the-day"
            element={<QuestionOfTheDay />}
          />

          <Route
            path="/games"
            element={<Games />}
          />


          {/* ================================
              PLACEMENT MODULE
          ================================= */}

          <Route
            path="/placement"
            element={<Placement />}
          />

          {/* Easy / Medium / Hard */}
          <Route
            path="/placement/aptitude/:level"
            element={<PlacementAptitude />}
          />

          {/* Fallback for old links */}
          <Route
            path="/placement/aptitude"
            element={<PlacementAptitude />}
          />

          <Route
            path="/placement/coding"
            element={<PlacementCoding />}
          />


          {/* ================================
              CODING
          ================================= */}

          <Route
            path="/coding-interview"
            element={<CodingInterview />}
          />


          {/* ================================
              INTERVIEW
          ================================= */}

          <Route
            path="/interview/setup"
            element={<InterviewSetup />}
          />

          <Route
            path="/interview"
            element={<Interview />}
          />

          <Route
            path="/interview/result/:id"
            element={<InterviewResult />}
          />


          {/* ================================
              HISTORY
          ================================= */}

          <Route
            path="/performance"
            element={<Performance />}
          />

          <Route
            path="/history"
            element={<History />}
          />

          <Route
            path="/achievements"
            element={<Achievements />}
          />

        </Route>
        </Route>


        {/* ================================
            404
        ================================= */}

        <Route
          path="*"
          element={<NotFound />}
        />

      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;

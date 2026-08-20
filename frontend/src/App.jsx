import { BrowserRouter, Routes, Route } from "react-router-dom";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";

import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Resume from "./pages/Resume";
import InterviewSetup from "./pages/InterviewSetup";
import Interview from "./pages/Interview";
import CodingInterview from "./pages/CodingInterview";
import InterviewResult from "./pages/InterviewResult";
import History from "./pages/History";
import NotFound from "./pages/NotFound";

import Layout from "./components/Layout";

function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* Public Pages */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Application Pages */}
        <Route element={<Layout />}>

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/resume" element={<Resume />} />
          <Route path="/interview/setup" element={<InterviewSetup />} />
          <Route path="/interview" element={<Interview />} />
          <Route
            path="/coding-interview"
            element={<CodingInterview />}
          />
          <Route
            path="/interview/result/:id"
            element={<InterviewResult />}
          />
          <Route path="/history" element={<History />} />

        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />

      </Routes>

    </BrowserRouter>
  );
}

export default App;
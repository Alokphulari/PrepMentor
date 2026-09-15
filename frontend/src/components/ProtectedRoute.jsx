import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "./Loader";

function ProtectedRoute() {
  const { isAuthenticated, authReady, user } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return <Loader fullScreen label="Checking your session" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />;
  }

  if (!user?.profileCompleted && location.pathname !== "/complete-profile") {
    return <Navigate to="/complete-profile" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;

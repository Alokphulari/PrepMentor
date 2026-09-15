import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "./Loader";

function GuestRoute({ children }) {
  const { isAuthenticated, authReady, user } = useAuth();
  if (!authReady) {
    return <Loader fullScreen label="Checking your session" />;
  }
  return isAuthenticated
    ? <Navigate to={user?.profileCompleted ? "/dashboard" : "/complete-profile"} replace />
    : children;
}

export default GuestRoute;

import { useAuth } from "../context/AuthContext";
import { PlacementProvider } from "../context/PlacementContext";

function PlacementSession({ children }) {
  const { user } = useAuth();
  return (
    <PlacementProvider key={user?.id || user?.email || "guest"}>
      {children}
    </PlacementProvider>
  );
}

export default PlacementSession;

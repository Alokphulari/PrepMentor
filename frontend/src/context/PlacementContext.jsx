/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { getAccountStorageKey, readStorage, writeStorage } from "../utils/storage";
import { useAuth } from "./AuthContext";
import { hasRemoteApi } from "../services/api";
import { getRemotePlacementState, saveRemotePlacementState } from "../services/placementService";
import { normalizePlacementState, retryFailedPlacementLevel } from "../utils/placementProgress";

const PlacementContext = createContext(null);
const PLACEMENT_KEY = "prepmentor-placement-state";

/*
 * ----------------------------------------
 * HELPER
 * ----------------------------------------
 */

function loadPlacementState(storageKey) {
  return normalizePlacementState(readStorage(storageKey, null));
}

function PlacementProvider({ children }) {
  const { authReady, isAuthenticated, user } = useAuth();
  const storageKey = getAccountStorageKey(PLACEMENT_KEY, user);

  return (
    <PlacementStateProvider
      key={storageKey}
      authReady={authReady}
      isAuthenticated={isAuthenticated}
      storageKey={storageKey}
    >
      {children}
    </PlacementStateProvider>
  );
}

function PlacementStateProvider({ children, authReady, isAuthenticated, storageKey }) {
  const [placementState, setPlacementState] = useState(
    () => loadPlacementState(storageKey)
  );
  const [remoteReady, setRemoteReady] = useState(!hasRemoteApi);

  useEffect(() => {
    if (!hasRemoteApi || !authReady || !isAuthenticated) return;
    let active = true;
    getRemotePlacementState()
      .then((savedState) => {
        if (active && savedState) {
          setPlacementState(normalizePlacementState(savedState));
        }
      })
      .catch((error) => {
        console.error("Unable to load remote Placement progress:", error);
      })
      .finally(() => {
        if (active) setRemoteReady(true);
      });
    return () => {
      active = false;
    };
  }, [authReady, isAuthenticated]);

  /*
   * ----------------------------------------
   * SAVE STATE
   * ----------------------------------------
   */

  useEffect(() => {
    writeStorage(storageKey, placementState);
    if (hasRemoteApi && remoteReady && isAuthenticated) {
      saveRemotePlacementState(placementState).catch((error) =>
        console.error("Unable to sync Placement progress:", error)
      );
    }
  }, [isAuthenticated, placementState, remoteReady, storageKey]);

  /*
   * ========================================
   * APTITUDE
   * ========================================
   */

  const passAptitudeEasy = () => {
    setPlacementState((previous) => ({
      ...previous,

      aptitude: {
        ...previous.aptitude,

        easy: "passed",
        medium: "available",
      },
    }));
  };

  const passAptitudeMedium = () => {
    setPlacementState((previous) => ({
      ...previous,

      aptitude: {
        ...previous.aptitude,

        medium: "passed",
        hard: "available",
      },
    }));
  };

  const passAptitudeHard = () => {
    setPlacementState((previous) => ({
      ...previous,

      aptitude: {
        ...previous.aptitude,

        hard: "passed",
      },

      coding: {
        ...previous.coding,

        easy: "available",
      },
    }));
  };

  /*
   * ----------------------------------------
   * APTITUDE FAIL
   * ----------------------------------------
   */

  const failAptitude = (level) => {
    setPlacementState((previous) => ({
      ...previous,

      aptitude: {
        ...previous.aptitude,

        [level]: "failed",
      },
    }));
  };

  /*
   * ========================================
   * CODING
   * ========================================
   */

  const passCodingEasy = () => {
    setPlacementState((previous) => ({
      ...previous,

      coding: {
        ...previous.coding,

        easy: "passed",
        medium: "available",
      },
    }));
  };

  const passCodingMedium = () => {
    setPlacementState((previous) => ({
      ...previous,

      coding: {
        ...previous.coding,

        medium: "passed",
        hard: "available",
      },
    }));
  };

  const passCodingHard = () => {
    setPlacementState((previous) => ({
      ...previous,

      coding: {
        ...previous.coding,

        hard: "passed",
      },

      interview: {
        ...previous.interview,

        status: "available",
      },
    }));
  };

  /*
   * ----------------------------------------
   * CODING FAIL
   * ----------------------------------------
   */

  const failCoding = (level) => {
    setPlacementState((previous) => ({
      ...previous,

      coding: {
        ...previous.coding,

        [level]: "failed",
      },
    }));
  };

  /*
   * ========================================
   * INTERVIEW
   * ========================================
   */

  const passInterview = () => {
    setPlacementState((previous) => ({
      ...previous,

      interview: {
        ...previous.interview,

        status: "passed",
      },
    }));
  };

  const failInterview = () => {
    setPlacementState((previous) => ({
      ...previous,

      interview: {
        ...previous.interview,

        status: "failed",
      },
    }));
  };

  /*
   * ----------------------------------------
   * WHITEBOARD
   * ----------------------------------------
   */

  const passWhiteboard = () => {
    setPlacementState((previous) => ({
      ...previous,

      interview: {
        ...previous.interview,

        whiteboard: "passed",
      },
    }));
  };

  const failWhiteboard = () => {
    setPlacementState((previous) => ({
      ...previous,

      interview: {
        ...previous.interview,

        whiteboard: "failed",
      },
    }));
  };

  /*
   * ========================================
   * RETRY HELPERS
   * ========================================
   *
   * These are used after the user improves
   * their weak topics in Practice Mode.
   */

  const retryAptitude = (level) => {
    setPlacementState((previous) => retryFailedPlacementLevel(previous, "aptitude", level));
  };

  const retryCoding = (level) => {
    setPlacementState((previous) => retryFailedPlacementLevel(previous, "coding", level));
  };

  /*
   * ========================================
   * RESET
   * ========================================
   */

  const resetPlacement = () => {
    localStorage.removeItem(storageKey);

    setPlacementState({
      aptitude: {
        easy: "available",
        medium: "locked",
        hard: "locked",
      },

      coding: {
        easy: "locked",
        medium: "locked",
        hard: "locked",
      },

      interview: {
        status: "locked",
        whiteboard: "locked",
      },
    });
  };

  /*
   * ========================================
   * PROVIDER
   * ========================================
   */

  return (
    <PlacementContext.Provider
      value={{
        placementState,
        applyServerPlacement: (state) => setPlacementState(normalizePlacementState(state)),

        // Aptitude
        passAptitudeEasy,
        passAptitudeMedium,
        passAptitudeHard,
        failAptitude,
        retryAptitude,

        // Coding
        passCodingEasy,
        passCodingMedium,
        passCodingHard,
        failCoding,
        retryCoding,

        // Interview
        passInterview,
        failInterview,

        // Whiteboard
        passWhiteboard,
        failWhiteboard,

        // Reset
        resetPlacement,
      }}
    >
      {children}
    </PlacementContext.Provider>
  );
}

/*
 * ========================================
 * HOOK
 * ========================================
 */

export function usePlacement() {
  const context = useContext(PlacementContext);

  if (!context) {
    throw new Error(
      "usePlacement must be used inside PlacementProvider"
    );
  }

  return context;
}

export { PlacementProvider };

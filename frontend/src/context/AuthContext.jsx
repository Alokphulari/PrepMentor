/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import { getAccountStorageKey, readStorage, writeStorage } from "../utils/storage";
import { AUTH_EXPIRED_EVENT, clearAuthToken, getCurrentAccount, loginAccount, logoutAccount, registerAccount, updateRemoteProfile } from "../services/authService";
import { hasRemoteApi } from "../services/api";

const AuthContext = createContext(null);
const SESSION_KEY = "prepmentor_user";
const PROFILE_KEY = "prepmentor_profile";

function getProfileStorageKey(account) {
  return getAccountStorageKey(PROFILE_KEY, account);
}

function getSavedUser() {
  const savedUser = readStorage(SESSION_KEY, null);
  return savedUser && typeof savedUser === "object" && savedUser.email
    ? savedUser
    : null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getSavedUser);
  const [authReady, setAuthReady] = useState(!hasRemoteApi);

  useEffect(() => {
    if (!hasRemoteApi) return;
    let active = true;
    getCurrentAccount()
      .then((response) => {
        if (!active) return;
        if (response?.user) {
          setUser(response.user);
          writeStorage(SESSION_KEY, response.user);
        } else {
          setUser(null);
          localStorage.removeItem(SESSION_KEY);
        }
      })
      .catch(() => {
        if (!active) return;
        clearAuthToken();
        localStorage.removeItem(SESSION_KEY);
        setUser(null);
      })
      .finally(() => active && setAuthReady(true));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleExpiredSession = () => {
      localStorage.removeItem(SESSION_KEY);
      setUser(null);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpiredSession);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpiredSession);
  }, []);

  const login = async (credentials) => {
    const { user: authenticatedUser } = await loginAccount(credentials);
    const accountProfile = readStorage(getProfileStorageKey(authenticatedUser), null);
    const legacyProfile = readStorage(PROFILE_KEY, null);
    const matchingProfile = accountProfile || (legacyProfile?.email === authenticatedUser.email ? legacyProfile : {});
    if (!accountProfile && matchingProfile?.email) {
      writeStorage(getProfileStorageKey(authenticatedUser), matchingProfile);
    }
    const loggedInUser = {
      ...matchingProfile,
      ...authenticatedUser,
      profileCompleted: authenticatedUser.profileCompleted ?? matchingProfile.profileCompleted ?? false,
      resumeUploaded: authenticatedUser.resumeUploaded ?? matchingProfile.resumeUploaded ?? false,
    };

    setUser(loggedInUser);
    writeStorage(SESSION_KEY, loggedInUser);
    writeStorage(getProfileStorageKey(loggedInUser), loggedInUser);
    return loggedInUser;
  };

  const register = async (details) => {
    const { user: registeredUser } = await registerAccount(details);
    const newUser = { ...registeredUser, profileCompleted: false, resumeUploaded: false };
    setUser(newUser);
    writeStorage(SESSION_KEY, newUser);
    writeStorage(getProfileStorageKey(newUser), newUser);
    return newUser;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
    logoutAccount().catch(() => {
      // Local logout still succeeds if the API is temporarily unavailable.
    });
  };

  const completeProfile = async (profileData) => {
    const updatedUser = {
      ...user,
      ...profileData,
      profileCompleted: true,
    };

    const response = await updateRemoteProfile({ ...profileData, profileCompleted: true });
    const finalUser = response.user || updatedUser;
    setUser(finalUser);
    writeStorage(SESSION_KEY, finalUser);
    writeStorage(getProfileStorageKey(finalUser), finalUser);
    return finalUser;
  };

  const markResumeUploaded = async () => {
    const updatedUser = {
      ...user,
      resumeUploaded: true,
    };

    const response = await updateRemoteProfile({ resumeUploaded: true });
    const finalUser = response.user || updatedUser;
    setUser(finalUser);
    writeStorage(SESSION_KEY, finalUser);
    writeStorage(getProfileStorageKey(finalUser), finalUser);
    return finalUser;
  };

  const value = {
    user,
    login,
    register,
    logout,
    completeProfile,
    markResumeUploaded,
    isAuthenticated: Boolean(user),
    authReady,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  clearAccessToken,
  getAccessToken,
  getCurrentUserIdFromToken,
  isAdminToken,
  isAuthenticated,
  notifyAuthChanged,
  setAccessToken,
} from "../utils/auth";

type AuthContextValue = {
  token: string | null;
  isAuthenticated: boolean;
  currentUserId: string | null;
  isAdmin: boolean;
  login: (token: string) => void;
  logout: () => void;
  refreshAuth: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const buildAuthState = () => {
  const token = getAccessToken();
  const userId = getCurrentUserIdFromToken();
  console.log(
    "[AUTH] buildAuthState: token =",
    token ? token.substring(0, 20) + "..." : null,
    "currentUserId =",
    userId,
  );
  return {
    token,
    isAuthenticated: isAuthenticated(),
    currentUserId: userId,
    isAdmin: isAdminToken(),
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [authState, setAuthState] = useState(buildAuthState);

  const refreshAuth = useCallback(() => {
    console.log("[AUTH] refreshAuth() called");
    setAuthState(buildAuthState());
  }, []);

  useEffect(() => {
    const handleAuthChanged = () => {
      console.log("[AUTH] auth-changed event received, calling refreshAuth()");
      refreshAuth();
    };
    window.addEventListener("auth-changed", handleAuthChanged);
    return () => window.removeEventListener("auth-changed", handleAuthChanged);
  }, [refreshAuth]);

  const login = useCallback((token: string) => {
    console.log(
      "[AUTH] login() called with token:",
      token.substring(0, 20) + "...",
    );
    setAccessToken(token);
    const saved = getAccessToken();
    console.log(
      "[AUTH] token saved to localStorage:",
      saved ? saved.substring(0, 20) + "..." : null,
    );
    notifyAuthChanged();
    console.log("[AUTH] auth-changed event dispatched");
  }, []);

  const logout = useCallback(() => {
    clearAccessToken();
    notifyAuthChanged();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...authState,
      login,
      logout,
      refreshAuth,
    }),
    [authState, login, logout, refreshAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

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
  return {
    token,
    isAuthenticated: isAuthenticated(),
    currentUserId: getCurrentUserIdFromToken(),
    isAdmin: isAdminToken(),
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [authState, setAuthState] = useState(buildAuthState);

  const refreshAuth = useCallback(() => {
    setAuthState(buildAuthState());
  }, []);

  useEffect(() => {
    const handleAuthChanged = () => refreshAuth();
    window.addEventListener("auth-changed", handleAuthChanged);
    return () => window.removeEventListener("auth-changed", handleAuthChanged);
  }, [refreshAuth]);

  const login = useCallback((token: string) => {
    console.log("Login called with token:", token);
    setAccessToken(token);
    console.log("Token saved to localStorage:", getAccessToken());
    notifyAuthChanged();
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

// AuthContext.tsx — race-condition-free auth context
// Design: setAccessToken() already dispatches auth-changed.
// login() must NOT call notifyAuthChanged again.

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
  setAccessToken,
} from "../utils/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthState = {
  token: string | null;
  isAuthenticated: boolean;
  currentUserId: string | null;
  isAdmin: boolean;
};

type AuthContextValue = AuthState & {
  login: (token: string) => void;
  logout: () => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const readAuthState = (): AuthState => ({
  token: getAccessToken(),
  isAuthenticated: isAuthenticated(),
  currentUserId: getCurrentUserIdFromToken(),
  isAdmin: isAdminToken(),
});

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [authState, setAuthState] = useState<AuthState>(readAuthState);

  // Re-sync state whenever auth-changed fires.
  // setAccessToken and clearAccessToken are the only dispatchers — no double-fire.
  useEffect(() => {
    const sync = () => setAuthState(readAuthState());
    window.addEventListener("auth-changed", sync);
    return () => window.removeEventListener("auth-changed", sync);
  }, []);

  const login = useCallback((token: string) => {
    // setAccessToken saves to localStorage AND dispatches auth-changed once.
    // Do NOT call notifyAuthChanged / dispatchEvent here again.
    setAccessToken(token);
  }, []);

  const logout = useCallback(() => {
    // Same: clearAccessToken dispatches auth-changed once internally.
    clearAccessToken();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...authState, login, logout }),
    [authState, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};

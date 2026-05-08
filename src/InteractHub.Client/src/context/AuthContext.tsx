// AuthContext.tsx — race-condition-free auth context
// Giữ nguyên kiến trúc event-based của bạn, thêm isInitializing.
//
// isInitializing: true trong lần render đầu tiên trước khi useEffect chạy.
// RequireAuth dùng flag này để không redirect vội khi trang vừa load.
//
// Tại sao kiến trúc này không có race condition?
//   setAccessToken() → localStorage.setItem() SYNC → interceptor đọc được ngay
//   _dispatchAuthChanged() → event → React re-render (async, chỉ để update UI)
// Hai việc này độc lập nhau — interceptor không cần đợi React re-render.

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
  /** true trong lần render đầu, trước khi useEffect sync xong */
  isInitializing: boolean;
};

type AuthContextValue = AuthState & {
  login: (token: string) => void;
  logout: () => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const readAuthState = (): Omit<AuthState, "isInitializing"> => ({
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
  const [authState, setAuthState] = useState<AuthState>({
    ...readAuthState(),
    isInitializing: true, // chưa chạy useEffect lần đầu
  });

  useEffect(() => {
    // Lần đầu: sync state và tắt isInitializing
    setAuthState({ ...readAuthState(), isInitializing: false });

    // Lắng nghe auth-changed từ setAccessToken / clearAccessToken
    const sync = () =>
      setAuthState({ ...readAuthState(), isInitializing: false });

    window.addEventListener("auth-changed", sync);
    return () => window.removeEventListener("auth-changed", sync);
  }, []);

  // login() gọi setAccessToken() → localStorage SYNC → dispatch auth-changed
  // KHÔNG gọi thêm gì — setAccessToken đã là authoritative dispatch point
  const login = useCallback((token: string) => {
    setAccessToken(token);
  }, []);

  // logout() tương tự
  const logout = useCallback(() => {
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

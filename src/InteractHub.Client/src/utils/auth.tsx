// auth.ts — production-safe JWT helpers
// Rule: ONLY setAccessToken and clearAccessToken dispatch auth-changed.
// No caller should dispatch it manually.

type TokenPayload = {
  sub?: string;
  nameid?: string;
  role?: string | string[];
  roles?: string[];
  exp?: number;
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"?:
    | string
    | string[];
};

const TOKEN_KEY = "token";

// ─── Token I/O ────────────────────────────────────────────────────────────────

export const getAccessToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setAccessToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
  // Single, authoritative dispatch point — callers must NOT dispatch again.
  _dispatchAuthChanged();
};

export const clearAccessToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  // Single, authoritative dispatch point.
  _dispatchAuthChanged();
};

// Internal only — do not export. Forces all dispatches to go through set/clear.
const _dispatchAuthChanged = (): void => {
  window.dispatchEvent(new Event("auth-changed"));
};

// ─── Token parsing ────────────────────────────────────────────────────────────

export const getTokenPayload = (): TokenPayload | null => {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const base64 = token.split(".")[1];
    // atob is fine for JWT; add padding safety
    const padded = base64.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(padded)) as TokenPayload;
  } catch {
    console.error(
      "[AUTH] Failed to parse token payload — token may be malformed.",
    );
    return null;
  }
};

// ─── Derived helpers ──────────────────────────────────────────────────────────

export const getCurrentUserIdFromToken = (): string | null => {
  const payload = getTokenPayload();
  return payload?.sub ?? payload?.nameid ?? null;
};

export const getRolesFromToken = (): string[] => {
  const payload = getTokenPayload();
  if (!payload) return [];

  return [
    payload.role,
    payload.roles,
    payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"],
  ]
    .flat()
    .filter(Boolean)
    .map(String);
};

export const isAdminToken = (): boolean =>
  getRolesFromToken().some((r) => r.toLowerCase() === "admin");

export const isAuthenticated = (): boolean => {
  const token = getAccessToken();
  const payload = getTokenPayload();

  if (!token || !payload) return false;
  if (!payload.exp) return true;

  // 30-second clock-skew buffer — accounts for Azure server time drift
  const SKEW_MS = 30_000;
  return payload.exp * 1000 > Date.now() - SKEW_MS;
};

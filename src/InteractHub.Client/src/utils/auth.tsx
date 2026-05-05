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

export const getAccessToken = (): string | null => {
  return localStorage.getItem("token");
};

export const notifyAuthChanged = () => {
  window.dispatchEvent(new Event("auth-changed"));
};

export const setAccessToken = (token: string) => {
  localStorage.setItem("token", token);
  notifyAuthChanged();
};

export const clearAccessToken = () => {
  localStorage.removeItem("token");
  notifyAuthChanged();
};

export const getTokenPayload = (): TokenPayload | null => {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as TokenPayload;
    console.log("[AUTH] Token payload:", payload);
    return payload;
  } catch (error) {
    console.error("[AUTH] Failed to parse token:", error);
    return null;
  }
};

export const getCurrentUserIdFromToken = (): string | null => {
  const payload = getTokenPayload();
  const userId = payload?.sub || payload?.nameid || null;
  console.log(
    "[AUTH] getCurrentUserIdFromToken:",
    userId,
    "from payload:",
    payload,
  );
  return userId;
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
    .map((item) => String(item));
};

export const isAdminToken = (): boolean => {
  return getRolesFromToken().some((role) => role.toLowerCase() === "admin");
};

export const isAuthenticated = (): boolean => {
  const token = getAccessToken();
  const payload = getTokenPayload();

  if (!token || !payload) return false;
  if (!payload.exp) return true;

  return payload.exp * 1000 > Date.now();
};

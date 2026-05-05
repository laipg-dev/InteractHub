// axiosConfig.ts — production-grade axios instance
// Rules:
//   1. Never clear token or redirect on /auth/login 401
//   2. Never redirect if already on /login (loop prevention)
//   3. Only one redirect can be in-flight at a time (flag guard)

import axios from "axios";
import { clearAccessToken, getAccessToken } from "../utils/auth";

// ─── Base URL ─────────────────────────────────────────────────────────────────

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5207/api"
    : "/api");

const api = axios.create({ baseURL: apiBaseUrl });

// ─── Flag: prevent concurrent redirect storms ─────────────────────────────────

let isRedirectingToLogin = false;

// ─── Request interceptor ──────────────────────────────────────────────────────

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor ─────────────────────────────────────────────────────

api.interceptors.response.use(
  (response) => response,

  (error) => {
    const status: number | undefined = error.response?.status;
    const requestUrl: string = error.config?.url ?? "";

    // ── Persist error log for post-mortem debugging ──────────────────────────
    try {
      const log = JSON.parse(localStorage.getItem("api-errors") ?? "[]");
      log.push({
        url: requestUrl,
        method: error.config?.method,
        status,
        data: error.response?.data,
        ts: new Date().toISOString(),
      });
      localStorage.setItem("api-errors", JSON.stringify(log.slice(-20)));
    } catch {
      // Non-critical — ignore storage errors
    }

    // ── 401 handling ─────────────────────────────────────────────────────────
    if (status === 401) {
      const isAuthEndpoint =
        requestUrl.includes("/auth/login") ||
        requestUrl.includes("/auth/refresh");

      if (isAuthEndpoint) {
        // Let the Login component handle this — do NOT clear the token
        // (there may not even be one yet) and do NOT redirect.
        return Promise.reject(error);
      }

      // Guard: only one redirect in-flight
      if (!isRedirectingToLogin && window.location.pathname !== "/login") {
        isRedirectingToLogin = true;
        clearAccessToken();

        // Small tick to let any pending state updates flush before redirect
        setTimeout(() => {
          window.location.href = "/login";
          // Reset flag after navigation (in case it's SPA navigation)
          isRedirectingToLogin = false;
        }, 50);
      }
    }

    return Promise.reject(error);
  },
);

export default api;

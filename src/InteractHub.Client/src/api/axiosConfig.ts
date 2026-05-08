// axiosConfig.ts — Axios instance chuẩn cho hệ thống event-based auth
//
// Tại sao KHÔNG cần ref hay setupAxiosInterceptors() như giải pháp generic?
// Vì auth.ts đã lưu token vào localStorage SYNCHRONOUSLY trong setAccessToken().
// localStorage.getItem() trong interceptor luôn đọc được giá trị mới nhất ngay lập tức.
// Không có React async state nào chen vào giữa → không race condition.
//
// Flow đúng:
//   login(token)
//     → setAccessToken(token)         ← localStorage.setItem() SYNC
//     → _dispatchAuthChanged()        ← notify UI (async, không quan trọng timing)
//   navigate("/home")
//     → Home mount → useEffect → api.get(...)
//     → interceptor: getAccessToken() ← localStorage.getItem() → có token ✓

import axios from "axios";
import { clearAccessToken, getAccessToken } from "../utils/auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ─── Request interceptor ──────────────────────────────────────────────────────
// getAccessToken() đọc localStorage mỗi lần request — luôn sync, luôn mới nhất.
// Không cần ref vì không đi qua React state.
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor ─────────────────────────────────────────────────────
// 401 → xóa token và về login.
// clearAccessToken() dispatch "auth-changed" → AuthContext tự sync lại.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAccessToken(); // dispatch "auth-changed" → AuthContext logout
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;

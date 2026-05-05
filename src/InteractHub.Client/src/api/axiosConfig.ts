import axios from "axios";
import { clearAccessToken, getAccessToken } from "../utils/auth";

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5207/api"
    : "/api");

const api = axios.create({
  baseURL: apiBaseUrl,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  console.log(
    `[AXIOS] ${config.method?.toUpperCase()} ${config.url}`,
    token ? `✓ Token: ${token.substring(0, 20)}...` : "⚠️ NO TOKEN",
  );
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn(`[AXIOS] ⚠️ NO TOKEN for request: ${config.url}`);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorInfo = {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      timestamp: new Date().toISOString(),
    };

    console.error("API error:", errorInfo);

    // Lưu lại log lỗi vào localStorage để debug sau
    try {
      const errorLog = JSON.parse(localStorage.getItem("api-errors") || "[]");
      errorLog.push(errorInfo);
      // Giữ tối đa 20 lỗi gần nhất
      localStorage.setItem("api-errors", JSON.stringify(errorLog.slice(-20)));
    } catch {
      // Bỏ qua nếu không thể lưu
    }

    if (error.response?.status === 401) {
      console.warn(
        "Received 401 from:",
        error.config?.url,
        "- clearing token and redirecting to login.",
      );
      // Lưu endpoint bị 401
      try {
        localStorage.setItem(
          "last-401-endpoint",
          error.config?.url || "unknown",
        );
      } catch {
        // Bỏ qua
      }
      clearAccessToken();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;

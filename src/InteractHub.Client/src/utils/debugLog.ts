/**
 * Debug utility để xem lại lỗi API đã ghi lại
 * Gõ trong console: debugAPI.viewErrors()
 */

// Monitor localStorage changes in real-time
const originalSetItem = localStorage.setItem;
const originalRemoveItem = localStorage.removeItem;

localStorage.setItem = function (key: string, value: string) {
  console.log(
    `[STORAGE] setItem("${key}", "${value.substring(0, 50)}${value.length > 50 ? "..." : ""}")`,
  );
  if (key === "token") {
    console.log("[STORAGE] 🔵 TOKEN SET!");
    console.trace("[STORAGE] Stack trace for setItem(token)");
  }
  return originalSetItem.call(this, key, value);
};

localStorage.removeItem = function (key: string) {
  console.log(`[STORAGE] removeItem("${key}")`);
  if (key === "token") {
    console.log("[STORAGE] 🔴 TOKEN REMOVED!");
    console.trace("[STORAGE] Stack trace for removeItem(token)");
  }
  return originalRemoveItem.call(this, key);
};

export const debugAPI = {
  viewErrors: () => {
    const errors = JSON.parse(localStorage.getItem("api-errors") || "[]");
    console.table(errors);
    return errors;
  },

  viewLast401: () => {
    const endpoint = localStorage.getItem("last-401-endpoint");
    console.log("Last 401 from endpoint:", endpoint);
    return endpoint;
  },

  clearErrors: () => {
    localStorage.removeItem("api-errors");
    localStorage.removeItem("last-401-endpoint");
    console.log("Cleared API error logs");
  },

  checkToken: () => {
    const token = localStorage.getItem("token");
    console.log("Current token:", token ? "EXISTS" : "MISSING");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        console.log("Token payload:", payload);
      } catch {
        console.log("Could not parse token payload");
      }
    }
    return token;
  },

  dumpLocalStorage: () => {
    console.log("[DEBUG] Full localStorage dump:");
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key || "");
      console.log(
        `  ${key}: ${value ? value.substring(0, 50) + (value.length > 50 ? "..." : "") : "null"}`,
      );
    }
  },
};

// Expose to window for console access
if (typeof window !== "undefined") {
  (window as any).debugAPI = debugAPI;
  console.log(
    "[DEBUG] Debug API available. Try: debugAPI.viewErrors(), debugAPI.checkToken(), debugAPI.dumpLocalStorage()",
  );
}

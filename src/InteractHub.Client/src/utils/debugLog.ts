/**
 * Debug utility để xem lại lỗi API đã ghi lại
 * Gõ trong console: debugAPI.viewErrors()
 */

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
};

// Expose to window for console access
if (typeof window !== "undefined") {
  (window as any).debugAPI = debugAPI;
  console.log(
    "Debug API available. Try: debugAPI.viewErrors(), debugAPI.checkToken(), debugAPI.clearErrors()",
  );
}

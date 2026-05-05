import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";

type LoginFormValues = {
  userName: string;
  password: string;
};

// ─── Debug helper ─────────────────────────────────────────────────────────────
// Lưu snapshot vào sessionStorage — tồn tại qua reload, không bị xóa bởi
// clearAccessToken() vì dùng key khác và khác storage.
// Sau khi bị redirect về login, mở DevTools > Console rồi chạy:
//   JSON.parse(sessionStorage.getItem('__debug_login'))
// để xem toàn bộ timeline.
const saveDebugSnapshot = (
  label: string,
  extra: Record<string, unknown> = {},
) => {
  const token = localStorage.getItem("token");
  const entry = {
    label,
    time: new Date().toISOString(),
    tokenExists: token !== null,
    tokenLength: token?.length ?? 0,
    tokenPreview: token ? token.substring(0, 50) + "..." : "NULL",
    tokenIsValidJwtFormat:
      /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(token ?? ""),
    ...extra,
  };

  // Append vào mảng để giữ toàn bộ timeline
  try {
    const existing = JSON.parse(
      sessionStorage.getItem("__debug_login") ?? "[]",
    );
    existing.push(entry);
    sessionStorage.setItem("__debug_login", JSON.stringify(existing));
  } catch {
    // sessionStorage có thể bị block trong một số môi trường
  }

  console.log(`[LOGIN DEBUG] ${label}`, entry);
};
// ─────────────────────────────────────────────────────────────────────────────

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [submitError, setSubmitError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    defaultValues: {
      userName: "",
      password: "",
    },
    mode: "onBlur",
  });

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError("");

    // Reset debug log cho lần login mới
    sessionStorage.setItem("__debug_login", "[]");

    try {
      saveDebugSnapshot("1_before_api_call");

      const res = await api.post("/auth/login", values);
      console.log("[LOGIN] Response received:", res.data);

      const token = res.data.token || res.data.Token;

      saveDebugSnapshot("2_after_api_response", {
        responseKeys: Object.keys(res.data),
        tokenFromResponse: token ? token.substring(0, 50) + "..." : "NULL",
        tokenFieldFound: !!token,
      });

      if (!token) {
        throw new Error("Token response is missing from backend.");
      }

      // CHECKPOINT 1: trước khi gọi login()
      saveDebugSnapshot("3_before_login_call");

      login(token);

      // CHECKPOINT 2: ngay sau login() — đây là thời điểm quan trọng nhất
      // Nếu token NULL ở đây → setAccessToken bị lỗi
      saveDebugSnapshot("4_immediately_after_login_call");

      // CHECKPOINT 3: sau 1 tick (để event listener kịp chạy)
      await Promise.resolve();
      saveDebugSnapshot("5_after_microtask_flush");

      // CHECKPOINT 4: navigate
      console.log("[LOGIN] Navigating to /home — nếu bị redirect về login,");
      console.log("  mở DevTools > Console > chạy lệnh:");
      console.log("  JSON.parse(sessionStorage.getItem('__debug_login'))");
      navigate("/home");
    } catch (err: any) {
      console.error("[LOGIN] Login failed:", err);
      saveDebugSnapshot("ERROR", {
        errorMessage: err.message,
        status: err.response?.status,
      });
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Sai tài khoản hoặc mật khẩu!";
      setSubmitError(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold text-center text-blue-600 mb-8">
          InteractHub
        </h2>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6"
          noValidate
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên đăng nhập
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Nhập username..."
              {...register("userName", {
                required: "Vui lòng nhập tên đăng nhập.",
                minLength: {
                  value: 3,
                  message: "Tên đăng nhập phải có ít nhất 3 ký tự.",
                },
              })}
            />
            {errors.userName && (
              <p className="mt-1 text-sm text-red-500">
                {errors.userName.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu
            </label>
            <input
              type="password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="••••••••"
              {...register("password", {
                required: "Vui lòng nhập mật khẩu.",
                minLength: {
                  value: 6,
                  message: "Mật khẩu phải có ít nhất 6 ký tự.",
                },
              })}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-500">
                {errors.password.message}
              </p>
            )}
          </div>

          {submitError && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded border border-red-200 text-center">
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition duration-200 shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600 text-sm">
          Chưa có tài khoản?{" "}
          <Link
            to="/register"
            className="text-blue-600 hover:underline font-medium"
          >
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;

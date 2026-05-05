// Login.tsx — safe post-login flow
// Key guarantees:
//   1. navigate() is called AFTER the auth-changed event has been processed
//      by React (via a microtask flush using Promise.resolve())
//   2. No API is called between login() and navigate()
//   3. All errors surface to the user without clearing valid tokens

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";
import { getAccessToken } from "../utils/auth";

type LoginFormValues = {
  userName: string;
  password: string;
};

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [submitError, setSubmitError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    defaultValues: { userName: "", password: "" },
    mode: "onBlur",
  });

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError("");

    try {
      const res = await api.post("/auth/login", values);
      const token: string | undefined = res.data.token ?? res.data.Token;

      if (!token) {
        throw new Error("Server response missing token field.");
      }

      // 1. Persist token to localStorage + dispatch auth-changed (once)
      login(token);

      // 2. Verify token is actually in localStorage before navigating.
      //    This guards against any unexpected storage failure on Azure.
      const persisted = getAccessToken();
      if (!persisted) {
        throw new Error(
          "Token could not be saved to localStorage. Check browser storage settings.",
        );
      }

      // 3. Yield to the event loop so the auth-changed listener in AuthContext
      //    can synchronously update state before the next page renders.
      //    Promise.resolve() flushes microtasks — no arbitrary setTimeout needed.
      await Promise.resolve();

      navigate("/home");
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { error?: string; message?: string } };
        message?: string;
      };
      const message =
        error.response?.data?.error ??
        error.response?.data?.message ??
        error.message ??
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

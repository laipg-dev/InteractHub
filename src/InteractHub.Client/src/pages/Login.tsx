import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";

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
    defaultValues: {
      userName: "",
      password: "",
    },
    mode: "onBlur",
  });

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError("");

    try {
      const res = await api.post("/auth/login", values);
      console.log("Login response:", res.data);
      const token = res.data.token || res.data.Token;
      if (!token) {
        throw new Error("Token response is missing from backend.");
      }
      login(token);
      navigate("/home");
    } catch (err: any) {
      console.error("Login failed:", err);
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

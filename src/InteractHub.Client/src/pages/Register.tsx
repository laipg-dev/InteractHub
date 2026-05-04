import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axiosConfig";

type RegisterFormValues = {
  userName: string;
  email: string;
  fullName: string;
  password: string;
  confirmPassword: string;
};

const getPasswordStrength = (password: string) => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) return { label: "Yếu", color: "bg-red-500" };
  if (score <= 4) return { label: "Trung bình", color: "bg-yellow-500" };
  return { label: "Mạnh", color: "bg-green-500" };
};

function Register() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    defaultValues: {
      userName: "",
      email: "",
      fullName: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  const password = watch("password", "");
  const passwordStrength = useMemo(
    () => getPasswordStrength(password),
    [password],
  );

  const onSubmit = async (values: RegisterFormValues) => {
    setSubmitError("");

    try {
      await api.post("/auth/register", {
        userName: values.userName,
        email: values.email,
        fullName: values.fullName,
        password: values.password,
      });

      navigate("/login", {
        state: { registered: true },
      });
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Đăng ký thất bại, vui lòng thử lại!";
      setSubmitError(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-10">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold text-center text-blue-600 mb-2">
          Tạo tài khoản
        </h2>
        <p className="text-center text-gray-500 mb-8">
          Tham gia cộng đồng InteractHub
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="duy_hien_digital"
              {...register("userName", {
                required: "Vui lòng nhập username.",
                minLength: {
                  value: 3,
                  message: "Username phải có ít nhất 3 ký tự.",
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
              Họ và tên
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Nguyễn Văn A"
              {...register("fullName", {
                required: "Vui lòng nhập họ và tên.",
                minLength: {
                  value: 2,
                  message: "Họ và tên phải có ít nhất 2 ký tự.",
                },
              })}
            />
            {errors.fullName && (
              <p className="mt-1 text-sm text-red-500">
                {errors.fullName.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="name@example.com"
              {...register("email", {
                required: "Vui lòng nhập email.",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Email không đúng định dạng.",
                },
              })}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    value: 8,
                    message: "Mật khẩu phải có ít nhất 8 ký tự.",
                  },
                  validate: {
                    hasUpperCase: (value) =>
                      /[A-Z]/.test(value) || "Mật khẩu cần ít nhất 1 chữ hoa.",
                    hasLowerCase: (value) =>
                      /[a-z]/.test(value) ||
                      "Mật khẩu cần ít nhất 1 chữ thường.",
                    hasNumber: (value) =>
                      /\d/.test(value) || "Mật khẩu cần ít nhất 1 chữ số.",
                  },
                })}
              />
              {password && (
                <div className="mt-2">
                  <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={`h-full ${passwordStrength.color} transition-all`}
                      style={{
                        width: `${Math.min(password.length * 10, 100)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Độ mạnh mật khẩu:{" "}
                    <span className="font-semibold">
                      {passwordStrength.label}
                    </span>
                  </p>
                </div>
              )}
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Xác nhận
              </label>
              <input
                type="password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="••••••••"
                {...register("confirmPassword", {
                  required: "Vui lòng xác nhận mật khẩu.",
                  validate: (value) =>
                    value === password || "Mật khẩu xác nhận không khớp.",
                })}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>

          {submitError && (
            <div className="text-red-500 text-sm bg-red-50 p-2 rounded border border-red-200 text-center">
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full font-semibold py-2 rounded-lg transition duration-200 shadow-md text-white ${
              isSubmitting
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isSubmitting ? "Đang xử lý..." : "Đăng ký ngay"}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600 text-sm">
          Đã có tài khoản?{" "}
          <Link
            to="/login"
            className="text-blue-600 hover:underline font-medium"
          >
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;

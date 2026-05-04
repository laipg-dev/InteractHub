import { useState } from "react";
import { Shield, ArrowRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../api/axiosConfig";
import { isAdminToken } from "../../utils/auth";

type LocationState = {
  from?: string;
};

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!userName.trim() || !password.trim() || loading) return;

    try {
      setLoading(true);
      const response = await api.post("/auth/login", {
        userName,
        password,
      });

      const token = response.data?.token;
      if (!token) {
        throw new Error("Không nhận được token từ hệ thống.");
      }

      localStorage.setItem("token", token);

      if (!isAdminToken()) {
        localStorage.removeItem("token");
        alert("Tài khoản này không có quyền truy cập khu admin.");
        return;
      }

      navigate(state?.from || "/admin/reports", { replace: true });
    } catch (error) {
      console.error("Lỗi đăng nhập admin:", error);
      alert("Đăng nhập admin thất bại. Vui lòng kiểm tra lại tài khoản.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-[32px] border border-white/60 bg-white/95 p-8 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[24px] bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Admin Console
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Đăng nhập riêng cho khu quản trị, vẫn dùng chung hệ thống xác
              thực.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Username
            </label>
            <input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập username admin"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập mật khẩu"
            />
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            <ArrowRight size={16} />
            {loading ? "Đang đăng nhập..." : "Vào khu admin"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
          >
            Quay về đăng nhập người dùng
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;

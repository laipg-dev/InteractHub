import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosConfig";
import Header from "../components/Header";
import { KeyRound, ShieldCheck, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { jwtDecode } from "jwt-decode";

const ChangePassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Lấy thông tin user hiện tại từ token để truyền vào Header
  const token = localStorage.getItem("token");
  let currentUserId = null;
  if (token) {
    const decoded: any = jwtDecode(token);
    currentUserId = decoded.sub || decoded.nameid;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: "error", text: "Mật khẩu xác nhận không khớp!" });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // Endpoint: POST /api/users/change-password
      await api.post("/users/change-password", {
        oldPassword: formData.oldPassword,
        newPassword: formData.newPassword,
      });

      setMessage({
        type: "success",
        text: "Đổi mật khẩu thành công! Đang quay lại...",
      });
      setTimeout(() => navigate(`/profile/${currentUserId}`), 2000);
    } catch (err: any) {
      setMessage({
        type: "error",
        text:
          err.response?.data?.message ||
          "Không thể đổi mật khẩu. Vui lòng thử lại.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header currentUserId={currentUserId} />

      <div className="max-w-md mx-auto mt-16 px-4">
        {/* Nút quay lại */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-bold mb-6 transition-colors"
        >
          <ArrowLeft size={18} /> Quay lại
        </button>

        <div className="bg-white rounded-[32px] shadow-xl shadow-blue-100/50 border border-gray-100 overflow-hidden">
          <div className="bg-blue-600 p-8 text-white text-center relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ShieldCheck size={100} />
            </div>
            <div className="inline-flex p-3 bg-white/20 rounded-2xl mb-4 backdrop-blur-md">
              <KeyRound size={32} />
            </div>
            <h2 className="text-2xl font-black tracking-tight">Đổi mật khẩu</h2>
            <p className="text-blue-100 text-sm mt-1 font-medium">
              Bảo mật tài khoản của bạn
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {message.text && (
              <div
                className={`p-4 rounded-2xl text-sm font-bold flex items-center gap-2 ${
                  message.type === "success"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {message.type === "success" ? "✅" : "⚠️"} {message.text}
              </div>
            )}

            <div className="space-y-4">
              {/* Mật khẩu cũ */}
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                  Mật khẩu hiện tại
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="oldPassword"
                    required
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 px-5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
                    placeholder="••••••••"
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Mật khẩu mới */}
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="newPassword"
                    required
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 px-5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
                    placeholder="Tối thiểu 6 ký tự"
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Xác nhận mật khẩu mới */}
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  required
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 px-5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
                  placeholder="Nhập lại mật khẩu mới"
                  onChange={handleChange}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
            >
              {loading ? "ĐANG CẬP NHẬT..." : "XÁC NHẬN THAY ĐỔI"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;

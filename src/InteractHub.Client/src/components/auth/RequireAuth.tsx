// RequireAuth.tsx — Guard route cho user đã đăng nhập
// Vị trí: src/components/auth/RequireAuth.tsx  (giữ nguyên vị trí cũ)
//
// Thêm isInitializing guard để tránh flash redirect khi:
//   - User reload trang, localStorage chưa được đọc xong
//   - AuthContext đang sync lại sau auth-changed event
//
// isAuthenticated() đọc localStorage trực tiếp (không qua React state)
// nên vẫn an toàn — chỉ cần đợi AuthContext init xong lần đầu.

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const RequireAuth = () => {
  const location = useLocation();
  const { isAuthenticated, isInitializing } = useAuth();

  // Đang đọc localStorage / sync auth state lần đầu → chưa redirect
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default RequireAuth;

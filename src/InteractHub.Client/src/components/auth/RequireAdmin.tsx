import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAdminToken } from "../../utils/auth";

const RequireAdmin = () => {
  const location = useLocation();

  if (!isAdminToken()) {
    return (
      <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
    );
  }

  return <Outlet />;
};

export default RequireAdmin;

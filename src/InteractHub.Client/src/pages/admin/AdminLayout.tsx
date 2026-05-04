import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  FileWarning,
  LogOut,
  Shield,
  Users,
  FileText,
  MessageSquare,
  Images,
} from "lucide-react";
import { stopRealtimeConnection } from "../../components/realtimeClient";

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("token");
    void stopRealtimeConnection();
    navigate("/admin/login");
  };

  const navItems = [
    { label: "Reports", path: "/admin/reports", icon: FileWarning },
    { label: "Users", path: "/admin/users", icon: Users },
    { label: "Posts", path: "/admin/posts", icon: FileText },
    { label: "Comments", path: "/admin/comments", icon: MessageSquare },
    { label: "Stories", path: "/admin/stories", icon: Images },
  ];

  const sectionTitle = () => {
    if (location.pathname.startsWith("/admin/reports/"))
      return "Chi tiết report";
    if (location.pathname.startsWith("/admin/reports")) return "Quản lý report";
    if (location.pathname.startsWith("/admin/users"))
      return "Quản lý tài khoản";
    if (location.pathname.startsWith("/admin/posts")) return "Quản lý bài viết";
    if (location.pathname.startsWith("/admin/comments")) return "Quản lý bình luận";
    if (location.pathname.startsWith("/admin/stories")) return "Quản lý tin";
    return "Admin workspace";
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-slate-200 bg-slate-950 px-5 py-6 text-white">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
              <Shield size={22} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
                Admin Console
              </p>
              <h1 className="text-lg font-black">InteractHub</h1>
            </div>
          </div>

          <div className="mb-6 rounded-2xl bg-white/5 px-4 py-3 text-sm text-slate-300">
            Khu quản trị nội dung và báo cáo. Giao diện này tách biệt hoàn toàn
            với app người dùng.
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                location.pathname === item.path ||
                location.pathname.startsWith(`${item.path}/`);
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-8 border-t border-white/10 pt-6">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-rose-300 transition hover:bg-rose-500/10"
            >
              <LogOut size={18} />
              Đăng xuất admin
            </button>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Admin workspace
            </p>
            <h2 className="text-xl font-black text-slate-900">
              {sectionTitle()}
            </h2>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

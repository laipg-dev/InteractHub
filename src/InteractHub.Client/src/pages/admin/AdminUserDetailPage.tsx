import { useEffect, useState } from "react";
import { ArrowLeft, Mail, Phone, ShieldCheck, UserX } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axiosConfig";
import { subscribeRealtimeEvent } from "../../components/realtimeClient";

type AdminUserDetail = {
  id: string;
  userName: string;
  fullName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
  role: string;
  createdAt: string;
  postCount: number;
  commentCount: number;
  storyCount: number;
  notificationCount: number;
};

type UserStateChangedEvent = {
  userId?: string;
  eventType?: string;
  actorUserId?: string | null;
};

const ADMIN_USER_EVENTS = new Set([
  "admin_user_restricted",
  "admin_user_reactivated",
]);

const AdminUserDetailPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    userName: "",
    fullName: "",
    email: "",
    phoneNumber: "",
    bio: "",
    avatarUrl: "",
    role: "User",
    isActive: true,
    newPassword: "",
  });

  const fetchUser = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/users/${userId}`);
      const nextUser = response.data || null;
      setUser(nextUser);
      setForm({
        userName: nextUser?.userName || "",
        fullName: nextUser?.fullName || "",
        email: nextUser?.email || "",
        phoneNumber: nextUser?.phoneNumber || "",
        bio: nextUser?.bio || "",
        avatarUrl: nextUser?.avatarUrl || "",
        role: nextUser?.role || "User",
        isActive: Boolean(nextUser?.isActive),
        newPassword: "",
      });
    } catch (error) {
      console.error("Lỗi tải chi tiết user admin:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    void fetchUser();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    let unsubscribeUserState: (() => void) | undefined;
    let cancelled = false;

    const setupRealtime = async () => {
      unsubscribeUserState =
        await subscribeRealtimeEvent<UserStateChangedEvent>(
          "user:state_changed",
          (payload) => {
            if (
              !payload?.eventType ||
              !ADMIN_USER_EVENTS.has(payload.eventType)
            ) {
              return;
            }

            if (payload.userId && payload.userId !== userId) return;
            void fetchUser();
          },
        );

      if (cancelled) {
        unsubscribeUserState?.();
      }
    };

    void setupRealtime();

    return () => {
      cancelled = true;
      unsubscribeUserState?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleToggleState = async () => {
    if (!user || submitting) return;

    try {
      setSubmitting(true);
      await api.put(
        `/admin/users/${user.id}/state?isActive=${String(!user.isActive)}`,
      );
      await fetchUser();
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái user:", error);
      alert("Không thể cập nhật trạng thái tài khoản.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSave = async () => {
    if (!user || submitting) return;

    try {
      setSubmitting(true);
      const response = await api.put(`/admin/users/${user.id}`, {
        ...form,
        phoneNumber: form.phoneNumber || null,
        bio: form.bio || null,
        avatarUrl: form.avatarUrl || null,
        newPassword: form.newPassword || null,
      });
      setUser(response.data || null);
      setEditMode(false);
      setForm((prev) => ({ ...prev, newPassword: "" }));
    } catch (error) {
      console.error("Lỗi cập nhật user:", error);
      alert("Không thể cập nhật tài khoản.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 text-center text-blue-600">
        Đang tải chi tiết tài khoản...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 text-center">
        <p className="text-lg font-bold text-slate-700">
          Không tìm thấy tài khoản.
        </p>
        <button
          onClick={() => navigate("/admin/users")}
          className="mt-4 rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <button
        onClick={() => navigate("/admin/users")}
        className="mb-4 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 font-bold text-slate-700 shadow-sm"
      >
        <ArrowLeft size={16} />
        Quay lại danh sách tài khoản
      </button>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-28 w-28 items-center justify-center overflow-hidden rounded-[32px] bg-gradient-to-br from-blue-600 to-indigo-500 text-3xl font-black text-white">
              {form.avatarUrl ? (
                <img
                  src={form.avatarUrl}
                  alt={form.userName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>
                  {(form.fullName || form.userName)?.[0]?.toUpperCase() || "U"}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-black text-slate-900">
              {user.fullName || user.userName}
            </h1>
            <p className="mt-1 text-sm text-slate-500">@{user.userName}</p>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                {user.role}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  user.isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {user.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="mt-6 flex w-full flex-col gap-3">
              <button
                type="button"
                onClick={() => setEditMode((prev) => !prev)}
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                {editMode ? "Đóng chỉnh sửa" : "Chỉnh sửa tài khoản"}
              </button>

              <button
                type="button"
                onClick={handleToggleState}
                disabled={submitting}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white transition disabled:opacity-60 ${
                  user.isActive
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                <UserX size={16} />
                {submitting
                  ? "Đang xử lý..."
                  : user.isActive
                    ? "Vô hiệu hóa tài khoản"
                    : "Kích hoạt lại tài khoản"}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-black text-slate-900">
              Thông tin tài khoản
            </h2>

            {editMode ? (
              <div className="space-y-4">
                <div className="grid gap-3 lg:grid-cols-2">
                  <input
                    value={form.userName}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, userName: e.target.value }))
                    }
                    placeholder="Username"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    value={form.fullName}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, fullName: e.target.value }))
                    }
                    placeholder="Họ và tên"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    value={form.email}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="Email"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    value={form.phoneNumber}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        phoneNumber: e.target.value,
                      }))
                    }
                    placeholder="Số điện thoại"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    value={form.avatarUrl}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        avatarUrl: e.target.value,
                      }))
                    }
                    placeholder="Avatar URL"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 lg:col-span-2"
                  />
                  <select
                    value={form.role}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, role: e.target.value }))
                    }
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="User">User</option>
                    <option value="Admin">Admin</option>
                  </select>
                  <input
                    value={form.newPassword}
                    type="password"
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    placeholder="Đổi mật khẩu (không bắt buộc)"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <textarea
                  value={form.bio}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, bio: e.target.value }))
                  }
                  placeholder="Bio"
                  className="h-28 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode(false);
                      setForm({
                        userName: user.userName || "",
                        fullName: user.fullName || "",
                        email: user.email || "",
                        phoneNumber: user.phoneNumber || "",
                        bio: user.bio || "",
                        avatarUrl: user.avatarUrl || "",
                        role: user.role || "User",
                        isActive: user.isActive,
                        newPassword: "",
                      });
                    }}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={submitting}
                    className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {submitting ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-sm text-slate-600">
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-slate-400" />
                  <span>{user.email || "Không có email"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-slate-400" />
                  <span>{user.phoneNumber || "Không có số điện thoại"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <ShieldCheck size={16} className="text-slate-400" />
                  <span>
                    Tạo lúc: {new Date(user.createdAt).toLocaleString("vi-VN")}
                  </span>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Bio
                  </p>
                  <p className="mt-2 leading-6 text-slate-600">
                    {user.bio || "Chưa có bio"}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-black text-slate-900">Thống kê</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Posts
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {user.postCount}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Comments
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {user.commentCount}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Stories
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {user.storyCount}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Notifications
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {user.notificationCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUserDetailPage;

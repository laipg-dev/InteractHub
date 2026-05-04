import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Plus, Search, ShieldCheck, UserX } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axiosConfig";
import { subscribeRealtimeEvent } from "../../components/realtimeClient";
import { useDebouncedValue } from "../../utils/useDebouncedValue";
type AdminUserListItem = {
  id: string;
  userName: string;
  fullName?: string | null;
  email?: string | null;
  isActive: boolean;
  role: string;
  createdAt: string;
  postCount: number;
  commentCount: number;
  storyCount: number;
};

type AdminUserFormState = {
  userName: string;
  fullName: string;
  email: string;
  role: string;
  phoneNumber: string;
  bio: string;
  password: string;
};

type UserStateChangedEvent = {
  eventType?: string;
  actorUserId?: string | null;
};

const emptyForm: AdminUserFormState = {
  userName: "",
  fullName: "",
  email: "",
  role: "User",
  phoneNumber: "",
  bio: "",
  password: "",
};

const ADMIN_USER_EVENTS = new Set([
  "admin_user_restricted",
  "admin_user_reactivated",
]);

const AdminUsersPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [allUsers, setAllUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<AdminUserFormState>(emptyForm);
  const [createLoading, setCreateLoading] = useState(false);

  const activeRole = searchParams.get("role") || "all";
  const activeState = searchParams.get("state") || "all";
  const search = searchParams.get("q") || "";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortDir = searchParams.get("sortDir") || "desc";
  const debouncedSearch = useDebouncedValue(search, 350);
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/users`, {
        params: {
          query: debouncedSearch.trim() || undefined,
          role: activeRole !== "all" ? activeRole : undefined,
          isActive:
            activeState === "all"
              ? undefined
              : activeState === "active"
                ? true
                : false,
          sortBy: sortBy || undefined,
          sortDir: sortDir || undefined,
        },
      });
      setAllUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Lỗi tải danh sách user admin:", error);
      setAllUsers([]);
    } finally {
      setLoading(false);
    }
  }, [activeRole, activeState, debouncedSearch, sortBy, sortDir]);
  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);
  useEffect(() => {
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

            void fetchUsers();
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
  }, [fetchUsers]);
  const counts = useMemo(() => {
    return {
      total: allUsers.length,
      active: allUsers.filter((item) => item.isActive).length,
      inactive: allUsers.filter((item) => !item.isActive).length,
      admins: allUsers.filter((item) => item.role === "Admin").length,
      users: allUsers.filter((item) => item.role === "User").length,
    };
  }, [allUsers]);

  const updateFilters = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === "all") next.delete(key);
      else next.set(key, value);
    });

    setSearchParams(next);
  };

  const handleToggleState = async (user: AdminUserListItem) => {
    try {
      setSubmittingId(user.id);
      await api.put(
        `/admin/users/${user.id}/state?isActive=${String(!user.isActive)}`,
      );
      await fetchUsers();
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái user:", error);
      alert("Không thể cập nhật trạng thái tài khoản.");
    } finally {
      setSubmittingId(null);
    }
  };

  const handleCreateUser = async () => {
    if (
      !createForm.userName.trim() ||
      !createForm.email.trim() ||
      !createForm.password.trim()
    ) {
      alert("Vui lòng nhập đủ username, email và password.");
      return;
    }

    try {
      setCreateLoading(true);
      await api.post(`/admin/users`, {
        userName: createForm.userName,
        fullName: createForm.fullName,
        email: createForm.email,
        role: createForm.role,
        phoneNumber: createForm.phoneNumber || null,
        bio: createForm.bio || null,
        password: createForm.password,
      });
      setCreateForm(emptyForm);
      setShowCreateForm(false);
      await fetchUsers();
    } catch (error) {
      console.error("Lỗi tạo user admin:", error);
      alert("Không thể tạo tài khoản lúc này.");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">
            Quản lý tài khoản
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Tra cứu tài khoản, lọc theo role hoặc trạng thái hoạt động, rồi mở
            chi tiết để tiếp tục moderation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm">
            <ShieldCheck size={18} className="text-emerald-500" />
            <span className="text-sm font-bold text-slate-700">
              {counts.total} tài khoản đang hiển thị
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
          >
            <Plus size={16} />
            Thêm tài khoản
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="mb-6 rounded-[28px] border border-gray-100 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-3">
            <input
              value={createForm.userName}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, userName: e.target.value }))
              }
              placeholder="Username"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              value={createForm.fullName}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, fullName: e.target.value }))
              }
              placeholder="Họ và tên"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              value={createForm.email}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="Email"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              value={createForm.password}
              type="password"
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, password: e.target.value }))
              }
              placeholder="Mật khẩu khới tạo"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              value={createForm.phoneNumber}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  phoneNumber: e.target.value,
                }))
              }
              placeholder="Sá»‘ Ä‘iá»‡n thoáº¡i"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={createForm.role}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, role: e.target.value }))
              }
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="User">User</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <textarea
            value={createForm.bio}
            onChange={(e) =>
              setCreateForm((prev) => ({ ...prev, bio: e.target.value }))
            }
            placeholder="Bio (không bắt buộc)"
            className="mt-3 h-24 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setCreateForm(emptyForm);
              }}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => void handleCreateUser()}
              disabled={createLoading}
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {createLoading ? "Đang tạo..." : "Tạo tài khoản"}
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 rounded-[28px] border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_180px_140px_120px]">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => updateFilters({ q: e.target.value || null })}
              placeholder="Tìm theo username, tên hoặc email..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={activeRole}
            onChange={(e) => updateFilters({ role: e.target.value })}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tất cả role</option>
            <option value="Admin">Admin</option>
            <option value="User">User</option>
          </select>

          <select
            value={activeState}
            onChange={(e) => updateFilters({ state: e.target.value })}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Đã vô hiệu hóa</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => updateFilters({ sortBy: e.target.value })}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="createdAt">Sort: Ngày tạo</option>
            <option value="userName">Sort: Username</option>
            <option value="fullName">Sort: Họ tên</option>
            <option value="email">Sort: Email</option>
            <option value="role">Sort: Role</option>
          </select>

          <select
            value={sortDir}
            onChange={(e) => updateFilters({ sortDir: e.target.value })}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="desc">Giảm dần</option>
            <option value="asc">Tăng dần</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSearchParams({});
            }}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[32px] border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="px-6 py-12 text-center text-sm font-medium text-slate-400">
            Đang tải danh sách user...
          </div>
        ) : allUsers.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {allUsers.map((user) => (
              <div key={user.id} className="px-6 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        @{user.userName}
                      </span>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
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

                    <p className="text-sm font-black text-slate-900">
                      {user.fullName || user.userName}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{user.email}</p>
                    <p className="mt-2 text-xs font-medium text-slate-400">
                      {new Date(user.createdAt).toLocaleString("vi-VN")} •{" "}
                      {user.postCount} bài viết • {user.commentCount} comment •{" "}
                      {user.storyCount} story
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/users/${user.id}`)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                    >
                      <Eye size={16} />
                      Xem chi tiết
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleToggleState(user)}
                      disabled={submittingId === user.id}
                      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold text-white transition disabled:opacity-60 ${
                        user.isActive
                          ? "bg-rose-600 hover:bg-rose-700"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                    >
                      <UserX size={16} />
                      {submittingId === user.id
                        ? "Đang xử lý..."
                        : user.isActive
                          ? "Vô hiệu hóa"
                          : "Kích hoạt lại"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-sm font-medium text-slate-400">
            Không có tài khoản nào trong bộ lọc hiện tại.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsersPage;

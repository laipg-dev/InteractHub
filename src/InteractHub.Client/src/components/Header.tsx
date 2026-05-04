import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Bell, LogOut, Sparkles, KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosConfig";
import NotificationDropdown from "./NotificationDropdown";
import Search from "./Search";
import {
  stopRealtimeConnection,
  subscribeRealtimeEvent,
} from "./realtimeClient";
import type { UnreadCountResponse } from "./types";

interface HeaderProps {
  currentUserId?: string | null;
  userName?: string;
  avatarUrl?: string | null;
  showSearch?: boolean;
  showMessages?: boolean;
  showNotifications?: boolean;
  className?: string;
  notificationRefreshKey?: number;
}

type ThemeMode = "light" | "dark";
type NotificationCreatedEvent = {
  notification: unknown;
  unreadCount: number;
};
type NotificationReadEvent = {
  notificationId: number;
  unreadCount: number;
};
type NotificationReadAllEvent = {
  unreadCount: number;
};

type UserStateChangedEvent = {
  eventType?: string;
  actorUserId?: string | null;
};

const Header: React.FC<HeaderProps> = ({
  currentUserId,
  userName,
  avatarUrl,
  showSearch = true,
  showNotifications = true,
  className = "",
  notificationRefreshKey = 0,
}) => {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isNotiOpen, setIsNotiOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await api.get<UnreadCountResponse>(
        "/notifications/unread-count",
      );
      setUnreadCount(Number(response.data?.unreadCount ?? 0));
    } catch (error) {
      console.error("Lỗi tải số thông báo chưa đọc:", error);
      setUnreadCount(0);
    }
  }, []);

  const toggleNoti = () => {
    setIsNotiOpen((current) => !current);
    if (showUserMenu) setShowUserMenu(false);
  };

  const toggleUserMenu = () => {
    setShowUserMenu((current) => !current);
    if (isNotiOpen) setIsNotiOpen(false);
  };

  useEffect(() => {
    const savedMode = localStorage.getItem(
      "interacthub-theme",
    ) as ThemeMode | null;

    if (savedMode) {
      setThemeMode(savedMode);
      document.documentElement.classList.toggle("dark", savedMode === "dark");
    }
  }, []);

  useEffect(() => {
    void fetchUnreadCount();
  }, [fetchUnreadCount, notificationRefreshKey]);

  useEffect(() => {
    if (!showNotifications) return;

    let unsubscribeNew: (() => void) | undefined;
    let unsubscribeRead: (() => void) | undefined;
    let unsubscribeReadAll: (() => void) | undefined;
    let cancelled = false;

    const setupRealtime = async () => {
      unsubscribeNew = await subscribeRealtimeEvent<NotificationCreatedEvent>(
        "notification:new",
        (payload) => {
          setUnreadCount(Number(payload?.unreadCount ?? 0));
        },
      );

      unsubscribeRead = await subscribeRealtimeEvent<NotificationReadEvent>(
        "notification:read",
        (payload) => {
          setUnreadCount(Number(payload?.unreadCount ?? 0));
        },
      );

      unsubscribeReadAll =
        await subscribeRealtimeEvent<NotificationReadAllEvent>(
          "notification:read_all",
          (payload) => {
            setUnreadCount(Number(payload?.unreadCount ?? 0));
          },
        );

      if (cancelled) {
        unsubscribeNew?.();
        unsubscribeRead?.();
        unsubscribeReadAll?.();
      }
    };

    void setupRealtime();

    const interval = window.setInterval(() => {
      void fetchUnreadCount();
    }, 15000);

    const handleFocus = () => {
      void fetchUnreadCount();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
      unsubscribeNew?.();
      unsubscribeRead?.();
      unsubscribeReadAll?.();
    };
  }, [fetchUnreadCount, showNotifications]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", themeMode === "dark");
    localStorage.setItem("interacthub-theme", themeMode);
  }, [themeMode]);

  const resolvedUserName = userName || "Người dùng";
  const resolvedAvatar = avatarUrl || null;

  const handleLogout = () => {
    localStorage.removeItem("token");
    void stopRealtimeConnection();
    navigate("/login");
  };

  useEffect(() => {
    let unsubscribeUserState: (() => void) | undefined;
    let cancelled = false;

    const setupRealtime = async () => {
      unsubscribeUserState =
        await subscribeRealtimeEvent<UserStateChangedEvent>(
          "user:state_changed",
          (payload) => {
            if (!payload?.eventType) return;

            if (payload.eventType === "admin_user_restricted") {
              alert(
                "Tài khoản của bạn đã bị quản trị viên tạm khóa. Vui lòng đăng nhập lại sau.",
              );
              handleLogout();
            }
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
  }, []);

  return (
    <header
      className={`sticky top-0 z-[90] w-full border-b border-white/40 bg-white/70 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/55 ${className}`}
    >
      <div className="flex w-full items-center gap-4 px-4 py-4 md:px-6 xl:px-8">
        <button
          onClick={() => navigate("/home")}
          className="flex shrink-0 items-center gap-3"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/40 via-violet-500/40 to-cyan-400/40 blur-xl" />
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25">
              <Sparkles size={20} />
            </div>
          </div>
          <div className="text-left">
            <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              Interact
              <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500 bg-clip-text text-transparent">
                Hub
              </span>
            </h1>
          </div>
        </button>

        {showSearch && (
          <div className="hidden min-w-0 flex-1 md:block">
            <Search embedded />
          </div>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {showNotifications && (
            <div className="relative z-[95]">
              <button
                onClick={toggleNoti}
                className={`relative flex h-11 w-11 items-center justify-center rounded-2xl border transition-all ${
                  isNotiOpen
                    ? "border-blue-100 bg-blue-50 text-blue-600 shadow-lg shadow-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10"
                    : "border-white/60 bg-white/80 text-slate-500 hover:-translate-y-0.5 hover:border-blue-100 hover:text-blue-600 hover:shadow-lg hover:shadow-blue-100 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-blue-500/30"
                }`}
                aria-label="Mở thông báo"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-md shadow-rose-500/30">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isNotiOpen && (
                  <NotificationDropdown
                    onClose={() => setIsNotiOpen(false)}
                    onUnreadCountChange={setUnreadCount}
                    onNavigateComplete={() => setIsNotiOpen(false)}
                  />
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="relative z-[96]">
            <button
              onClick={toggleUserMenu}
              className={`flex items-center gap-3 rounded-[24px] border px-2.5 py-2 transition-all ${
                showUserMenu
                  ? "border-blue-100 bg-blue-50 shadow-lg shadow-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10"
                  : "border-white/60 bg-white/85 hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-100 dark:border-white/10 dark:bg-slate-900/70 dark:hover:border-blue-500/30"
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-500 text-sm font-black text-white shadow-md shadow-blue-200/70 dark:shadow-blue-950/40">
                {resolvedAvatar ? (
                  <img
                    src={resolvedAvatar}
                    alt={resolvedUserName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{resolvedUserName.charAt(0).toUpperCase()}</span>
                )}
              </div>

              <div className="hidden text-left sm:block">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {resolvedUserName}
                </p>
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  Quản lý tài khoản
                </p>
              </div>
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <div className="absolute right-0 mt-3 w-64 origin-top-right overflow-hidden rounded-[28px] border border-white/60 bg-white/95 p-3 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/95 dark:shadow-black/40">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate(`/profile/${currentUserId}`);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-slate-600 transition hover:bg-gray-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <p>Trang cá nhân</p>
                      <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                        Xem và cập nhật hồ sơ của bạn
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate("/change-password");
                    }}
                    className="mt-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-slate-600 transition hover:bg-gray-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                      <KeyRound size={16} />
                    </div>
                    <div>
                      <p>Đổi mật khẩu</p>
                      <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                        Tăng cường bảo mật cho tài khoản
                      </p>
                    </div>
                  </button>

                  <div className="my-3 h-px bg-slate-100 dark:bg-slate-800" />

                  <button
                    onClick={handleLogout}
                    className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-red-50 px-4 py-3 text-left text-sm font-semibold text-red-500 transition hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/15"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-red-500 shadow-sm dark:bg-red-500/10">
                      <LogOut size={16} />
                    </div>
                    <div>
                      <p>Đăng xuất</p>
                      <p className="text-[11px] font-medium text-red-300 dark:text-red-400/70">
                        Kết thúc phiên làm việc hiện tại
                      </p>
                    </div>
                  </button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

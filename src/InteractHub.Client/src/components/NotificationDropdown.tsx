import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellOff, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import api from "../api/axiosConfig";
import NotificationItem from "./NotificationItem";
import { getNotificationPath } from "./NotificationNavigation";
import { subscribeRealtimeEvent } from "./realtimeClient";
import type { NotificationDto } from "./types";

type NotificationDropdownProps = {
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
  onNavigateComplete?: () => void;
};

type NotificationCreatedEvent = {
  notification: NotificationDto;
  unreadCount: number;
};
type NotificationReadEvent = {
  notificationId: number;
  unreadCount: number;
};
type NotificationReadAllEvent = {
  unreadCount: number;
};

const NotificationDropdown = ({
  onClose,
  onUnreadCountChange,
  onNavigateComplete,
}: NotificationDropdownProps) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await api.get("/notifications?page=1&pageSize=10");
      setNotifications(response.data || []);
    } catch (error) {
      console.error("Lỗi tải thông báo:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchNotifications();
  }, []);

  useEffect(() => {
    let unsubscribeNew: (() => void) | undefined;
    let unsubscribeRead: (() => void) | undefined;
    let unsubscribeReadAll: (() => void) | undefined;
    let cancelled = false;

    const setupRealtime = async () => {
      unsubscribeNew = await subscribeRealtimeEvent<NotificationCreatedEvent>(
        "notification:new",
        (payload) => {
          if (!payload?.notification) return;
          setNotifications((prev) => {
            const next = prev.filter((item) => item.id !== payload.notification.id);
            return [payload.notification, ...next].slice(0, 10);
          });
        },
      );

      unsubscribeRead = await subscribeRealtimeEvent<NotificationReadEvent>(
        "notification:read",
        (payload) => {
          setNotifications((prev) =>
            prev.map((item) =>
              item.id === payload.notificationId ? { ...item, isRead: true } : item,
            ),
          );
        },
      );

      unsubscribeReadAll = await subscribeRealtimeEvent<NotificationReadAllEvent>(
        "notification:read_all",
        () => {
          setNotifications((prev) =>
            prev.map((item) => ({ ...item, isRead: true })),
          );
        },
      );

      if (cancelled) {
        unsubscribeNew?.();
        unsubscribeRead?.();
        unsubscribeReadAll?.();
      }
    };

    void setupRealtime();

    return () => {
      cancelled = true;
      unsubscribeNew?.();
      unsubscribeRead?.();
      unsubscribeReadAll?.();
    };
  }, []);

  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.isRead).slice(0, 5),
    [notifications],
  );

  useEffect(() => {
    onUnreadCountChange?.(notifications.filter((item) => !item.isRead).length);
  }, [notifications, onUnreadCountChange]);

  const handleNotificationClick = async (notification: NotificationDto) => {
    if (!notification.isRead) {
      try {
        await api.put(`/notifications/${notification.id}/read`);
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id ? { ...item, isRead: true } : item,
          ),
        );
      } catch (error) {
        console.error("Lỗi đánh dấu thông báo:", error);
      }
    }

    const path = getNotificationPath(notification);
    onClose();
    onNavigateComplete?.();
    navigate(path);
  };

  const handleMarkAllAsRead = async () => {
    if (!unreadNotifications.length) return;
    try {
      await api.put("/notifications/read-all");
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    } catch (error) {
      console.error("Lỗi đánh dấu tất cả:", error);
    }
  };

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[70]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="absolute right-0 top-full z-[80] mt-3 w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[32px] border border-white/70 bg-white/95 shadow-[0_24px_70px_-30px_rgba(79,70,229,0.45)] backdrop-blur-2xl dark:border-slate-700/80 dark:bg-slate-900/95"
      >
        <div className="flex items-center justify-between border-b border-slate-100/90 px-6 py-4 dark:border-slate-800">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Thông báo
            </h3>
            <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              {unreadNotifications.length} mới
            </p>
          </div>

          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={!unreadNotifications.length}
            className="rounded-2xl bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-default disabled:opacity-40 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
          >
            Đánh dấu đã đọc
          </button>
        </div>

        {loading ? (
          <div className="space-y-2 px-3 py-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex animate-pulse items-center gap-3 rounded-[20px] bg-slate-50 p-4 dark:bg-slate-800/50"
              >
                <div className="h-11 w-11 flex-shrink-0 rounded-[16px] bg-slate-200 dark:bg-slate-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="h-2.5 w-2/3 rounded-full bg-slate-100 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        ) : unreadNotifications.length > 0 ? (
          <div className="scrollbar-soft max-h-[400px] overflow-y-auto px-2 py-3">
            {unreadNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
                onProfileClick={
                  notification.senderId
                    ? () => {
                        onClose();
                        navigate(`/profile/${notification.senderId}`);
                      }
                    : null
                }
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-slate-100/90 text-slate-300 shadow-inner dark:bg-slate-800/80 dark:text-slate-600">
              <BellOff size={24} />
            </div>
            <p className="mt-4 text-sm font-black text-slate-700 dark:text-slate-200">
              Bạn đã xem hết thông báo
            </p>
            <p className="mt-1.5 max-w-[220px] text-xs leading-5 text-slate-400 dark:text-slate-500">
              Không có cập nhật mới nào đang chờ bạn lúc này.
            </p>
          </div>
        )}

        <div className="border-t border-slate-100/90 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
          <button
            type="button"
            onClick={() => {
              onClose();
              onNavigateComplete?.();
              navigate("/home?view=notifications");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
          >
            Xem tất cả thông báo
            <ChevronRight size={14} />
          </button>
        </div>
      </motion.div>
    </>
  );
};

export default NotificationDropdown;

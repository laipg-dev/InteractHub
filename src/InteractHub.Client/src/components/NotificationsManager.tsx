import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import api from "../api/axiosConfig";
import NotificationItem from "./NotificationItem";
import { getNotificationPath } from "./NotificationNavigation";
import { subscribeRealtimeEvent } from "./realtimeClient";
import type { NotificationDto } from "./types";

type NotificationFilter = "all" | "unread" | "read";
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

const NotificationSkeleton: React.FC = () => (
  <div className="mb-2 flex animate-pulse items-center gap-3 rounded-[20px] bg-slate-50 p-4 dark:bg-slate-800/50">
    <div className="h-11 w-11 flex-shrink-0 rounded-[16px] bg-slate-200 dark:bg-slate-700" />
    <div className="flex-1 space-y-2">
      <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700" />
      <div className="h-2.5 w-1/2 rounded-full bg-slate-100 dark:bg-slate-800" />
    </div>
  </div>
);

const NotificationsManager: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await api.get("/notifications?page=1&pageSize=50");
      setNotifications(response.data || []);
    } catch (error) {
      console.error("Lỗi tải danh sách thông báo:", error);
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
            const next = prev.filter(
              (item) => item.id !== payload.notification.id,
            );
            return [payload.notification, ...next].slice(0, 50);
          });
        },
      );

      unsubscribeRead = await subscribeRealtimeEvent<NotificationReadEvent>(
        "notification:read",
        (payload) => {
          setNotifications((prev) =>
            prev.map((item) =>
              item.id === payload.notificationId
                ? { ...item, isRead: true }
                : item,
            ),
          );
        },
      );

      unsubscribeReadAll =
        await subscribeRealtimeEvent<NotificationReadAllEvent>(
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
    () => notifications.filter((item) => !item.isRead),
    [notifications],
  );
  const readNotifications = useMemo(
    () => notifications.filter((item) => item.isRead),
    [notifications],
  );
  const filteredNotifications = useMemo(() => {
    if (filter === "unread") return unreadNotifications;
    if (filter === "read") return readNotifications;
    return notifications;
  }, [filter, notifications, readNotifications, unreadNotifications]);

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
        console.error("Lỗi đánh dấu đã đọc:", error);
      }
    }

    navigate(getNotificationPath(notification));
  };

  const handleMarkAllAsRead = async () => {
    if (!unreadNotifications.length) return;
    setMarkingAll(true);
    try {
      await api.put("/notifications/read-all");
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, isRead: true })),
      );
    } catch (error) {
      console.error("Lỗi đánh dấu tất cả đã đọc:", error);
    } finally {
      setMarkingAll(false);
    }
  };

  const tabBase =
    "relative rounded-2xl px-4 py-2.5 text-xs font-bold transition-all";

  const tabs: { key: NotificationFilter; label: string; count: number }[] = [
    { key: "all", label: "Tất cả", count: notifications.length },
    { key: "unread", label: "Chưa đọc", count: unreadNotifications.length },
    { key: "read", label: "Đã xem", count: readNotifications.length },
  ];

  return (
    <div className="w-full rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[24px] bg-gradient-to-br from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20">
            <Bell size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Thông báo
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Danh sách thông báo được lấy trực tiếp từ hệ thống.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleMarkAllAsRead}
          disabled={!unreadNotifications.length || markingAll}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-default disabled:opacity-50"
        >
          <CheckCheck size={15} />
          {markingAll ? "Đang xử lý..." : "Đánh dấu tất cả đã đọc"}
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-1 rounded-2xl bg-gray-100 p-1 dark:bg-slate-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`${tabBase} ${
              filter === tab.key
                ? "bg-white text-blue-600 shadow-sm dark:bg-slate-900"
                : "text-slate-500 hover:bg-white/70 dark:text-slate-300"
            }`}
          >
            {tab.label} ({tab.count})
            {tab.key === "unread" && tab.count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white">
                {tab.count > 9 ? "9+" : tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="min-h-[320px]">
        {loading ? (
          <>
            {[...Array(5)].map((_, i) => (
              <NotificationSkeleton key={i} />
            ))}
          </>
        ) : filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onClick={() => handleNotificationClick(notification)}
              onProfileClick={
                notification.senderId
                  ? () => navigate(`/profile/${notification.senderId}`)
                  : null
              }
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-gray-200 py-12 text-slate-400 dark:border-slate-700 dark:text-slate-500">
            <div className="mb-3 rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
              <BellOff size={26} />
            </div>
            <p className="text-sm font-medium">
              Không có thông báo nào để hiển thị.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsManager;

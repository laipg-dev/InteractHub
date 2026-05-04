import React from "react";
import {
  Heart,
  MessageCircle,
  ShieldAlert,
  UserPlus,
  UserCheck,
  FilePlus2,
  Images,
} from "lucide-react";
import type { NotificationDto } from "./types";

interface NotificationItemProps {
  notification: NotificationDto;
  onClick: () => void;
  onProfileClick?: (() => void) | null;
}

const getNotificationMeta = (type: string) => {
  switch (type) {
    case "PostLiked":
      return {
        icon: <Heart size={11} className="fill-current" />,
        color: "bg-rose-500",
      };
    case "PostCommented":
      return {
        icon: <MessageCircle size={11} className="fill-current" />,
        color: "bg-blue-500",
      };
    case "FriendRequestReceived":
      return { icon: <UserPlus size={11} />, color: "bg-emerald-500" };
    case "FriendAccepted":
      return { icon: <UserCheck size={11} />, color: "bg-cyan-500" };
    case "NewPost":
      return { icon: <FilePlus2 size={11} />, color: "bg-violet-500" };
    case "NewStory":
      return { icon: <Images size={11} />, color: "bg-fuchsia-500" };
    default:
      return { icon: <ShieldAlert size={11} />, color: "bg-amber-500" };
  }
};

const formatTimeAgo = (createdAt: string) => {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMinutes = Math.max(
    0,
    Math.floor((now.getTime() - created.getTime()) / 60000),
  );

  if (diffMinutes < 1) return "Vừa xong";
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return created.toLocaleDateString("vi-VN");
};

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onClick,
  onProfileClick,
}) => {
  const meta = getNotificationMeta(notification.type);
  const displayName = notification.senderName || "Hệ thống";
  const avatarText = displayName[0]?.toUpperCase() || "I";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group relative mb-2 flex w-full items-start gap-3 overflow-hidden rounded-[20px] border p-3.5 text-left transition-all duration-200 hover:scale-[1.01] ${
        notification.isRead
          ? "border-transparent bg-white/70 hover:border-slate-200/80 hover:bg-slate-50 hover:shadow-sm dark:bg-slate-900/40 dark:hover:border-slate-700 dark:hover:bg-slate-800/90"
          : "border-indigo-100/80 bg-gradient-to-r from-indigo-50 via-white to-white shadow-sm shadow-indigo-100/60 hover:border-indigo-200/80 dark:border-indigo-500/20 dark:from-indigo-500/10 dark:via-slate-900 dark:to-slate-900"
      }`}
    >
      {!notification.isRead && (
        <span className="absolute inset-y-3 left-0 w-[3px] rounded-full bg-gradient-to-b from-indigo-400 via-blue-500 to-cyan-400" />
      )}

      <div className="relative flex-shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onProfileClick?.();
          }}
          disabled={!onProfileClick}
          className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-[16px] border-2 border-white bg-indigo-100 shadow-sm disabled:cursor-default dark:border-slate-900"
        >
          {notification.senderAvatarUrl ? (
            <img
              src={notification.senderAvatarUrl}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-bold text-indigo-600 dark:text-indigo-300">
              {avatarText}
            </div>
          )}
        </button>
        <div
          className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-lg border-2 border-white text-white shadow-sm dark:border-slate-900 ${meta.color}`}
        >
          {meta.icon}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        {notification.senderId ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onProfileClick?.();
            }}
            className="mb-1 block text-sm font-bold text-slate-900 dark:text-white"
          >
            {displayName}
          </button>
        ) : (
          <p className="mb-1 text-sm font-bold text-slate-900 dark:text-white">
            {displayName}
          </p>
        )}
        <p className="text-sm leading-5 text-slate-700 dark:text-slate-200">
          {notification.message}
        </p>
        <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
          {formatTimeAgo(notification.createdAt)}
        </span>
      </div>
    </div>
  );
};

export default NotificationItem;

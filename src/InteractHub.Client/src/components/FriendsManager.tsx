import React, { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Send,
  X,
  Check,
  MessageCircle,
  RefreshCcw,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axiosConfig";
import { subscribeRealtimeEvent } from "./realtimeClient";
import type { FriendListResponse, FriendRequestItem } from "./types";

type TabType = "friends" | "requests" | "sent";

type UserItemProps = {
  user: FriendRequestItem;
  type: TabType;
  onAccept?: (userId: string) => void;
  onReject?: (userId: string) => void;
  onRecall?: (userId: string) => void;
};

type FriendsRefreshEvent = {
  userId: string;
};

const FriendsManager = ({
  currentUserId: _currentUserId,
}: {
  currentUserId: string | null;
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>("friends");
  const [friends, setFriends] = useState<FriendRequestItem[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestItem[]>(
    [],
  );
  const [sentRequests, setSentRequests] = useState<FriendRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchAllFriendData = async () => {
    setLoading(true);
    try {
      const response = await api.get("/friends/list-and-requests");
      const data = (response.data || {}) as FriendListResponse;
      setFriends(Array.isArray(data.friends) ? data.friends : []);
      setIncomingRequests(Array.isArray(data.requests) ? data.requests : []);
      setSentRequests(Array.isArray(data.sent) ? data.sent : []);
    } catch (error) {
      console.error("Lỗi tải dữ liệu bạn bè:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAllFriendData();
  }, []);

  useEffect(() => {
    let unsubscribeRefresh: (() => void) | undefined;
    let cancelled = false;

    const setupRealtime = async () => {
      unsubscribeRefresh = await subscribeRealtimeEvent<FriendsRefreshEvent>(
        "friends:refresh",
        () => {
          // [SignalR] Khi có thay đổi quan hệ bạn bè/lời mời ở tab khác,
          // tải lại đầy đủ 3 danh sách để UI luôn đồng bộ.
          void fetchAllFriendData();
        },
      );

      if (cancelled) {
        unsubscribeRefresh?.();
      }
    };

    void setupRealtime();

    return () => {
      cancelled = true;
      unsubscribeRefresh?.();
    };
  }, []);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "friends" || tab === "requests" || tab === "sent") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const changeTab = (tab: TabType) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    next.set("view", "friends");
    next.set("tab", tab);
    setSearchParams(next);
  };

  const tabBase =
    "relative rounded-2xl px-4 py-2.5 text-xs font-bold transition-all";

  const goToProfile = (userId: string) => navigate(`/profile/${userId}`);

  const handleAccept = async (friendId: string) => {
    try {
      setProcessingId(friendId);
      await api.post(`/friends/accept/${friendId}`);
      await fetchAllFriendData();
    } catch (error) {
      console.error("Lỗi chấp nhận lời mời:", error);
      alert("Không thể chấp nhận lời mời lúc này.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (friendId: string) => {
    try {
      setProcessingId(friendId);
      await api.post(`/friends/reject/${friendId}`);
      await fetchAllFriendData();
    } catch (error) {
      console.error("Lỗi từ chối lời mời:", error);
      alert("Không thể thực hiện thao tác này.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRecall = async (friendId: string) => {
    if (!window.confirm("Bạn muốn thu hồi lời mời kết bạn này chứ?")) return;
    try {
      setProcessingId(friendId);
      await api.post(`/friends/reject/${friendId}`);
      await fetchAllFriendData();
    } catch (error) {
      console.error("Lỗi thu hồi lời mời:", error);
      alert("Không thể thu hồi lời mời lúc này.");
    } finally {
      setProcessingId(null);
    }
  };

  const UserItem = ({
    user,
    type,
    onAccept,
    onReject,
    onRecall,
  }: UserItemProps) => (
    <div className="mb-3 flex items-center justify-between rounded-[28px] border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-blue-100 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => goToProfile(user.userId)}
          className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 p-[2px]"
        >
          <div className="h-full w-full overflow-hidden rounded-2xl bg-white dark:bg-slate-900">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center font-bold text-blue-600">
                {user.userName?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
          </div>
        </button>
        <div>
          <button
            type="button"
            onClick={() => goToProfile(user.userId)}
            className="text-left text-sm font-bold text-slate-900 dark:text-white"
          >
            {user.fullName || user.userName}
          </button>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            @{user.userName}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {type === "requests" && (
          <>
            <button
              onClick={() => onAccept?.(user.userId)}
              disabled={processingId === user.userId}
              className="rounded-xl bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              <Check size={16} />
            </button>
            <button
              onClick={() => onReject?.(user.userId)}
              disabled={processingId === user.userId}
              className="rounded-xl border border-red-100 bg-white p-2 text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:bg-slate-900"
            >
              <X size={16} />
            </button>
          </>
        )}
        {type === "sent" && (
          <button
            onClick={() => onRecall?.(user.userId)}
            disabled={processingId === user.userId}
            className="rounded-xl bg-gray-100 px-3 py-2 text-[11px] font-bold text-slate-600 transition-all hover:bg-gray-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200"
          >
            {processingId === user.userId ? "ĐANG XỬ LÝ" : "THU HỒI"}
          </button>
        )}
        {type === "friends" && (
          <button
            onClick={() => navigate(`/profile/${user.userId}`)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition-all hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <span className="inline-flex items-center gap-1">
              <MessageCircle size={14} />
              XEM TRANG
            </span>
          </button>
        )}
      </div>
    </div>
  );

  const EmptyBlock = ({
    icon,
    text,
  }: {
    icon: React.ReactNode;
    text: string;
  }) => (
    <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-gray-200 py-12 text-slate-400 dark:border-slate-700 dark:text-slate-500">
      <div className="mb-3">{icon}</div>
      <p className="text-sm font-medium">{text}</p>
    </div>
  );

  return (
    <div className="w-full rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Mối quan hệ
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Quản lý bạn bè và lời mời kết nối của bạn.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-gray-100 p-1 dark:bg-slate-800">
          <button
            onClick={() => changeTab("friends")}
            className={`${tabBase} ${
              activeTab === "friends"
                ? "bg-white text-blue-600 shadow-sm dark:bg-slate-900"
                : "text-slate-500 hover:bg-white/70 dark:text-slate-300"
            }`}
          >
            Bạn bè ({friends.length})
          </button>
          <button
            onClick={() => changeTab("requests")}
            className={`${tabBase} ${
              activeTab === "requests"
                ? "bg-white text-blue-600 shadow-sm dark:bg-slate-900"
                : "text-slate-500 hover:bg-white/70 dark:text-slate-300"
            }`}
          >
            Lời mời
            {incomingRequests.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                {incomingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => changeTab("sent")}
            className={`${tabBase} ${
              activeTab === "sent"
                ? "bg-white text-blue-600 shadow-sm dark:bg-slate-900"
                : "text-slate-500 hover:bg-white/70 dark:text-slate-300"
            }`}
          >
            Đã gửi ({sentRequests.length})
          </button>
        </div>
      </div>

      <div className="mb-5 flex justify-end">
        <button
          type="button"
          onClick={fetchAllFriendData}
          className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <RefreshCcw size={14} /> Làm mới
        </button>
      </div>

      <div className="min-h-[300px]">
        {loading ? (
          <p className="py-10 text-center text-sm text-slate-400">
            Đang cập nhật danh sách...
          </p>
        ) : (
          <>
            {activeTab === "friends" &&
              friends.map((u) => (
                <UserItem key={u.userId} user={u} type="friends" />
              ))}
            {activeTab === "requests" &&
              incomingRequests.map((u) => (
                <UserItem
                  key={u.userId}
                  user={u}
                  type="requests"
                  onAccept={handleAccept}
                  onReject={handleReject}
                />
              ))}
            {activeTab === "sent" &&
              sentRequests.map((u) => (
                <UserItem
                  key={u.userId}
                  user={u}
                  type="sent"
                  onRecall={handleRecall}
                />
              ))}

            {activeTab === "friends" && friends.length === 0 && (
              <EmptyBlock
                icon={<Users size={32} className="opacity-70" />}
                text="Chưa có bạn bè nào. Kết nối ngay!"
              />
            )}
            {activeTab === "requests" && incomingRequests.length === 0 && (
              <EmptyBlock
                icon={<UserPlus size={32} className="opacity-70" />}
                text="Không có lời mời kết bạn nào."
              />
            )}
            {activeTab === "sent" && sentRequests.length === 0 && (
              <EmptyBlock
                icon={<Send size={32} className="opacity-70" />}
                text="Chưa gửi lời mời nào."
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FriendsManager;

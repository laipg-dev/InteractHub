import React, { useEffect, useState } from "react";
import {
  MessageCircle,
  MoreHorizontal,
  SendHorizonal,
  Trash2,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosConfig";
import {
  joinPostRealtimeGroup,
  leavePostRealtimeGroup,
  subscribeRealtimeEvent,
} from "./realtimeClient";
import type { CommentItem, PostItem } from "./types";

interface CommentModalProps {
  post: PostItem;
  currentUserId: string | null;
  onClose: () => void;
  onUpdateCount: (newCount: number) => void;
}

type PostInteractionEvent = {
  eventType: string;
  postId: number;
  commentId?: number | null;
};

const CommentModal: React.FC<CommentModalProps> = ({
  post,
  currentUserId,
  onClose,
  onUpdateCount,
}) => {
  const navigate = useNavigate();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  const fetchComments = async () => {
    try {
      const res = await api.get(`/posts/${post.id}/comments`);
      const nextComments = Array.isArray(res.data)
        ? (res.data as CommentItem[])
        : [];
      setComments(nextComments);
      onUpdateCount(nextComments.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    void fetchComments();
  }, [post.id]);

  useEffect(() => {
    let unsubscribeInteraction: (() => void) | undefined;
    let cancelled = false;

    const setupRealtime = async () => {
      // [SignalR] Khi mở modal comment, client tham gia group riêng của post.
      // Nhờ vậy mọi user đang mở cùng post sẽ nhận realtime like/comment.
      await joinPostRealtimeGroup(post.id);

      unsubscribeInteraction =
        await subscribeRealtimeEvent<PostInteractionEvent>(
          "post:interaction",
          (payload) => {
            if (!payload?.postId || payload.postId !== post.id) return;
            if (
              payload.eventType === "comment_added" ||
              payload.eventType === "comment_deleted"
            ) {
              void fetchComments();
            }
          },
        );

      if (cancelled) {
        unsubscribeInteraction?.();
        await leavePostRealtimeGroup(post.id);
      }
    };

    void setupRealtime();

    return () => {
      cancelled = true;
      unsubscribeInteraction?.();
      void leavePostRealtimeGroup(post.id);
    };
  }, [post.id]);

  const handleSend = async () => {
    if (!text.trim()) return;
    try {
      const res = await api.post(`/posts/${post.id}/comment`, {
        content: text,
      });
      const newComment = res.data as CommentItem;
      const newList = [...comments, newComment];
      setComments(newList);
      setText("");
      onUpdateCount(newList.length);
    } catch {
      alert("Lỗi gửi bình luận");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/posts/comment/${id}`);
      const newList = comments.filter((c) => c.id !== id);
      setComments(newList);
      onUpdateCount(newList.length);
      setActiveMenuId(null);
    } catch {
      alert("Không thể xóa");
    }
  };

  const goToProfile = (userId?: string | null) => {
    if (userId) {
      navigate(`/profile/${userId}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[32px] border border-gray-100 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
              <MessageCircle size={18} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Bình luận
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Thảo luận về bài viết này
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-gray-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {loading ? (
            <p className="py-10 text-center text-sm text-slate-400">
              Đang tải bình luận...
            </p>
          ) : comments.length > 0 ? (
            comments.map((c) => {
              const commentDisplayName =
                c.fullName || c.userFullName || c.userName || "Người dùng";
              const commentAvatar =
                c.avatarUrl ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.userName || c.userId}`;

              return (
                <div key={c.id} className="group relative flex gap-3">
                  <button
                    type="button"
                    onClick={() => goToProfile(c.userId)}
                    className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-blue-600 text-[11px] font-bold text-white shadow-sm"
                  >
                    <img
                      src={commentAvatar}
                      alt={commentDisplayName}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://ui-avatars.com/api/?name=" +
                          encodeURIComponent(commentDisplayName || "User") +
                          "&background=6366f1&color=fff";
                      }}
                    />
                  </button>

                  <div className="flex-1 rounded-[24px] bg-slate-50 p-4 dark:bg-slate-950/60">
                    <div className="mb-1 flex items-start justify-between gap-3">
                      <div>
                        <button
                          type="button"
                          onClick={() => goToProfile(c.userId)}
                          className="text-left text-sm font-bold text-slate-900 dark:text-white"
                        >
                          {commentDisplayName}
                        </button>
                      </div>

                      {(c.userId === currentUserId ||
                        post.userId === currentUserId) && (
                        <div className="relative">
                          <button
                            onClick={() =>
                              setActiveMenuId(
                                activeMenuId === c.id ? null : c.id,
                              )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                          >
                            <MoreHorizontal size={16} />
                          </button>

                          {activeMenuId === c.id && (
                            <div className="absolute right-0 top-9 z-10 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                              <button
                                onClick={() => handleDelete(c.id)}
                                className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 dark:hover:bg-red-500/10"
                              >
                                <Trash2 size={15} />
                                Xóa
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">
                      {c.content}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-gray-200 py-12 text-center dark:border-slate-700">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                <MessageCircle size={24} />
              </div>
              <p className="font-bold text-slate-700 dark:text-slate-200">
                Chưa có bình luận nào
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Hãy là người đầu tiên bắt đầu cuộc trò chuyện.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/50">
          <div className="flex items-center gap-3 rounded-[24px] border border-gray-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Viết bình luận của bạn..."
              className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400 dark:text-white"
            />
            <button
              onClick={handleSend}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white transition hover:bg-blue-700"
            >
              <SendHorizonal size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentModal;

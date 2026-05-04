import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  MoreHorizontal,
  SendHorizonal,
  Trash2,
} from "lucide-react";
import api from "../api/axiosConfig";
import Header from "../components/Header";
import {
  joinPostRealtimeGroup,
  leavePostRealtimeGroup,
  subscribeRealtimeEvent,
} from "../components/realtimeClient";
import type { CommentItem, PostItem } from "../components/types";

type PostInteractionEvent = {
  eventType: string;
  postId: number;
  likeCount: number;
  commentCount: number;
  commentId?: number | null;
  actorUserId?: string | null;
};

type PostApiResponse = Partial<PostItem>;

type CommentApiResponse = Partial<CommentItem>;

const mapPost = (post: PostApiResponse): PostItem => ({
  id: Number(post.id || 0),
  content: String(post.content || ""),
  imageUrl: post.imageUrl || null,
  createdAt: String(post.createdAt || ""),
  userId: String(post.userId || ""),
  userName: String(post.userName || ""),
  userFullName: post.userFullName || post.fullName || null,
  fullName: post.fullName || post.userFullName || null,
  avatarUrl: post.avatarUrl || null,
  userAvatar: post.userAvatar || post.avatarUrl || null,
  likeCount: Number(post.likeCount ?? 0),
  commentCount: Number(post.commentCount ?? 0),
  hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
  isLiked: Boolean(post.isLiked),
});
const ADMIN_REMOVE_EVENTS = new Set(["admin_post_removed"]);
const ADMIN_REFRESH_EVENTS = new Set([
  "admin_post_restored",
  "admin_post_updated",
  "admin_comment_removed",
  "admin_comment_restored",
]);
const mapComment = (comment: CommentApiResponse): CommentItem => ({
  id: Number(comment.id || 0),
  userId: String(comment.userId || ""),
  userName: comment.userName || null,
  userFullName: comment.userFullName || null,
  fullName: comment.fullName || comment.userFullName || null,
  avatarUrl: comment.avatarUrl || null,
  content: String(comment.content || ""),
});

const PostDetail = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const numericPostId = Number(postId || 0);
  const [post, setPost] = useState<PostItem | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [likeLoading, setLikeLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState("Spam");
  const [reportDescription, setReportDescription] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchPost = async () => {
    const response = await api.get(`/posts/${numericPostId}`);
    setPost(mapPost(response.data));
  };

  const fetchComments = async () => {
    const response = await api.get(`/posts/${numericPostId}/comments`);
    setComments(
      Array.isArray(response.data)
        ? (response.data as CommentApiResponse[]).map(mapComment)
        : [],
    );
  };

  const fetchDetailData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchPost(), fetchComments()]);
    } catch (error) {
      console.error("Lỗi tải chi tiết bài viết:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setCurrentUserId(payload.sub || payload.nameid || null);
      } catch {
        console.error("Không đọc được token user hiện tại");
      }
    }
  }, []);

  useEffect(() => {
    if (!numericPostId) return;
    void fetchDetailData();
  }, [numericPostId]);

  useEffect(() => {
    if (!numericPostId) return;

    let unsubscribeInteraction: (() => void) | undefined;
    let cancelled = false;

    const setupRealtime = async () => {
      await joinPostRealtimeGroup(numericPostId);

      unsubscribeInteraction =
        await subscribeRealtimeEvent<PostInteractionEvent>(
          "post:interaction",
          (payload) => {
            if (!payload?.postId || payload.postId !== numericPostId) return;

            if (ADMIN_REMOVE_EVENTS.has(payload.eventType)) {
              setPost(null);
              setComments([]);
              return;
            }

            if (ADMIN_REFRESH_EVENTS.has(payload.eventType)) {
              void fetchDetailData();
              return;
            }

            setPost((prev) =>
              prev
                ? {
                    ...prev,
                    likeCount: payload.likeCount,
                    commentCount: payload.commentCount,
                  }
                : prev,
            );

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
        await leavePostRealtimeGroup(numericPostId);
      }
    };

    void setupRealtime();

    return () => {
      cancelled = true;
      unsubscribeInteraction?.();
      void leavePostRealtimeGroup(numericPostId);
    };
  }, [numericPostId]);

  const handleLike = async () => {
    if (!post || likeLoading) return;

    try {
      setLikeLoading(true);
      const response = await api.post(`/posts/${post.id}/like`);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              isLiked: Boolean(response.data?.isLiked),
              likeCount: Number(response.data?.likeCount ?? prev.likeCount),
            }
          : prev,
      );
    } catch (error) {
      console.error("Lỗi like bài viết:", error);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!post || !commentText.trim() || commentLoading) return;

    try {
      setCommentLoading(true);
      const response = await api.post(`/posts/${post.id}/comment`, {
        content: commentText,
      });
      const nextComment = mapComment(response.data);
      setComments((prev) => [...prev, nextComment]);
      setPost((prev) =>
        prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev,
      );
      setCommentText("");
    } catch (error) {
      console.error("Lỗi gửi comment:", error);
      alert("Không thể gửi bình luận lúc này.");
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await api.delete(`/posts/comment/${commentId}`);
      setComments((prev) => prev.filter((item) => item.id !== commentId));
      setPost((prev) =>
        prev
          ? { ...prev, commentCount: Math.max(0, prev.commentCount - 1) }
          : prev,
      );
      setActiveMenuId(null);
    } catch (error) {
      console.error("Lỗi xóa comment:", error);
      alert("Không thể xóa bình luận này.");
    }
  };

  const handleReport = async () => {
    if (!post || reportLoading) return;

    try {
      setReportLoading(true);
      await api.post("/PostReport/report", {
        postId: post.id,
        reason: reportReason,
        description: reportDescription,
      });
      setShowReportModal(false);
      setReportDescription("");
      alert("Báo cáo đã được gửi và đang chờ xử lý.");
    } catch (error) {
      console.error("Lỗi report bài viết:", error);
      alert("Không thể gửi báo cáo lúc này.");
    } finally {
      setReportLoading(false);
    }
  };

  const displayName =
    post?.fullName || post?.userFullName || post?.userName || "Người dùng";
  const avatarSrc =
    post?.userAvatar ||
    post?.avatarUrl ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${post?.userName || "user"}`;

  const sortedComments = useMemo(() => comments, [comments]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6]">
        <Header currentUserId={currentUserId} />
        <div className="mx-auto flex max-w-6xl items-center justify-center px-6 py-16 text-blue-600">
          Đang tải chi tiết bài viết...
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#F3F4F6]">
        <Header currentUserId={currentUserId} />
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-4 px-6 py-16">
          <p className="text-lg font-bold text-slate-700">
            Không tìm thấy bài viết.
          </p>
          <button
            onClick={() => navigate("/home")}
            className="rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white"
          >
            Quay lại bảng tin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-10">
      <Header currentUserId={currentUserId} />

      <div className="mx-auto max-w-7xl px-4 py-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 font-bold text-slate-700 shadow-sm"
        >
          <ArrowLeft size={16} />
          Quay lại
        </button>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_420px]">
          <div className="overflow-hidden rounded-[32px] border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {post.imageUrl ? (
              <img
                src={post.imageUrl}
                alt="Post"
                className="h-full max-h-[80vh] w-full object-contain bg-black"
              />
            ) : (
              <div className="flex min-h-[420px] items-center justify-center px-8 py-12">
                <div className="max-w-2xl text-center">
                  <p className="whitespace-pre-wrap text-lg leading-8 text-slate-700 dark:text-slate-200">
                    {post.content || "Bài viết không có nội dung để hiển thị."}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex max-h-[80vh] flex-col overflow-hidden rounded-[32px] border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-gray-100 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/profile/${post.userId}`)}
                    className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-500 text-sm font-bold text-white shadow-sm"
                  >
                    <img
                      src={avatarSrc}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  </button>
                  <div>
                    <button
                      type="button"
                      onClick={() => navigate(`/profile/${post.userId}`)}
                      className="text-left text-sm font-black text-slate-900 dark:text-white"
                    >
                      {displayName}
                    </button>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      {new Date(post.createdAt).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowReportModal(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-gray-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <MoreHorizontal size={18} />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {!!post.content && !!post.imageUrl && (
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
                    {post.content}
                  </p>
                )}

                {post.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {post.hashtags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3 dark:border-slate-800">
              <button
                onClick={handleLike}
                disabled={likeLoading}
                className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition-all disabled:opacity-60 ${
                  post.isLiked
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 dark:text-slate-200"
                }`}
              >
                <Heart
                  size={16}
                  className={post.isLiked ? "fill-current" : ""}
                />
                {post.likeCount}
              </button>

              <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <MessageCircle size={16} />
                {post.commentCount}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {sortedComments.length > 0 ? (
                <div className="space-y-4">
                  {sortedComments.map((comment) => {
                    const commentDisplayName =
                      comment.fullName ||
                      comment.userFullName ||
                      comment.userName ||
                      "Người dùng";
                    const canDelete =
                      comment.userId === currentUserId ||
                      post.userId === currentUserId;

                    return (
                      <div
                        key={comment.id}
                        className="group relative flex gap-3"
                      >
                        <button
                          type="button"
                          onClick={() => navigate(`/profile/${comment.userId}`)}
                          className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-blue-600 text-[11px] font-bold text-white shadow-sm"
                        >
                          {comment.avatarUrl ? (
                            <img
                              src={comment.avatarUrl}
                              alt={commentDisplayName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span>
                              {commentDisplayName[0]?.toUpperCase() || "?"}
                            </span>
                          )}
                        </button>

                        <div className="flex-1 rounded-[24px] bg-slate-50 p-4 dark:bg-slate-950/60">
                          <div className="mb-1 flex items-start justify-between gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/profile/${comment.userId}`)
                              }
                              className="text-left text-sm font-bold text-slate-900 dark:text-white"
                            >
                              {commentDisplayName}
                            </button>

                            {canDelete && (
                              <div className="relative">
                                <button
                                  onClick={() =>
                                    setActiveMenuId(
                                      activeMenuId === comment.id
                                        ? null
                                        : comment.id,
                                    )
                                  }
                                  className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                                >
                                  <MoreHorizontal size={16} />
                                </button>

                                {activeMenuId === comment.id && (
                                  <div className="absolute right-0 top-9 z-10 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                                    <button
                                      onClick={() =>
                                        handleDeleteComment(comment.id)
                                      }
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
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <MessageCircle size={28} className="mb-3 text-slate-300" />
                  <p className="font-bold text-slate-600 dark:text-slate-300">
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
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                  placeholder="Viết bình luận của bạn..."
                  className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400 dark:text-white"
                />
                <button
                  onClick={handleAddComment}
                  disabled={commentLoading || !commentText.trim()}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  <SendHorizonal size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showReportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-gray-100 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="p-6">
              <h3 className="mb-4 text-xl font-black text-slate-900 dark:text-white">
                Báo cáo vi phạm
              </h3>

              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Lý do chính
              </label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="mb-4 w-full rounded-2xl border border-gray-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="Spam">Nội dung rác (Spam)</option>
                <option value="Offensive">Nội dung nhạy cảm/Xúc phạm</option>
                <option value="FakeNews">Tin giả/Sai sự thật</option>
                <option value="Other">Lý do khác</option>
              </select>

              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Chi tiết thêm
              </label>
              <textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Nhập thêm chi tiết..."
                className="mb-6 h-24 w-full resize-none rounded-2xl border border-gray-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setShowReportModal(false)}
                  disabled={reportLoading}
                  className="flex-1 rounded-2xl border border-gray-200 py-3 font-bold text-slate-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  onClick={handleReport}
                  disabled={reportLoading}
                  className="flex-1 rounded-2xl bg-red-600 py-3 font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
                >
                  {reportLoading ? "Đang gửi..." : "Gửi báo cáo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostDetail;

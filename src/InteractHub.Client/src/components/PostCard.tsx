import React, { useState } from "react";
import {
  Heart,
  MessageCircle,
  MoreHorizontal,
  Flag,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosConfig";
import type { PostItem } from "./types";

interface PostCardProps {
  post: PostItem;
  currentUserId: string | null;
  onDelete: () => void;
  onLike: (isLiked: boolean, count: number) => void;
  onOpenComments: () => void;
}

const formatDate = (value: string) => {
  try {
    return new Date(value).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUserId,
  onDelete,
  onLike,
  onOpenComments,
}) => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("Spam");
  const [description, setDescription] = useState("");
  const [likeLoading, setLikeLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  const displayName = post.fullName || post.userFullName || post.userName;
  const avatarSrc =
    post.userAvatar ||
    post.avatarUrl ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.userName}`;

  const goToProfile = () => {
    if (post.userId) {
      navigate(`/profile/${post.userId}`);
    }
  };

  const goToPostDetail = () => {
    navigate(`/posts/${post.id}`);
  };

  const closeMenus = () => {
    setShowMenu(false);
    setShowReportModal(false);
  };

  const handleLike = async () => {
    if (likeLoading) return;

    try {
      setLikeLoading(true);
      const res = await api.post(`/posts/${post.id}/like`);
      onLike(res.data.isLiked, res.data.likeCount);
    } catch (err) {
      console.error(err);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteLoading) return;
    if (!window.confirm("Bạn muốn xóa bài viết này chứ?")) return;

    try {
      setDeleteLoading(true);
      await api.delete(`/posts/delete/${post.id}`);
      closeMenus();
      onDelete();
    } catch {
      alert("Lỗi xóa bài");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleReport = async () => {
    if (reportLoading) return;

    try {
      setReportLoading(true);
      await api.post("/PostReport/report", {
        postId: post.id,
        reason: reportReason,
        description,
      });
      alert("Báo cáo đã được gửi và đang chờ xử lý.");
      closeMenus();
      setDescription("");
    } catch (err) {
      const message =
        typeof err === "object" && err !== null && "response" in err
          ? ((err as { response?: { data?: { message?: string } } }).response
              ?.data?.message ?? "Lỗi khi gửi báo cáo")
          : "Lỗi khi gửi báo cáo";
      alert(message);
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div
      id={`post-${post.id}`}
      className="overflow-hidden rounded-[32px] border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goToProfile}
            className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-500 text-sm font-bold text-white shadow-sm"
          >
            <img
              src={avatarSrc}
              alt={displayName}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://ui-avatars.com/api/?name=" +
                  encodeURIComponent(displayName || "User") +
                  "&background=6366f1&color=fff";
              }}
            />
          </button>

          <button type="button" onClick={goToProfile} className="text-left">
            <p className="text-sm font-black text-slate-900 dark:text-white">
              {displayName}
            </p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {formatDate(post.createdAt)}
            </p>
          </button>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-gray-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <MoreHorizontal size={18} />
          </button>

          {showMenu && (
            <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-2xl border border-gray-100 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <button
                onClick={goToPostDetail}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ExternalLink size={16} />
                Xem chi tiết
              </button>
              {post.userId === currentUserId ? (
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10"
                >
                  <Trash2 size={16} />
                  {deleteLoading ? "Đang xóa..." : "Xóa bài viết"}
                </button>
              ) : (
                <button
                  onClick={() => setShowReportModal(true)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Flag size={16} />
                  Báo cáo bài viết
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-5">
        {post.content && (
          <button
            type="button"
            onClick={goToPostDetail}
            className="w-full text-left"
          >
            <p className="whitespace-pre-wrap text-[15px] leading-7 text-slate-700 dark:text-slate-200">
              {post.content}
            </p>
          </button>
        )}

        {post.hashtags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
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

      {post.imageUrl && post.imageUrl !== "string" && (
        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={goToPostDetail}
            className="block w-full overflow-hidden rounded-[24px] border border-gray-100 bg-gray-50 dark:border-slate-800 dark:bg-slate-950"
          >
            <img
              src={post.imageUrl}
              className="max-h-[560px] w-full object-cover"
              alt="post"
            />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-gray-100 bg-slate-50/70 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="flex gap-2">
          <button
            onClick={handleLike}
            disabled={likeLoading}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition-all disabled:cursor-default disabled:opacity-60 ${
              post.isLiked
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            <Heart size={16} className={post.isLiked ? "fill-current" : ""} />
            {likeLoading ? "..." : post.likeCount || 0}
          </button>

          <button
            onClick={onOpenComments}
            className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-bold text-slate-600 transition-all hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <MessageCircle size={16} />
            {post.commentCount || 0}
          </button>
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
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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

export default PostCard;

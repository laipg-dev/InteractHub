import { useEffect, useMemo, useState } from "react";
import api from "../../../api/axiosConfig";
import { subscribeRealtimeEvent } from "../../realtimeClient";
import type {
  AdminCommentListItemDto,
  AdminPostDetailDto,
  AdminPostListItemDto,
  UpdateAdminPostRequest,
} from "./types";

type Props = {
  selectedPost: AdminPostListItemDto | null;
  onPostChanged: () => void;
};

type PostInteractionEvent = {
  eventType?: string;
  postId?: number;
  likeCount?: number;
  commentCount?: number;
  commentId?: number | null;
};

const DETAIL_REFRESH_EVENTS = new Set([
  "admin_post_updated",
  "admin_post_removed",
  "admin_post_restored",
  "admin_comment_removed",
  "admin_comment_restored",
  "comment_added",
  "comment_deleted",
  "liked",
  "unliked",
]);

const AdminPostDetailPanel = ({ selectedPost, onPostChanged }: Props) => {
  const [detail, setDetail] = useState<AdminPostDetailDto | null>(null);
  const [comments, setComments] = useState<AdminCommentListItemDto[]>([]);
  const [commentQuery, setCommentQuery] = useState("");
  const [commentState, setCommentState] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ content: "", imageUrl: "" });
  const [message, setMessage] = useState<string | null>(null);

  const postId = selectedPost?.id ?? null;

  const loadDetail = async () => {
    if (!postId) {
      setDetail(null);
      setComments([]);
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const [postDetailRes, commentItemsRes] = await Promise.all([
        api.get<AdminPostDetailDto>(`/admin/posts/${postId}`),
        api.get<AdminCommentListItemDto[]>(`/admin/posts/${postId}/comments`, {
          params: {
            query: commentQuery || undefined,
            state: commentState || undefined,
            sortBy: "createdAt",
            sortDir: "desc",
          },
        }),
      ]);

      const postDetail = postDetailRes.data;
      const commentItems = Array.isArray(commentItemsRes.data)
        ? commentItemsRes.data
        : [];

      setDetail(postDetail);
      setComments(commentItems);
      setForm({
        content: postDetail.content,
        imageUrl: postDetail.imageUrl || "",
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không tải được chi tiết post.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, commentQuery, commentState]);

  useEffect(() => {
    if (!postId) return;

    let unsubscribeInteraction: (() => void) | undefined;
    let cancelled = false;

    const setupRealtime = async () => {
      unsubscribeInteraction =
        await subscribeRealtimeEvent<PostInteractionEvent>(
          "post:interaction",
          (payload) => {
            if (!payload?.postId || payload.postId !== postId) return;
            if (
              !payload.eventType ||
              !DETAIL_REFRESH_EVENTS.has(payload.eventType)
            ) {
              return;
            }

            void loadDetail();
            void onPostChanged();
          },
        );

      if (cancelled) {
        unsubscribeInteraction?.();
      }
    };

    void setupRealtime();

    return () => {
      cancelled = true;
      unsubscribeInteraction?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, commentQuery, commentState]);

  const statusText = useMemo(() => {
    if (!detail) return "";
    return detail.isDeleted ? "Đã ẩn" : "Đang hoạt động";
  }, [detail]);

  const handleUpdatePost = async () => {
    if (!detail) return;

    setSaving(true);
    setMessage(null);

    try {
      const payload: UpdateAdminPostRequest = {
        content: form.content,
        imageUrl: form.imageUrl || undefined,
      };

      await api.put(`/admin/posts/${detail.id}`, payload);
      await loadDetail();
      onPostChanged();
      setMessage("Đã cập nhật nội dung bài viết.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Không cập nhật được post.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePostState = async () => {
    if (!detail) return;

    setSaving(true);
    setMessage(null);

    try {
      await api.put(
        `/admin/posts/${detail.id}/removed-state?removed=${String(!detail.isDeleted)}`,
      );
      await loadDetail();
      onPostChanged();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không đổi được trạng thái post.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCommentState = async (
    commentId: number,
    removed: boolean,
  ) => {
    setSaving(true);
    setMessage(null);

    try {
      await api.put(
        `/admin/posts/comments/${commentId}/removed-state?removed=${String(removed)}`,
      );
      await loadDetail();
      onPostChanged();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không đổi được trạng thái comment.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!selectedPost) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
        Chọn một bài viết ở cột bên trái để xem chi tiết, chỉnh sửa và quản lý
        toàn bộ comment của bài viết đó.
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Post detail
          </p>
          <h3 className="text-xl font-black text-slate-900">
            Post #{selectedPost.id}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Trạng thái hiện tại: <span className="font-bold">{statusText}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            disabled={saving || !detail}
            onClick={() => void handleTogglePostState()}
            className={`rounded-2xl px-4 py-3 text-sm font-bold text-white ${
              detail?.isDeleted ? "bg-emerald-600" : "bg-rose-600"
            }`}
          >
            {detail?.isDeleted ? "Khôi phục post" : "Ẩn post"}
          </button>
        </div>
      </div>

      {message ? (
        <div className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {message}
        </div>
      ) : null}

      {loading || !detail ? (
        <div className="py-10 text-center text-sm text-slate-500">
          Đang tải chi tiết post...
        </div>
      ) : (
        <div className="space-y-6">
          <section className="space-y-4 rounded-[24px] bg-slate-50 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                <span className="block text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Tác giả
                </span>
                <span className="mt-2 block font-bold text-slate-900">
                  {detail.userFullName || detail.userName || "Unknown user"}
                </span>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                <span className="block text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Moderation
                </span>
                <span className="mt-2 block font-bold text-slate-900">
                  {detail.currentFlag || "No flag"} /{" "}
                  {detail.finalStatus || "No final status"}
                </span>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700">
                {detail.likeCount} like
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700">
                {detail.activeCommentCount}/{detail.totalCommentCount} comment
                active
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-amber-700">
                {detail.reportCount} report
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h4 className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">
                Chỉnh sửa post
              </h4>
            </div>

            <textarea
              value={form.content}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, content: e.target.value }))
              }
              rows={6}
              className="w-full rounded-3xl border border-slate-200 px-4 py-4 text-sm outline-none focus:border-slate-400"
            />

            <input
              value={form.imageUrl}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, imageUrl: e.target.value }))
              }
              placeholder="Image URL"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
            />

            <button
              type="button"
              disabled={saving}
              onClick={() => void handleUpdatePost()}
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white"
            >
              Lưu thay đổi post
            </button>
          </section>

          <section className="space-y-4 rounded-[24px] border border-slate-200 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-black text-slate-900">
                  Quản lý comment của post này
                </h4>
                <p className="mt-1 text-sm text-slate-500">
                  Hiển thị toàn bộ comment của post đang chọn, đồng thời cho
                  phép tìm kiếm, lọc và ẩn/khôi phục ngay tại chỗ.
                </p>
              </div>
              <div className="flex gap-3">
                <input
                  value={commentQuery}
                  onChange={(e) => setCommentQuery(e.target.value)}
                  placeholder="Tìm theo nội dung hoặc người comment..."
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none"
                />
                <select
                  value={commentState}
                  onChange={(e) => setCommentState(e.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none"
                >
                  <option value="">Tất cả comment</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="removed">Đã ẩn</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-700"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">
                        {comment.userFullName ||
                          comment.userName ||
                          "Unknown user"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(comment.createdAt).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        void handleToggleCommentState(
                          comment.id,
                          !comment.isDeleted,
                        )
                      }
                      className={`rounded-2xl px-3 py-2 text-xs font-bold text-white ${
                        comment.isDeleted ? "bg-emerald-600" : "bg-rose-600"
                      }`}
                    >
                      {comment.isDeleted ? "Khôi phục" : "Ẩn comment"}
                    </button>
                  </div>
                  <p className="leading-6">{comment.content}</p>
                </div>
              ))}

              {!comments.length ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                  Không có comment nào khớp bộ lọc.
                </div>
              ) : null}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminPostDetailPanel;

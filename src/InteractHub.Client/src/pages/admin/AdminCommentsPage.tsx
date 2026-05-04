import { useCallback, useEffect, useState } from "react";
import { Search, MessageSquareWarning, Trash2, RotateCcw } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import api from "../../api/axiosConfig";
import { useDebouncedValue } from "../../utils/useDebouncedValue";

type AdminCommentListItem = {
  id: number;
  postId: number;
  userId: string;
  userName?: string | null;
  userFullName?: string | null;
  content: string;
  isDeleted: boolean;
  createdAt: string;
  deletedAt?: string | null;
};

const AdminCommentsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [comments, setComments] = useState<AdminCommentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = searchParams.get("q") || "";
  const state = searchParams.get("state") || "all";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortDir = searchParams.get("sortDir") || "desc";
  const postIdParam = searchParams.get("postId") || "";
  const debouncedQuery = useDebouncedValue(query, 350);

  const updateFilters = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === "all") next.delete(key);
      else next.set(key, value);
    });

    setSearchParams(next);
  };

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const postId = Number(postIdParam || 0);
      const response = await api.get<AdminCommentListItem[]>(`/admin/comments`, {
        params: {
          query: debouncedQuery.trim() || undefined,
          state: state !== "all" ? state : undefined,
          postId: postId > 0 ? postId : undefined,
          sortBy: sortBy || undefined,
          sortDir: sortDir || undefined,
        },
      });

      setComments(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không tải được danh sách comment.",
      );
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, postIdParam, sortBy, sortDir, state]);

  useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  const handleToggleCommentState = async (comment: AdminCommentListItem) => {
    if (submittingId) return;

    try {
      setSubmittingId(comment.id);
      await api.put(
        `/admin/comments/${comment.id}/removed-state?removed=${String(
          !comment.isDeleted,
        )}`,
      );
      await fetchComments();
    } catch (err) {
      console.error("Lỗi đổi trạng thái comment:", err);
      alert("Không thể đổi trạng thái comment lúc này.");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">Quản lý bình luận</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-500">
          Tìm kiếm và lọc bình luận theo nội dung, username, trạng thái hoặc
          postId. Admin có thể ẩn/khôi phục bình luận ngay tại đây.
        </p>
      </div>

      <div className="mb-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_180px_180px_180px_120px_120px]">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(e) => updateFilters({ q: e.target.value || null })}
              placeholder="Tìm theo nội dung, username... (có thể nhập số để match postId)"
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-slate-400"
            />
          </div>

          <select
            value={state}
            onChange={(e) => updateFilters({ state: e.target.value })}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hiển thị</option>
            <option value="removed">Đã ẩn</option>
          </select>

          <input
            value={postIdParam}
            onChange={(e) => updateFilters({ postId: e.target.value || null })}
            placeholder="PostId (tuỳ chọn)"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
          />

          <select
            value={sortBy}
            onChange={(e) => updateFilters({ sortBy: e.target.value })}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
          >
            <option value="createdAt">Sort: Ngày tạo</option>
            <option value="userName">Sort: Username</option>
          </select>

          <select
            value={sortDir}
            onChange={(e) => updateFilters({ sortDir: e.target.value })}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
          >
            <option value="desc">Giảm dần</option>
            <option value="asc">Tăng dần</option>
          </select>

          <button
            type="button"
            onClick={() => setSearchParams({})}
            className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:opacity-90"
          >
            Reset
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-[28px] bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[32px] border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="px-6 py-12 text-center text-sm font-medium text-slate-400">
            Đang tải danh sách comment...
          </div>
        ) : comments.length ? (
          <div className="divide-y divide-slate-100">
            {comments.map((comment) => (
              <div key={comment.id} className="px-6 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        Comment #{comment.id}
                      </span>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                        Post #{comment.postId}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          comment.isDeleted
                            ? "bg-rose-50 text-rose-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {comment.isDeleted ? "Đã ẩn" : "Đang hiển thị"}
                      </span>
                    </div>

                    <p className="text-sm font-black text-slate-900">
                      {comment.userFullName ||
                        comment.userName ||
                        comment.userId}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      @{comment.userName || "unknown-user"} •{" "}
                      {new Date(comment.createdAt).toLocaleString("vi-VN")}
                    </p>
                    <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      {comment.content || (
                        <span className="text-slate-400">
                          (Không có nội dung)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={submittingId === comment.id}
                      onClick={() => void handleToggleCommentState(comment)}
                      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold text-white transition disabled:opacity-60 ${
                        comment.isDeleted
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : "bg-rose-600 hover:bg-rose-700"
                      }`}
                    >
                      {comment.isDeleted ? (
                        <>
                          <RotateCcw size={16} />
                          Khôi phục
                        </>
                      ) : (
                        <>
                          <Trash2 size={16} />
                          Ẩn
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-sm font-medium text-slate-400">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <MessageSquareWarning size={20} />
            </div>
            Không có comment nào khớp bộ lọc hiện tại.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCommentsPage;


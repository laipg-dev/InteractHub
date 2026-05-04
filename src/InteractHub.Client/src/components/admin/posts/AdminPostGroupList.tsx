import type { AdminPostListItemDto } from "./types";

type Props = {
  title?: string;
  subtitle?: string;
  posts: AdminPostListItemDto[];
  selectedPostId: number | null;
  onSelectPost: (post: AdminPostListItemDto) => void;
  loading?: boolean;
  scrollable?: boolean;
};

const pillClass = (removed: boolean) =>
  removed
    ? "bg-rose-50 text-rose-600 border border-rose-200"
    : "bg-emerald-50 text-emerald-700 border border-emerald-200";

const AdminPostGroupList = ({
  title = "Danh sách bài viết",
  subtitle = "Chọn một bài viết để xem chi tiết.",
  posts,
  selectedPostId,
  onSelectPost,
  loading = false,
  scrollable = false,
}: Props) => {
  return (
    <div className="flex h-full flex-col rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 border-b border-slate-100 pb-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
          Posts
        </p>
        <h2 className="mt-1 text-lg font-black text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className={scrollable ? "flex-1 overflow-y-auto pr-1" : ""}>
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Đang tải danh sách bài viết...
          </div>
        ) : !posts.length ? (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            Chưa có bài viết nào để hiển thị.
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              const active = selectedPostId === post.id;
              const hashtags = Array.isArray(post.hashtags)
                ? post.hashtags
                : [];

              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => onSelectPost(post)}
                  className={`w-full rounded-[24px] border p-4 text-left transition ${
                    active
                      ? "border-slate-900 bg-slate-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-900">
                        Post #{post.id}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(post.createdAt).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${pillClass(post.isDeleted)}`}
                    >
                      {post.isDeleted ? "Đã ẩn" : "Đang hoạt động"}
                    </span>
                  </div>

                  {post.imageUrl ? (
                    <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                      <img
                        src={post.imageUrl}
                        alt={`Post ${post.id}`}
                        className="h-40 w-full object-cover"
                      />
                    </div>
                  ) : null}

                  <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                    {post.contentPreview || "Bài viết không có nội dung text."}
                  </p>

                  {hashtags.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {hashtags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-600"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4 grid grid-cols-4 gap-2 text-xs font-bold text-slate-500">
                    <div className="rounded-2xl bg-slate-100 px-3 py-2">
                      {post.likeCount} like
                    </div>
                    <div className="rounded-2xl bg-slate-100 px-3 py-2">
                      {post.commentCount} comment
                    </div>
                    <div className="rounded-2xl bg-amber-50 px-3 py-2 text-amber-700">
                      {post.reportCount} report
                    </div>
                    <div className="rounded-2xl bg-slate-100 px-3 py-2">
                      {post.currentFlag || "No flag"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPostGroupList;

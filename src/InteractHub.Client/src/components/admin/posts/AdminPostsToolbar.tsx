type SearchScope = "user" | "post";

type Props = {
  scope: SearchScope;
  query: string;
  postState: string;
  sortBy: string;
  sortDir: string;
  onScopeChange: (value: SearchScope) => void;
  onQueryChange: (value: string) => void;
  onPostStateChange: (value: string) => void;
  onSortByChange: (value: string) => void;
  onSortDirChange: (value: string) => void;
  onRefresh: () => void;
};

const USER_SORT_OPTIONS = [
  { value: "name", label: "Tên user" },
  { value: "postCount", label: "Số bài viết" },
  { value: "reportCount", label: "Tổng báo cáo" },
];

const POST_SORT_OPTIONS = [
  { value: "createdAt", label: "Ngày tạo" },
  { value: "reportCount", label: "Số report" },
  { value: "commentCount", label: "Số comment" },
  { value: "likeCount", label: "Số like" },
];

const AdminPostsToolbar = ({
  scope,
  query,
  postState,
  sortBy,
  sortDir,
  onScopeChange,
  onQueryChange,
  onPostStateChange,
  onSortByChange,
  onSortDirChange,
  onRefresh,
}: Props) => {
  const sortOptions = scope === "user" ? USER_SORT_OPTIONS : POST_SORT_OPTIONS;

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 xl:grid-cols-[180px_2fr_1.1fr_1.1fr_1fr]">
        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Phạm vi
          </span>
          <select
            value={scope}
            onChange={(e) => onScopeChange(e.target.value as SearchScope)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
          >
            <option value="user">User</option>
            <option value="post">Post</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Tìm kiếm
          </span>
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={
              scope === "user"
                ? "Tìm theo tên user, username..."
                : "Tìm theo nội dung bài viết, hashtag..."
            }
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Sắp xếp {scope}
          </span>
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
          {scope === "post" ? (
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Trạng thái post
              </span>
              <select
                value={postState}
                onChange={(e) => onPostStateChange(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
              >
                <option value="">Tất cả</option>
                <option value="active">Đang hoạt động</option>
                <option value="removed">Đã gỡ</option>
              </select>
            </label>
          ) : (
            <div />
          )}

          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Chiều sắp xếp
            </span>
            <select
              value={sortDir}
              onChange={(e) => onSortDirChange(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
            >
              <option value="desc">Giảm dần</option>
              <option value="asc">Tăng dần</option>
            </select>
          </label>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={onRefresh}
            className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:opacity-90"
          >
            Tải lại danh sách
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPostsToolbar;

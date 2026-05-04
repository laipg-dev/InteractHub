import type { AdminStoryListItemDto } from "./types";

type Props = {
  title?: string;
  subtitle?: string;
  stories: AdminStoryListItemDto[];
  selectedStoryId: number | null;
  onSelectStory: (story: AdminStoryListItemDto) => void;
  loading?: boolean;
  scrollable?: boolean;
};

const getBadgeClass = (story: AdminStoryListItemDto) => {
  if (story.isDeleted) {
    return "bg-rose-50 text-rose-600 border border-rose-200";
  }

  if (story.isExpired) {
    return "bg-amber-50 text-amber-700 border border-amber-200";
  }

  return "bg-emerald-50 text-emerald-700 border border-emerald-200";
};

const getBadgeLabel = (story: AdminStoryListItemDto) => {
  if (story.isDeleted) return "Đã gỡ";
  if (story.isExpired) return "Hết hạn";
  return "Hoạt động";
};

const AdminStoryList = ({
  title = "Danh sách story",
  subtitle = "Chọn một story để xem chi tiết.",
  stories,
  selectedStoryId,
  onSelectStory,
  loading = false,
  scrollable = false,
}: Props) => {
  return (
    <div className="flex h-full flex-col rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 border-b border-slate-100 pb-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
          Stories
        </p>
        <h2 className="mt-1 text-lg font-black text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className={scrollable ? "flex-1 overflow-y-auto pr-1" : ""}>
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Đang tải danh sách story...
          </div>
        ) : !stories.length ? (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            Chưa có story nào để hiển thị.
          </div>
        ) : (
          <div className="space-y-4">
            {stories.map((story) => {
              const active = selectedStoryId === story.id;
              return (
                <button
                  key={story.id}
                  type="button"
                  onClick={() => onSelectStory(story)}
                  className={`w-full rounded-[24px] border p-4 text-left transition ${
                    active
                      ? "border-slate-900 bg-slate-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-900">
                        Story #{story.id}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(story.createdAt).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${getBadgeClass(story)}`}
                    >
                      {getBadgeLabel(story)}
                    </span>
                  </div>

                  {story.imageUrl ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                      <img
                        src={story.imageUrl}
                        alt={`Story ${story.id}`}
                        className="h-44 w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
                      Story không có ảnh.
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminStoryList;

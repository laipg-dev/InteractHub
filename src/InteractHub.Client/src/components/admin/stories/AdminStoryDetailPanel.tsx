import { useEffect, useMemo, useState } from "react";
import api from "../../../api/axiosConfig";
import { subscribeRealtimeEvent } from "../../realtimeClient";
import type { AdminStoryDetailDto, AdminStoryListItemDto } from "./types";

type Props = {
  selectedStory: AdminStoryListItemDto | null;
  onStoryChanged: () => void;
};

type StoryStateChangedEvent = {
  eventType?: string;
  storyId?: number;
  actorUserId?: string | null;
};

const STORY_ADMIN_EVENTS = new Set([
  "admin_story_removed",
  "admin_story_restored",
]);

const AdminStoryDetailPanel = ({ selectedStory, onStoryChanged }: Props) => {
  const [detail, setDetail] = useState<AdminStoryDetailDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const storyId = selectedStory?.id ?? null;

  const loadDetail = async () => {
    if (!storyId) {
      setDetail(null);
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await api.get<AdminStoryDetailDto>(
        `/admin/stories/${storyId}`,
      );
      setDetail(response.data);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không tải được chi tiết story.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  useEffect(() => {
    if (!storyId) return;

    let unsubscribeStoryState: (() => void) | undefined;
    let cancelled = false;

    const setupRealtime = async () => {
      unsubscribeStoryState =
        await subscribeRealtimeEvent<StoryStateChangedEvent>(
          "story:state_changed",
          (payload) => {
            if (
              !payload?.eventType ||
              !STORY_ADMIN_EVENTS.has(payload.eventType)
            ) {
              return;
            }

            if (payload.storyId !== storyId) return;
            void loadDetail();
            onStoryChanged();
          },
        );

      if (cancelled) {
        unsubscribeStoryState?.();
      }
    };

    void setupRealtime();

    return () => {
      cancelled = true;
      unsubscribeStoryState?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  const statusText = useMemo(() => {
    if (!detail) return "";
    if (detail.isDeleted) return "Đã gỡ";
    if (detail.isExpired) return "Đã hết hạn";
    return "Đang hoạt động";
  }, [detail]);

  const handleToggleStoryState = async () => {
    if (!detail) return;

    setSaving(true);
    setMessage(null);

    try {
      await api.put(
        `/admin/stories/${detail.id}/removed-state?removed=${String(!detail.isDeleted)}`,
      );
      await loadDetail();
      onStoryChanged();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không đổi được trạng thái story.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!selectedStory) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-10">
        <p className="text-sm font-medium text-slate-500">
          Chọn một story để xem chi tiết.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {loading || !detail ? (
        <div className="flex flex-1 items-center justify-center py-20 text-sm text-slate-400">
          Đang tải chi tiết story...
        </div>
      ) : (
        <div className="flex h-full flex-col overflow-y-auto p-5">
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Story detail
              </p>
              <h3 className="text-xl font-black text-slate-900">
                Story #{detail.id}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Trạng thái hiện tại:{" "}
                <span className="font-bold">{statusText}</span>
              </p>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleToggleStoryState()}
              className={`rounded-2xl px-4 py-3 text-sm font-bold text-white ${
                detail.isDeleted ? "bg-emerald-600" : "bg-rose-600"
              }`}
            >
              {detail.isDeleted ? "Khôi phục story" : "Gỡ story"}
            </button>
          </div>

          {message ? (
            <div className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {message}
            </div>
          ) : null}

          <div className="mb-5 grid grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Tác giả
              </p>
              <p className="mt-2 font-bold text-slate-900">
                {detail.userFullName || detail.userName || "Unknown user"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Tạo lúc
              </p>
              <p className="mt-2 font-bold text-slate-900">
                {new Date(detail.createdAt).toLocaleString("vi-VN")}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Hết hạn lúc
              </p>
              <p className="mt-2 font-bold text-slate-900">
                {new Date(detail.expiresAt).toLocaleString("vi-VN")}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Tình trạng
              </p>
              <p className="mt-2 font-bold text-slate-900">{statusText}</p>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <h4 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-slate-400">
              Nội dung story
            </h4>

            {detail.imageUrl ? (
              <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-slate-100">
                <div className="flex h-[420px] items-center justify-center bg-slate-100 xl:h-[520px]">
                  <img
                    src={detail.imageUrl}
                    alt={`Story ${detail.id}`}
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>
            ) : (
              <div className="flex h-[420px] items-center justify-center rounded-[20px] border border-dashed border-slate-300 bg-white text-sm text-slate-400 xl:h-[520px]">
                Story này không có ảnh để hiển thị.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStoryDetailPanel;

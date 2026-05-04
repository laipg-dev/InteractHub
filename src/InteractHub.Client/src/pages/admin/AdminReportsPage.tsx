import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Eye, Filter, Search } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axiosConfig";
import { subscribeRealtimeEvent } from "../../components/realtimeClient";
import { useDebouncedValue } from "../../utils/useDebouncedValue";

type AdminReportListItem = {
  reportId: number;
  postId: number;
  reporterId: string;
  reporterName?: string | null;
  reason: string;
  description?: string | null;
  status: string;
  createdAt: string;
  totalReportsForPost: number;
  currentFlag?: string | null;
};

type NotificationCreatedEvent = {
  notification?: {
    type?: string;
    postId?: number | null;
  };
  unreadCount?: number;
};

const REPORT_STATUSES = [
  "all",
  "Pending",
  "Reviewed",
  "Resolved",
  "Rejected",
] as const;

const AdminReportsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [allReports, setAllReports] = useState<AdminReportListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const activeStatus = searchParams.get("status") || "all";
  const search = searchParams.get("q") || "";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortDir = searchParams.get("sortDir") || "desc";
  const postIdParam = searchParams.get("postId") || "";
  const debouncedSearch = useDebouncedValue(search, 350);

  const updateFilters = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === "all") next.delete(key);
      else next.set(key, value);
    });

    setSearchParams(next);
  };

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const postId = Number(postIdParam || 0);

      const response = await api.get(`/admin/reports`, {
        params: {
          query: debouncedSearch.trim() || undefined,
          status: activeStatus !== "all" ? activeStatus : undefined,
          sortBy: sortBy || undefined,
          sortDir: sortDir || undefined,
          postId: postId > 0 ? postId : undefined,
        },
      });
      setAllReports(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Lỗi tải danh sách report admin:", error);
      setAllReports([]);
    } finally {
      setLoading(false);
    }
  }, [activeStatus, debouncedSearch, postIdParam, sortBy, sortDir]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    let unsubscribeNew: (() => void) | undefined;
    let cancelled = false;

    const setupRealtime = async () => {
      unsubscribeNew = await subscribeRealtimeEvent<NotificationCreatedEvent>(
        "notification:new",
        (payload) => {
          const notificationType = payload?.notification?.type;
          if (notificationType === "PostReported") {
            // [SignalR] Khi admin nhận notification report mới,
            // làm mới lại list để tab Tất cả và các count phần ảnh ngay.
            void fetchReports();
          }
        },
      );

      if (cancelled) {
        unsubscribeNew?.();
      }
    };

    void setupRealtime();

    return () => {
      cancelled = true;
      unsubscribeNew?.();
    };
  }, [fetchReports]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Admin Reports</h1>
          <p className="mt-2 text-sm text-slate-500">
            Xem các báo cáo bài viết, đánh giá mức độ rủi ro và mở chi tiết để
            xử lý.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm">
          <AlertTriangle size={18} className="text-amber-500" />
          <span className="text-sm font-bold text-slate-700">
            {allReports.length} report đang hiển thị
          </span>
        </div>
      </div>

      <div className="mb-6 rounded-[28px] border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_180px_120px_120px]">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => updateFilters({ q: e.target.value || null })}
              placeholder="Tìm theo reporter, lý do, description..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <input
            value={postIdParam}
            onChange={(e) => updateFilters({ postId: e.target.value || null })}
            placeholder="PostId (tùy chọn)"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={sortBy}
            onChange={(e) => updateFilters({ sortBy: e.target.value })}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="createdAt">Sort: Ngày tạo</option>
            <option value="reportCount">Sort: Tổng report/post</option>
            <option value="status">Sort: Status</option>
            <option value="postId">Sort: PostId</option>
            <option value="reporterName">Sort: Reporter</option>
          </select>

          <select
            value={sortDir}
            onChange={(e) => updateFilters({ sortDir: e.target.value })}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="desc">Giảm dần</option>
            <option value="asc">Tăng dần</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSearchParams({});
            }}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 rounded-[28px] bg-white p-3 shadow-sm">
        {REPORT_STATUSES.map((status) => {
          const active = activeStatus === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => {
                updateFilters({ status: status === "all" ? null : status });
              }}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition ${
                active
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Filter size={14} />
              {status === "all" ? "All" : status}
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-[32px] border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="px-6 py-12 text-center text-sm font-medium text-slate-400">
            Đang tải danh sách report...
          </div>
        ) : allReports.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {allReports.map((report) => (
              <div key={report.reportId} className="px-6 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-600">
                        #{report.reportId}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        Post #{report.postId}
                      </span>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                        {report.currentFlag || "No flag"}
                      </span>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                        {report.status}
                      </span>
                    </div>

                    <p className="text-sm font-black text-slate-900">
                      {report.reporterName || report.reporterId}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Lý do:{" "}
                      <span className="font-semibold">{report.reason}</span>
                    </p>
                    {report.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                        {report.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs font-medium text-slate-400">
                      {new Date(report.createdAt).toLocaleString("vi-VN")} •{" "}
                      {report.totalReportsForPost} report cho post này
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/admin/reports/${report.reportId}`)
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                  >
                    <Eye size={16} />
                    Xem chi tiết
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-sm font-medium text-slate-400">
            Không có report nào trong bộ lọc hiện tại.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReportsPage;

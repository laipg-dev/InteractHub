import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ShieldAlert, Trash2, UserX } from "lucide-react";
import api from "../../api/axiosConfig";

type AdminReportDetail = {
  reportId: number;
  postId: number;
  reporterId: string;
  reporterName?: string | null;
  reason: string;
  description?: string | null;
  status: string;
  createdAt: string;
  postOwnerId: string;
  postOwnerName?: string | null;
  postContentPreview?: string | null;
  postImageUrl?: string | null;
  totalReportsForPost: number;
  spamCount: number;
  offensiveCount: number;
  fakeNewsCount: number;
  otherCount: number;
  currentFlag?: string | null;
  finalStatus?: string | null;
};

type ModerationDecision = "Safe" | "RemovePost" | "DisablePostOwner";

const AdminReportDetailPage = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<AdminReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [decision, setDecision] = useState<ModerationDecision>("Safe");
  const [reportStatus, setReportStatus] = useState("Reviewed");
  const [finalStatus, setFinalStatus] = useState("Safe");
  const [adminNote, setAdminNote] = useState("");
  const [notifyReporter, setNotifyReporter] = useState(true);
  const [notifyContentOwner, setNotifyContentOwner] = useState(false);

  const numericReportId = Number(reportId || 0);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/reports/${numericReportId}`);
      setReport(response.data || null);
    } catch (error) {
      console.error("Lỗi tải chi tiết report admin:", error);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!numericReportId) return;
    void fetchReport();
  }, [numericReportId]);

  useEffect(() => {
    if (decision === "Safe") {
      setFinalStatus("Safe");
      setNotifyContentOwner(false);
      return;
    }

    if (decision === "RemovePost") {
      setFinalStatus("Removed");
      setNotifyContentOwner(true);
      return;
    }

    if (decision === "DisablePostOwner") {
      setFinalStatus("Violating");
      setNotifyContentOwner(true);
    }
  }, [decision]);

  const stats = useMemo(() => {
    if (!report) return [];
    return [
      { label: "Spam", value: report.spamCount },
      { label: "Offensive", value: report.offensiveCount },
      { label: "FakeNews", value: report.fakeNewsCount },
      { label: "Other", value: report.otherCount },
    ];
  }, [report]);

  const handleSubmit = async () => {
    if (!report || submitting) return;

    try {
      setSubmitting(true);
      await api.put(`/admin/moderation/reports/${report.reportId}/review`, {
        decision,
        reportStatus,
        finalStatus,
        adminNote,
        notifyReporter,
        notifyContentOwner,
      });
      alert("Đã xử lý report thành công.");
      await fetchReport();
    } catch (error) {
      console.error("Lỗi xử lý report:", error);
      alert("Không thể xử lý report lúc này.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-16 text-center text-blue-600">
        Đang tải chi tiết report...
      </div>
    );
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-16 text-center">
        <p className="text-lg font-bold text-slate-700">
          Không tìm thấy report.
        </p>
        <button
          onClick={() => navigate("/admin/reports")}
          className="mt-4 rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <button
        onClick={() => navigate("/admin/reports")}
        className="mb-4 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 font-bold text-slate-700 shadow-sm"
      >
        <ArrowLeft size={16} />
        Quay lại danh sách report
      </button>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_420px]">
        <div className="space-y-6">
          <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-600">
                Report #{report.reportId}
              </span>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                {report.status}
              </span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                {report.currentFlag || "No flag"}
              </span>
            </div>

            <h1 className="text-2xl font-black text-slate-900">
              Chi tiết report bài viết
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Reporter:{" "}
              <span className="font-semibold">
                {report.reporterName || report.reporterId}
              </span>
            </p>
            <p className="text-sm text-slate-500">
              Chủ bài viết:{" "}
              <span className="font-semibold">
                {report.postOwnerName || report.postOwnerId}
              </span>
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Lý do: <span className="font-semibold">{report.reason}</span>
            </p>
            {report.description && (
              <p className="mt-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                {report.description}
              </p>
            )}
            <p className="mt-3 text-xs font-medium text-slate-400">
              Tạo lúc: {new Date(report.createdAt).toLocaleString("vi-VN")}
            </p>
          </div>

          <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-black text-slate-900">
              Nội dung bị báo cáo
            </h2>
            {report.postImageUrl ? (
              <img
                src={report.postImageUrl}
                alt="Post"
                className="mb-4 max-h-[520px] w-full rounded-[24px] object-contain bg-black"
              />
            ) : null}
            <div className="rounded-[24px] bg-slate-50 p-5 text-sm leading-7 text-slate-700">
              {report.postContentPreview ||
                "Bài viết không có nội dung text để preview."}
            </div>
          </div>

          <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-black text-slate-900">
              Thống kê report của post
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl bg-slate-50 px-4 py-4"
                >
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-900">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Tổng cộng{" "}
              <span className="font-bold">{report.totalReportsForPost}</span>{" "}
              report cho post này. Final status hiện tại:{" "}
              <span className="font-bold">{report.finalStatus || "N/A"}</span>
            </p>
          </div>
        </div>

        <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <ShieldAlert className="text-amber-500" size={22} />
            <h2 className="text-lg font-black text-slate-900">
              Quyết định moderation
            </h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Decision
              </label>
              <select
                value={decision}
                onChange={(e) =>
                  setDecision(e.target.value as ModerationDecision)
                }
                className="w-full rounded-2xl border border-gray-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Safe">Safe</option>
                <option value="RemovePost">RemovePost</option>
                <option value="DisablePostOwner">DisablePostOwner</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Report Status
              </label>
              <select
                value={reportStatus}
                onChange={(e) => setReportStatus(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Reviewed">Reviewed</option>
                <option value="Resolved">Resolved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Final Status
              </label>
              <select
                value={finalStatus}
                onChange={(e) => setFinalStatus(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Safe">Safe</option>
                <option value="UnderReview">UnderReview</option>
                <option value="Dangerous">Dangerous</option>
                <option value="Violating">Violating</option>
                <option value="Removed">Removed</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Ghi chú admin
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className="h-28 w-full resize-none rounded-2xl border border-gray-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ghi chú nội bộ hoặc lý do xử lý..."
              />
            </div>

            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={notifyReporter}
                onChange={(e) => setNotifyReporter(e.target.checked)}
              />
              Gửi thông báo ngược cho người đã report
            </label>

            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={notifyContentOwner}
                onChange={(e) => setNotifyContentOwner(e.target.checked)}
              />
              Gửi thông báo cho chủ bài viết nếu có action moderation
            </label>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? "Đang xử lý..." : "Xác nhận xử lý report"}
            </button>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm("Gỡ bài viết này ngay bây giờ?")) return;
                  await api.put(
                    `/admin/moderation/posts/${report.postId}/remove`,
                  );
                  alert("Đã gỡ bài viết.");
                  await fetchReport();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white hover:bg-rose-700"
              >
                <Trash2 size={16} />
                Gỡ post ngay
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (
                    !window.confirm(
                      "Vô hiệu hóa tài khoản chủ bài viết ngay bây giờ?",
                    )
                  )
                    return;
                  await api.put(
                    `/admin/moderation/users/${report.postOwnerId}/deactivate`,
                  );
                  alert("Đã vô hiệu hóa tài khoản.");
                  await fetchReport();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-700"
              >
                <UserX size={16} />
                Khóa tài khoản
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReportDetailPage;

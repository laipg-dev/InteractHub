using InteractHub.Core.DTOs;
using InteractHub.Core.Entities;
using InteractHub.Core.Interfaces;
using InteractHub.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InteractHub.Infrastructure.Services;

public class AdminReportService : IAdminReportService
{
    private readonly ApplicationDbContext _context;

    public AdminReportService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<AdminReportListItemDto>> GetReportsAsync(
        string? query = null,
        string? status = null,
        int? postId = null,
        string? reporterId = null,
        string? sortBy = null,
        string? sortDir = null)
    {
        var reportQuery = _context.PostReports
            .IgnoreQueryFilters()
            .Include(r => r.Reporter)
            .Include(r => r.Post)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<ReportStatus>(status, true, out var parsedStatus))
        {
            reportQuery = reportQuery.Where(r => r.Status == parsedStatus);
        }

        if (postId.HasValue && postId.Value > 0)
        {
            reportQuery = reportQuery.Where(r => r.PostId == postId.Value);
        }

        if (!string.IsNullOrWhiteSpace(reporterId))
        {
            reportQuery = reportQuery.Where(r => r.ReporterId == reporterId);
        }

        if (!string.IsNullOrWhiteSpace(query))
        {
            var keyword = query.Trim().ToLower();
            reportQuery = reportQuery.Where(r =>
                (r.Reason ?? string.Empty).ToLower().Contains(keyword) ||
                (r.Description ?? string.Empty).ToLower().Contains(keyword) ||
                (r.Reporter.UserName ?? string.Empty).ToLower().Contains(keyword) ||
                (r.Reporter.FullName ?? string.Empty).ToLower().Contains(keyword));
        }

        var summaries = _context.PostReportSummaries.IgnoreQueryFilters().AsQueryable();

        var descending = !string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase);

        var itemsQuery =
            from report in reportQuery
            join summary in summaries on report.PostId equals summary.PostId into summaryJoin
            from summary in summaryJoin.DefaultIfEmpty()
            select new
            {
                Report = report,
                Summary = summary,
                TotalReports = summary != null ? summary.TotalReports : 0,
                ReporterName = report.Reporter.FullName ?? report.Reporter.UserName
            };

        itemsQuery = (sortBy ?? "createdAt").ToLower() switch
        {
            "reportcount" => descending
                ? itemsQuery.OrderByDescending(x => x.TotalReports).ThenByDescending(x => x.Report.CreatedAt)
                : itemsQuery.OrderBy(x => x.TotalReports).ThenBy(x => x.Report.CreatedAt),
            "status" => descending
                ? itemsQuery.OrderByDescending(x => x.Report.Status).ThenByDescending(x => x.Report.CreatedAt)
                : itemsQuery.OrderBy(x => x.Report.Status).ThenBy(x => x.Report.CreatedAt),
            "postid" => descending
                ? itemsQuery.OrderByDescending(x => x.Report.PostId).ThenByDescending(x => x.Report.CreatedAt)
                : itemsQuery.OrderBy(x => x.Report.PostId).ThenBy(x => x.Report.CreatedAt),
            "reportername" => descending
                ? itemsQuery.OrderByDescending(x => x.ReporterName).ThenByDescending(x => x.Report.CreatedAt)
                : itemsQuery.OrderBy(x => x.ReporterName).ThenBy(x => x.Report.CreatedAt),
            _ => descending
                ? itemsQuery.OrderByDescending(x => x.Report.CreatedAt)
                : itemsQuery.OrderBy(x => x.Report.CreatedAt)
        };

        var items = await itemsQuery
            .Select(x => new AdminReportListItemDto
            {
                ReportId = x.Report.Id,
                PostId = x.Report.PostId,
                ReporterId = x.Report.ReporterId,
                ReporterName = x.ReporterName,
                Reason = x.Report.Reason,
                Description = x.Report.Description,
                Status = x.Report.Status.ToString(),
                CreatedAt = x.Report.CreatedAt,
                TotalReportsForPost = x.TotalReports,
                CurrentFlag = x.Summary != null ? x.Summary.Flag.ToString() : null
            })
            .ToListAsync();

        return items;
    }

    public async Task<AdminReportDetailDto?> GetReportByIdAsync(int reportId)
    {
        // [Admin] Tách truy vấn để luôn lấy được report/post/user kể cả khi post đã remove
        // hoặc user đã bị global query filter ẩn đi.
        var report = await _context.PostReports
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r => r.Id == reportId);

        if (report == null) return null;

        var reporter = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == report.ReporterId);

        var post = await _context.Posts
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Id == report.PostId);

        if (post == null)
        {
            return new AdminReportDetailDto
            {
                ReportId = report.Id,
                PostId = report.PostId,
                ReporterId = report.ReporterId,
                ReporterName = reporter?.FullName ?? reporter?.UserName,
                Reason = report.Reason,
                Description = report.Description,
                Status = report.Status.ToString(),
                CreatedAt = report.CreatedAt,
                PostOwnerId = string.Empty,
                PostOwnerName = "Nội dung đã bị xóa hoặc không còn truy cập được",
                PostContentPreview = "Post đã bị xóa khỏi hệ thống hoặc không còn dữ liệu nội dung.",
                PostImageUrl = null,
                TotalReportsForPost = 0,
                SpamCount = 0,
                OffensiveCount = 0,
                FakeNewsCount = 0,
                OtherCount = 0,
                CurrentFlag = null,
                FinalStatus = null
            };
        }

        var postOwner = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == post.UserId);

        var summary = await _context.PostReportSummaries
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.PostId == report.PostId);

        return new AdminReportDetailDto
        {
            ReportId = report.Id,
            PostId = report.PostId,
            ReporterId = report.ReporterId,
            ReporterName = reporter?.FullName ?? reporter?.UserName,
            Reason = report.Reason,
            Description = report.Description,
            Status = report.Status.ToString(),
            CreatedAt = report.CreatedAt,
            PostOwnerId = post.UserId,
            PostOwnerName = postOwner?.FullName ?? postOwner?.UserName,
            PostContentPreview = post.Content,
            PostImageUrl = post.ImageUrl,
            TotalReportsForPost = summary?.TotalReports ?? 0,
            SpamCount = summary?.SpamCount ?? 0,
            OffensiveCount = summary?.OffensiveCount ?? 0,
            FakeNewsCount = summary?.FakeNewsCount ?? 0,
            OtherCount = summary?.OtherCount ?? 0,
            CurrentFlag = summary?.Flag.ToString(),
            FinalStatus = summary?.FinalStatus.ToString()
        };
    }

    public async Task<bool> UpdateReportStatusAsync(int reportId, UpdatePostReportStatusRequest request)
    {
        var report = await _context.PostReports
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r => r.Id == reportId);
        if (report == null) return false;

        if (!Enum.TryParse<ReportStatus>(request.Status, true, out var parsedStatus))
            throw new Exception("Trạng thái report không hợp lệ.");

        var now = DateTime.UtcNow;
        report.Status = parsedStatus;
        report.UpdatedAt = now;

        if (!string.IsNullOrWhiteSpace(request.FinalStatus))
        {
            if (!Enum.TryParse<ContentFlag>(request.FinalStatus, true, out var parsedFlag))
            {
                throw new Exception("FinalStatus không hợp lệ.");
            }

            if (parsedFlag is not (ContentFlag.Safe or ContentFlag.Violating or ContentFlag.Removed))
            {
                throw new Exception("FinalStatus chỉ cho phép: Safe / Violating / Removed.");
            }

            var summary = await _context.PostReportSummaries
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.PostId == report.PostId);
            if (summary == null)
            {
                summary = new PostReportSummary
                {
                    PostId = report.PostId,
                    TotalReports = 1,
                    ReportsSinceLastReview = 0,
                    Flag = ContentFlag.UnderReview,
                    FinalStatus = ContentFlag.UnderReview
                };
                _context.PostReportSummaries.Add(summary);
            }

            summary.FinalStatus = parsedFlag;
            summary.Flag = parsedFlag;

            await PostVisibilityHelper.SetPostRemovedStateAsync(
                _context,
                report.PostId,
                removed: parsedFlag != ContentFlag.Safe);
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<int> CreateManualReportAsync(CreateManualPostReportRequest request, string adminUserId)
    {
        if (request.PostId <= 0)
        {
            throw new Exception("PostId không hợp lệ.");
        }

        var reason = request.Reason?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(reason))
        {
            throw new Exception("Lý do report không được để trống.");
        }

        var postExists = await _context.Posts
            .IgnoreQueryFilters()
            .AnyAsync(p => p.Id == request.PostId);
        if (!postExists)
        {
            throw new Exception("Bài viết không tồn tại hoặc không thể truy cập.");
        }

        var alreadyPending = await _context.PostReports
            .IgnoreQueryFilters()
            .AnyAsync(r =>
                r.PostId == request.PostId &&
                r.ReporterId == adminUserId &&
                r.Status == ReportStatus.Pending);
        if (alreadyPending)
        {
            throw new Exception("Bạn đã tạo report cho bài viết này rồi (đang chờ xử lý).");
        }

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var now = DateTime.UtcNow;

            var report = new PostReport
            {
                PostId = request.PostId,
                ReporterId = adminUserId,
                Reason = reason,
                Description = string.IsNullOrWhiteSpace(request.AdminNote) ? null : request.AdminNote.Trim(),
                Status = ReportStatus.Pending,
                CreatedAt = now,
                UpdatedAt = now
            };

            _context.PostReports.Add(report);

            var summary = await _context.PostReportSummaries
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.PostId == request.PostId);

            if (summary == null)
            {
                summary = new PostReportSummary
                {
                    PostId = request.PostId,
                    TotalReports = 0,
                    Flag = ContentFlag.UnderReview,
                    FinalStatus = ContentFlag.UnderReview,
                    ReportsSinceLastReview = 0
                };
                _context.PostReportSummaries.Add(summary);
            }

            summary.TotalReports++;
            summary.ReportsSinceLastReview++;

            var reasonLower = reason.ToLower();
            if (reasonLower.Contains("spam")) summary.SpamCount++;
            else if (reasonLower.Contains("offensive") || reasonLower.Contains("phản cảm")) summary.OffensiveCount++;
            else if (reasonLower.Contains("fake") || reasonLower.Contains("tin giả")) summary.FakeNewsCount++;
            else summary.OtherCount++;

            // Admin tạo report thủ công => ưu tiên đưa post vào queue kiểm duyệt.
            summary.Flag = summary.Flag == ContentFlag.Safe ? ContentFlag.UnderReview : summary.Flag;
            summary.LastEscalatedAt = now;

            if (summary.TotalReports >= 10 && summary.Flag != ContentFlag.Violating)
            {
                summary.Flag = ContentFlag.Dangerous;
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return report.Id;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
}

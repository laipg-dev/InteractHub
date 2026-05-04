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

        report.Status = parsedStatus;
        report.UpdatedAt = DateTime.UtcNow;

        var summary = await _context.PostReportSummaries
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.PostId == report.PostId);
        if (summary != null && !string.IsNullOrWhiteSpace(request.FinalStatus) && Enum.TryParse<ContentFlag>(request.FinalStatus, true, out var parsedFlag))
        {
            summary.FinalStatus = parsedFlag;
            summary.Flag = parsedFlag;
        }

        await _context.SaveChangesAsync();
        return true;
    }
}

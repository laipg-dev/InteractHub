using InteractHub.Core.DTOs;
using InteractHub.Core.Entities;
using InteractHub.Core.Interfaces;
using InteractHub.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InteractHub.Infrastructure.Services;

public class PostReportService : IPostReportService
{
    private readonly ApplicationDbContext _context;
    private readonly INotificationService _notificationService;

    public PostReportService(
        ApplicationDbContext context,
        INotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

    public async Task<bool> CreateReportAsync(CreateReportRequest request, string userId)
    {
        var post = await _context.Posts
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == request.PostId);

        if (post == null)
        {
            throw new Exception("Bài viết không tồn tại hoặc đã bị xóa.");
        }

        var hasReported = await _context.PostReports
            .AnyAsync(r =>
                r.PostId == request.PostId &&
                r.ReporterId == userId &&
                r.Status == ReportStatus.Pending);

        if (hasReported)
        {
            throw new Exception("Bạn đã báo cáo bài viết này rồi, hệ thống đang chờ xử lý.");
        }

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var report = new PostReport
            {
                PostId = request.PostId,
                ReporterId = userId,
                Reason = request.Reason,
                Description = request.Description,
                Status = ReportStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.PostReports.Add(report);

            var summary = await _context.PostReportSummaries
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

            var reasonLower = request.Reason.ToLower();
            if (reasonLower.Contains("spam")) summary.SpamCount++;
            else if (reasonLower.Contains("offensive") || reasonLower.Contains("phản cảm")) summary.OffensiveCount++;
            else if (reasonLower.Contains("fake") || reasonLower.Contains("tin giả")) summary.FakeNewsCount++;
            else summary.OtherCount++;

            // Nếu post đang safe thì không spam notify admin cho mọi report mới.
            // Chỉ escalation lại khi số report mới sau lần review đạt ngưỡng.
            var shouldEscalateToAdmin = summary.Flag != ContentFlag.Safe || summary.ReportsSinceLastReview >= 3;

            if (summary.TotalReports >= 10 && summary.Flag != ContentFlag.Violating)
            {
                summary.Flag = ContentFlag.Dangerous;
            }

            if (shouldEscalateToAdmin)
            {
                summary.Flag = summary.Flag == ContentFlag.Safe ? ContentFlag.UnderReview : summary.Flag;
                summary.LastEscalatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            if (shouldEscalateToAdmin)
            {
                var adminIds = await (
                    from userRole in _context.UserRoles
                    join role in _context.Roles on userRole.RoleId equals role.Id
                    where role.NormalizedName == "ADMIN"
                    select userRole.UserId
                )
                .Distinct()
                .ToListAsync();

                foreach (var adminId in adminIds)
                {
                    await _notificationService.CreateNotificationAsync(
                        adminId,
                        userId,
                        NotificationType.PostReported,
                        message: $"Có báo cáo mới cho bài viết #{request.PostId}. Lý do: {request.Reason}",
                        postId: request.PostId);
                }
            }

            await transaction.CommitAsync();
            return true;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
}

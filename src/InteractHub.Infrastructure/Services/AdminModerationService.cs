 using InteractHub.Core.DTOs;
using InteractHub.Core.Entities;
using InteractHub.Core.Interfaces;
using InteractHub.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InteractHub.Infrastructure.Services;

public class AdminModerationService : IAdminModerationService
{
    private readonly ApplicationDbContext _context;
    private readonly INotificationService _notificationService;

    public AdminModerationService(
        ApplicationDbContext context,
        INotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

    public async Task<bool> ReviewPostReportAsync(int reportId, ReviewPostReportRequest request, string adminUserId)
    {
        var report = await _context.PostReports
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r => r.Id == reportId);

        if (report == null) return false;

        var post = await _context.Posts
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Id == report.PostId);

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var now = DateTime.UtcNow;

            // Ghi thêm metadata review vào report cụ thể.
            report.HandlerId = adminUserId;
            report.ActionTaken = request.Decision.ToString();
            if (!Enum.TryParse<ReportStatus>(request.ReportStatus, true, out var requestedReportStatus))
            {
                throw new Exception("Trạng thái report không hợp lệ.");
            }

            // Direction A:
            // - FinalStatus chỉ là kết luận cuối: Safe / Violating / Removed
            // - Review sẽ chốt report về Resolved, trừ khi admin cố ý Reject report (chỉ hợp lệ khi Decision=Safe)
            var resolvedReportStatus = requestedReportStatus == ReportStatus.Rejected
                ? ReportStatus.Rejected
                : ReportStatus.Resolved;

            if (resolvedReportStatus == ReportStatus.Rejected && request.Decision != AdminModerationDecision.Safe)
            {
                throw new Exception("ReportStatus=Rejected chỉ hợp lệ khi Decision=Safe.");
            }

            report.Status = resolvedReportStatus;
            report.ReviewedAt = now;
            report.UpdatedAt = now;
            report.ReviewNote = request.AdminNote;

            var finalStatus = request.Decision switch
            {
                AdminModerationDecision.Safe => ContentFlag.Safe,
                AdminModerationDecision.RemovePost => ContentFlag.Removed,
                AdminModerationDecision.DisablePostOwner => ContentFlag.Violating,
                _ => ContentFlag.UnderReview
            };

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

            summary.LastReviewedAt = now;
            summary.LastReviewedByAdminId = adminUserId;
            summary.ReportsSinceLastReview = 0;
            summary.LastReviewDecision = request.Decision.ToString();
            summary.ReviewerNote = request.AdminNote;
            summary.FinalStatus = finalStatus;
            summary.Flag = finalStatus;

            switch (request.Decision)
            {
                case AdminModerationDecision.Safe:
                    if (post != null)
                    {
                        await PostVisibilityHelper.SetPostRemovedStateAsync(_context, post.Id, removed: false);
                    }
                    report.ResolutionMessage = $"Báo cáo cho bài viết #{report.PostId} đã được xem xét và nội dung hiện không vi phạm.";
                    break;

                case AdminModerationDecision.RemovePost:
                    await SoftDeletePostGraphAsync(report.PostId);
                    report.ResolutionMessage = $"Báo cáo cho bài viết #{report.PostId} đã được xử lý. Bài viết đã bị gỡ khỏi hệ thống.";
                    break;

                case AdminModerationDecision.DisablePostOwner:
                    if (post == null)
                    {
                        throw new Exception("Không thể xử lý vì bài viết không tồn tại hoặc không thể truy cập.");
                    }

                    await DeactivateUserInternalAsync(post.UserId);
                    report.ResolutionMessage = $"Báo cáo cho bài viết #{report.PostId} đã được xử lý. Tài khoản đăng nội dung đã bị hạn chế.";
                    break;
            }

            await _context.SaveChangesAsync();

            if (request.NotifyReporter)
            {
                await _notificationService.CreateNotificationAsync(
                    report.ReporterId,
                    adminUserId,
                    NotificationType.ReportResolved,
                    message: report.ResolutionMessage,
                    postId: report.PostId);
            }

            if (request.NotifyContentOwner)
            {
                var ownerMessage = request.Decision switch
                {
                    AdminModerationDecision.RemovePost => $"Bài viết #{report.PostId} của bạn đã bị gỡ sau khi admin xem xét báo cáo.",
                    AdminModerationDecision.DisablePostOwner => "Tài khoản của bạn đã bị hạn chế sau khi admin xem xét nội dung bị báo cáo.",
                    _ => null
                };

                var ownerNotificationType = request.Decision switch
                {
                    AdminModerationDecision.RemovePost => NotificationType.ContentRemoved,
                    AdminModerationDecision.DisablePostOwner => NotificationType.AccountRestricted,
                    _ => NotificationType.ContentRemoved
                };

                if (!string.IsNullOrWhiteSpace(ownerMessage))
                {
                    if (post == null)
                    {
                        throw new Exception("Không thể gửi thông báo vì bài viết không tồn tại hoặc không thể truy cập.");
                    }

                    await _notificationService.CreateNotificationAsync(
                        post.UserId,
                        adminUserId,
                        ownerNotificationType,
                        message: ownerMessage,
                        postId: report.PostId);
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

    public async Task<bool> DeactivateUserAsync(string targetUserId, string? adminNote = null)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == targetUserId);
        if (user == null) return false;

        await DeactivateUserInternalAsync(targetUserId);
        return true;
    }

    public async Task<bool> RemovePostAsync(int postId, string? adminNote = null)
    {
        var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == postId);
        if (post == null) return false;

        await SoftDeletePostGraphAsync(postId);
        return true;
    }

    public async Task<bool> RemoveCommentAsync(int commentId, string? adminNote = null)
    {
        var comment = await _context.Comments.FirstOrDefaultAsync(c => c.Id == commentId);
        if (comment == null) return false;

        comment.IsDeleted = true;
        comment.DeletedAt = DateTime.UtcNow;
        _context.Comments.Update(comment);
        await _context.SaveChangesAsync();
        return true;
    }

    private async Task SoftDeletePostGraphAsync(int postId)
    {
        var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == postId);
        if (post == null) return;

        post.IsDeleted = true;
        post.DeletedAt = DateTime.UtcNow;

        var comments = await _context.Comments
            .Where(c => c.PostId == postId && !c.IsDeleted)
            .ToListAsync();
        foreach (var comment in comments)
        {
            comment.IsDeleted = true;
            comment.DeletedAt = DateTime.UtcNow;
        }

        var likes = await _context.Likes
            .IgnoreQueryFilters()
            .Where(l => l.PostId == postId && !l.IsDeleted)
            .ToListAsync();
        foreach (var like in likes)
        {
            like.IsDeleted = true;
            like.DeletedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
    }

    private async Task DeactivateUserInternalAsync(string targetUserId)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == targetUserId);
        if (user == null) return;

        user.IsActive = false;

        var posts = await _context.Posts
            .Where(p => p.UserId == targetUserId && !p.IsDeleted)
            .ToListAsync();
        foreach (var post in posts)
        {
            post.IsDeleted = true;
            post.DeletedAt = DateTime.UtcNow;
        }

        var comments = await _context.Comments
            .Where(c => c.UserId == targetUserId && !c.IsDeleted)
            .ToListAsync();
        foreach (var comment in comments)
        {
            comment.IsDeleted = true;
            comment.DeletedAt = DateTime.UtcNow;
        }

        var likes = await _context.Likes
            .IgnoreQueryFilters()
            .Where(l => l.UserId == targetUserId && !l.IsDeleted)
            .ToListAsync();
        foreach (var like in likes)
        {
            like.IsDeleted = true;
            like.DeletedAt = DateTime.UtcNow;
        }

        var stories = await _context.Stories
            .Where(s => s.UserId == targetUserId && !s.IsDeleted)
            .ToListAsync();
        foreach (var story in stories)
        {
            story.IsDeleted = true;
            story.DeletedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
    }
}

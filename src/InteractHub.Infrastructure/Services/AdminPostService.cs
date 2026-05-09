using InteractHub.Core.DTOs;
using InteractHub.Core.Entities;
using InteractHub.Core.Interfaces;
using InteractHub.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using InteractHub.Core.Interfaces.Services;
namespace InteractHub.Infrastructure.Services;

public class AdminPostService : IAdminPostService
{
    private readonly ApplicationDbContext _context;
    private readonly IAppRealtimeDispatcher _appRealtimeDispatcher;
    private readonly INotificationService _notificationService;

    public AdminPostService(
        ApplicationDbContext context,
        IAppRealtimeDispatcher appRealtimeDispatcher,
        INotificationService notificationService)
    {
        _context = context;
        _appRealtimeDispatcher = appRealtimeDispatcher;
        _notificationService = notificationService;
    }

    public async Task<IReadOnlyList<AdminPostUserListItemDto>> GetUsersAsync(
        string? query = null,
        string? sortBy = null,
        string? sortDir = null)
    {
        var groups = await GetPostsGroupedByUserAsync(null, null, null, null, null);

        IEnumerable<AdminPostUserListItemDto> items = groups.Select(group => new AdminPostUserListItemDto
        {
            UserId = group.UserId,
            UserName = group.UserName,
            UserFullName = group.UserFullName,
            PostCount = group.PostCount,
            TotalReports = group.TotalReports
        });

        if (!string.IsNullOrWhiteSpace(query))
        {
            var keyword = query.Trim().ToLower();
            items = items.Where(item =>
                (item.UserName ?? string.Empty).ToLower().Contains(keyword) ||
                (item.UserFullName ?? string.Empty).ToLower().Contains(keyword));
        }

        var descending = !string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase);
        items = (sortBy ?? "name").ToLower() switch
        {
            "postcount" => descending
                ? items.OrderByDescending(item => item.PostCount).ThenBy(item => item.UserFullName ?? item.UserName ?? string.Empty)
                : items.OrderBy(item => item.PostCount).ThenBy(item => item.UserFullName ?? item.UserName ?? string.Empty),
            "reportcount" => descending
                ? items.OrderByDescending(item => item.TotalReports).ThenBy(item => item.UserFullName ?? item.UserName ?? string.Empty)
                : items.OrderBy(item => item.TotalReports).ThenBy(item => item.UserFullName ?? item.UserName ?? string.Empty),
            _ => descending
                ? items.OrderByDescending(item => item.UserFullName ?? item.UserName ?? string.Empty)
                : items.OrderBy(item => item.UserFullName ?? item.UserName ?? string.Empty)
        };

        return items.ToList();
    }

    public async Task<IReadOnlyList<AdminPostListItemDto>> GetPostsAsync(
        string? query = null,
        string? state = null,
        string? userId = null,
        string? sortBy = null,
        string? sortDir = null)
    {
        var posts = await _context.Posts
            .IgnoreQueryFilters()
            .Include(p => p.User)
            .Include(p => p.Hashtags)
            .ToListAsync();

        var summaries = await _context.PostReportSummaries
            .IgnoreQueryFilters()
            .ToDictionaryAsync(s => s.PostId, s => s);

        var likeCounts = await _context.Likes
            .IgnoreQueryFilters()
            .Where(l => !l.IsDeleted)
            .GroupBy(l => l.PostId)
            .Select(g => new { PostId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.PostId, x => x.Count);

        var commentCounts = await _context.Comments
            .IgnoreQueryFilters()
            .Where(c => !c.IsDeleted)
            .GroupBy(c => c.PostId)
            .Select(g => new { PostId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.PostId, x => x.Count);

        IEnumerable<AdminPostListItemDto> items = posts.Select(post =>
        {
            summaries.TryGetValue(post.Id, out var summary);
            likeCounts.TryGetValue(post.Id, out var likeCount);
            commentCounts.TryGetValue(post.Id, out var commentCount);

            return new AdminPostListItemDto
            {
                Id = post.Id,
                UserId = post.UserId,
                UserName = post.User?.UserName,
                UserFullName = post.User?.FullName,
                ContentPreview = string.IsNullOrWhiteSpace(post.Content)
                    ? null
                    : (post.Content.Length > 180 ? post.Content[..180] + "..." : post.Content),
                ImageUrl = post.ImageUrl,
                IsDeleted = post.IsDeleted,
                CreatedAt = post.CreatedAt,
                DeletedAt = post.DeletedAt,
                LikeCount = likeCount,
                CommentCount = commentCount,
                ReportCount = summary?.TotalReports ?? 0,
                CurrentFlag = summary?.Flag.ToString(),
                Hashtags = post.Hashtags.Select(h => h.Name).ToList()
            };
        });

        items = ApplyPostFilters(items, query, state, userId);
        items = ApplyPostSorting(items, sortBy, sortDir);

        return items.ToList();
    }

    public async Task<IReadOnlyList<AdminPostUserGroupDto>> GetPostsGroupedByUserAsync(
        string? query = null,
        string? state = null,
        string? userId = null,
        string? sortBy = null,
        string? sortDir = null)
    {
        var posts = await GetPostsAsync(query, state, userId, sortBy, sortDir);

        return posts
            .GroupBy(post => new { post.UserId, post.UserName, post.UserFullName })
            .Select(group => new AdminPostUserGroupDto
            {
                UserId = group.Key.UserId,
                UserName = group.Key.UserName,
                UserFullName = group.Key.UserFullName,
                PostCount = group.Count(),
                TotalReports = group.Sum(post => post.ReportCount),
                Posts = group.ToList()
            })
            .OrderBy(group => group.UserFullName ?? group.UserName ?? string.Empty)
            .ToList();
    }

    public async Task<AdminPostDetailDto?> GetPostByIdAsync(int postId)
    {
        var post = await _context.Posts
            .IgnoreQueryFilters()
            .Include(p => p.User)
            .Include(p => p.Hashtags)
            .FirstOrDefaultAsync(p => p.Id == postId);

        if (post == null) return null;

        var summary = await _context.PostReportSummaries
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.PostId == postId);

        var comments = await _context.Comments
            .IgnoreQueryFilters()
            .Where(c => c.PostId == postId)
            .Include(c => c.User)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        var likeCount = await _context.Likes
            .IgnoreQueryFilters()
            .CountAsync(l => l.PostId == postId && !l.IsDeleted);

        return new AdminPostDetailDto
        {
            Id = post.Id,
            UserId = post.UserId,
            UserName = post.User?.UserName,
            UserFullName = post.User?.FullName,
            UserAvatarUrl = post.User?.AvatarUrl,
            Content = post.Content,
            ImageUrl = post.ImageUrl,
            IsDeleted = post.IsDeleted,
            CreatedAt = post.CreatedAt,
            DeletedAt = post.DeletedAt,
            LikeCount = likeCount,
            ActiveCommentCount = comments.Count(c => !c.IsDeleted),
            TotalCommentCount = comments.Count,
            ReportCount = summary?.TotalReports ?? 0,
            CurrentFlag = summary?.Flag.ToString(),
            FinalStatus = summary?.FinalStatus.ToString(),
            Hashtags = post.Hashtags.Select(h => h.Name).ToList(),
            Comments = comments.Select(c => new AdminCommentListItemDto
            {
                Id = c.Id,
                PostId = c.PostId,
                UserId = c.UserId,
                UserName = c.User?.UserName,
                UserFullName = c.User?.FullName,
                Content = c.Content,
                IsDeleted = c.IsDeleted,
                CreatedAt = c.CreatedAt,
                DeletedAt = c.DeletedAt
            }).ToList()
        };
    }

    public async Task<AdminPostDetailDto?> UpdatePostAsync(int postId, UpdateAdminPostRequest request, string adminUserId)
    {
        var post = await _context.Posts
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Id == postId);

        if (post == null) return null;

        post.Content = request.Content?.Trim() ?? string.Empty;
        post.ImageUrl = string.IsNullOrWhiteSpace(request.ImageUrl)
            ? null
            : request.ImageUrl.Trim();

        await _context.SaveChangesAsync();

        await NotifyPostOwnerAsync(
            post.UserId,
            adminUserId,
            NotificationType.ContentRemoved,
            "Bài viết của bạn đã được quản trị viên cập nhật để phù hợp hơn với tiêu chuẩn cộng đồng.",
            post.Id);

        await DispatchPostRealtimeAsync(post.Id, post.UserId, "admin_post_updated", adminUserId);
        return await GetPostByIdAsync(postId);
    }

    public async Task<IReadOnlyList<AdminCommentListItemDto>> GetCommentsAsync(
        int postId,
        string? query = null,
        string? state = null,
        string? sortBy = null,
        string? sortDir = null)
    {
        var comments = await _context.Comments
            .IgnoreQueryFilters()
            .Where(c => c.PostId == postId)
            .Include(c => c.User)
            .ToListAsync();

        IEnumerable<AdminCommentListItemDto> items = comments.Select(comment => new AdminCommentListItemDto
        {
            Id = comment.Id,
            PostId = comment.PostId,
            UserId = comment.UserId,
            UserName = comment.User?.UserName,
            UserFullName = comment.User?.FullName,
            Content = comment.Content,
            IsDeleted = comment.IsDeleted,
            CreatedAt = comment.CreatedAt,
            DeletedAt = comment.DeletedAt
        });

        if (!string.IsNullOrWhiteSpace(state))
        {
            items = state.ToLower() switch
            {
                "active" => items.Where(item => !item.IsDeleted),
                "removed" => items.Where(item => item.IsDeleted),
                _ => items
            };
        }

        if (!string.IsNullOrWhiteSpace(query))
        {
            var keyword = query.Trim().ToLower();
            items = items.Where(item =>
                (item.UserName ?? string.Empty).ToLower().Contains(keyword) ||
                (item.UserFullName ?? string.Empty).ToLower().Contains(keyword) ||
                (item.Content ?? string.Empty).ToLower().Contains(keyword));
        }

        items = ApplyCommentSorting(items, sortBy, sortDir);
        return items.ToList();
    }

    public async Task<IReadOnlyList<AdminCommentListItemDto>> GetAllCommentsAsync(
        string? query = null,
        string? state = null,
        int? postId = null,
        string? userId = null,
        string? sortBy = null,
        string? sortDir = null)
    {
        var commentQuery = _context.Comments
            .IgnoreQueryFilters()
            .Include(c => c.User)
            .Include(c => c.Post)
            .ThenInclude(p => p.User)
            .AsQueryable();

        if (postId.HasValue && postId.Value > 0)
        {
            commentQuery = commentQuery.Where(c => c.PostId == postId.Value);
        }

        if (!string.IsNullOrWhiteSpace(userId))
        {
            commentQuery = commentQuery.Where(c => c.UserId == userId);
        }

        var comments = await commentQuery.ToListAsync();

        IEnumerable<Comment> filtered = comments;

        if (!string.IsNullOrWhiteSpace(state))
        {
            filtered = state.ToLower() switch
            {
                "active" => filtered.Where(item => !item.IsDeleted),
                "removed" => filtered.Where(item => item.IsDeleted),
                _ => filtered
            };
        }

        if (!string.IsNullOrWhiteSpace(query))
        {
            var keyword = query.Trim().ToLower();
            var parsedPostId = int.TryParse(keyword, out var numericPostId) ? numericPostId : (int?)null;

            filtered = filtered.Where(comment =>
                (comment.User?.UserName ?? string.Empty).ToLower().Contains(keyword) ||
                (comment.User?.FullName ?? string.Empty).ToLower().Contains(keyword) ||
                (comment.Content ?? string.Empty).ToLower().Contains(keyword) ||
                (comment.Post?.Content ?? string.Empty).ToLower().Contains(keyword) ||
                (comment.Post?.User?.UserName ?? string.Empty).ToLower().Contains(keyword) ||
                (comment.Post?.User?.FullName ?? string.Empty).ToLower().Contains(keyword) ||
                (parsedPostId.HasValue && comment.PostId == parsedPostId.Value));
        }

        var items = filtered.Select(comment => new AdminCommentListItemDto
        {
            Id = comment.Id,
            PostId = comment.PostId,
            UserId = comment.UserId,
            UserName = comment.User?.UserName,
            UserFullName = comment.User?.FullName,
            Content = comment.Content,
            IsDeleted = comment.IsDeleted,
            CreatedAt = comment.CreatedAt,
            DeletedAt = comment.DeletedAt
        });

        items = ApplyCommentSorting(items, sortBy, sortDir);
        return items.ToList();
    }

    public async Task<bool> SetPostRemovedStateAsync(int postId, bool removed, string adminUserId)
    {
        var post = await _context.Posts
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Id == postId);

        if (post == null) return false;

        var now = DateTime.UtcNow;

        post.IsDeleted = removed;
        post.DeletedAt = removed ? now : null;

        var comments = await _context.Comments
            .IgnoreQueryFilters()
            .Where(c => c.PostId == postId)
            .ToListAsync();
        foreach (var comment in comments)
        {
            comment.IsDeleted = removed;
            comment.DeletedAt = removed ? now : null;
        }

        var likes = await _context.Likes
            .IgnoreQueryFilters()
            .Where(l => l.PostId == postId)
            .ToListAsync();
        foreach (var like in likes)
        {
            like.IsDeleted = removed;
            like.DeletedAt = removed ? now : null;
        }

        // Đồng bộ 2 chiều report <-> post (Direction A: FinalStatus là kết luận cuối).
        var finalStatus = removed ? ContentFlag.Removed : ContentFlag.Safe;

        var summary = await _context.PostReportSummaries
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.PostId == postId);
        if (summary == null)
        {
            summary = new PostReportSummary
            {
                PostId = postId,
                TotalReports = 0,
                ReportsSinceLastReview = 0,
                Flag = ContentFlag.UnderReview,
                FinalStatus = ContentFlag.UnderReview
            };
            _context.PostReportSummaries.Add(summary);
        }

        summary.LastReviewedAt = now;
        summary.LastReviewedByAdminId = adminUserId;
        summary.ReportsSinceLastReview = 0;
        summary.LastReviewDecision = removed
            ? AdminModerationDecision.RemovePost.ToString()
            : AdminModerationDecision.Safe.ToString();
        summary.ReviewerNote = removed
            ? "Removed via Post Management"
            : "Restored via Post Management";
        summary.FinalStatus = finalStatus;
        summary.Flag = finalStatus;

        var reports = await _context.PostReports
            .IgnoreQueryFilters()
            .Where(r => r.PostId == postId)
            .ToListAsync();

        foreach (var report in reports)
        {
            report.Status = ReportStatus.Resolved;
            report.UpdatedAt = now;
            report.HandlerId = adminUserId;
            report.ReviewedAt = report.ReviewedAt ?? now;
            report.ActionTaken = removed
                ? AdminModerationDecision.RemovePost.ToString()
                : AdminModerationDecision.Safe.ToString();
            report.ReviewNote ??= summary.ReviewerNote;
        }

        await _context.SaveChangesAsync();

        await NotifyPostOwnerAsync(
            post.UserId,
            adminUserId,
            removed ? NotificationType.ContentRemoved : NotificationType.ReportResolved,
            removed
                ? "Bài viết của bạn đã bị quản trị viên gỡ khỏi hệ thống vì vi phạm tiêu chuẩn cộng đồng."
                : "Bài viết của bạn đã được quản trị viên khôi phục và có thể hiển thị trở lại.",
            post.Id);

        await DispatchPostRealtimeAsync(
            post.Id,
            post.UserId,
            removed ? "admin_post_removed" : "admin_post_restored",
            adminUserId);
        return true;
    }

    public async Task<bool> SetCommentRemovedStateAsync(int commentId, bool removed, string adminUserId)
    {
        var comment = await _context.Comments
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Id == commentId);

        if (comment == null) return false;

        comment.IsDeleted = removed;
        comment.DeletedAt = removed ? DateTime.UtcNow : null;
        await _context.SaveChangesAsync();

        var post = await _context.Posts
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Id == comment.PostId);

        if (post == null) return true;

        await NotifyPostOwnerAsync(
            post.UserId,
            adminUserId,
            removed ? NotificationType.ContentRemoved : NotificationType.ReportResolved,
            removed
                ? "Một bình luận trong bài viết của bạn đã bị quản trị viên gỡ khỏi hệ thống."
                : "Một bình luận trong bài viết của bạn đã được quản trị viên khôi phục.",
            post.Id,
            comment.Id);

        var likeCount = await _context.Likes
            .IgnoreQueryFilters()
            .CountAsync(l => l.PostId == comment.PostId && !l.IsDeleted);

        var commentCount = await _context.Comments
            .IgnoreQueryFilters()
            .CountAsync(c => c.PostId == comment.PostId && !c.IsDeleted);

        await _appRealtimeDispatcher.PushPostInteractionAsync(
            post.UserId,
            removed ? "admin_comment_removed" : "admin_comment_restored",
            comment.PostId,
            likeCount,
            commentCount,
            comment.Id,
            adminUserId);

        return true;
    }

    private async Task NotifyPostOwnerAsync(
        string receiverId,
        string adminUserId,
        NotificationType type,
        string message,
        int postId,
        int? commentId = null)
    {
        if (string.IsNullOrWhiteSpace(receiverId) || string.IsNullOrWhiteSpace(adminUserId))
        {
            return;
        }

        await _notificationService.CreateNotificationAsync(
            receiverId,
            adminUserId,
            type,
            message,
            postId,
            commentId,
            null);
    }

    private async Task DispatchPostRealtimeAsync(int postId, string postOwnerId, string eventType, string? actorUserId = null)
    {
        if (string.IsNullOrWhiteSpace(postOwnerId))
        {
            return;
        }

        var likeCount = await _context.Likes
            .IgnoreQueryFilters()
            .CountAsync(l => l.PostId == postId && !l.IsDeleted);

        var commentCount = await _context.Comments
            .IgnoreQueryFilters()
            .CountAsync(c => c.PostId == postId && !c.IsDeleted);

        await _appRealtimeDispatcher.PushPostInteractionAsync(
            postOwnerId,
            eventType,
            postId,
            likeCount,
            commentCount,
            null,
            actorUserId);
    }

    private static IEnumerable<AdminPostListItemDto> ApplyPostFilters(
        IEnumerable<AdminPostListItemDto> items,
        string? query,
        string? state,
        string? userId)
    {
        if (!string.IsNullOrWhiteSpace(userId))
        {
            items = items.Where(item => item.UserId == userId);
        }

        if (!string.IsNullOrWhiteSpace(state))
        {
            items = state.ToLower() switch
            {
                "active" => items.Where(item => !item.IsDeleted),
                "removed" => items.Where(item => item.IsDeleted),
                _ => items
            };
        }

        if (!string.IsNullOrWhiteSpace(query))
        {
            var keyword = query.Trim().ToLower();
            items = items.Where(item =>
                (item.UserName ?? string.Empty).ToLower().Contains(keyword) ||
                (item.UserFullName ?? string.Empty).ToLower().Contains(keyword) ||
                (item.ContentPreview ?? string.Empty).ToLower().Contains(keyword) ||
                item.Hashtags.Any(tag => tag.ToLower().Contains(keyword) || $"#{tag}".ToLower().Contains(keyword)));
        }

        return items;
    }

    private static IEnumerable<AdminPostListItemDto> ApplyPostSorting(
        IEnumerable<AdminPostListItemDto> items,
        string? sortBy,
        string? sortDir)
    {
        var descending = !string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase);

        return (sortBy ?? "createdAt").ToLower() switch
        {
            "reportcount" => descending
                ? items.OrderByDescending(item => item.ReportCount).ThenByDescending(item => item.CreatedAt)
                : items.OrderBy(item => item.ReportCount).ThenBy(item => item.CreatedAt),
            "commentcount" => descending
                ? items.OrderByDescending(item => item.CommentCount).ThenByDescending(item => item.CreatedAt)
                : items.OrderBy(item => item.CommentCount).ThenBy(item => item.CreatedAt),
            "likecount" => descending
                ? items.OrderByDescending(item => item.LikeCount).ThenByDescending(item => item.CreatedAt)
                : items.OrderBy(item => item.LikeCount).ThenBy(item => item.CreatedAt),
            _ => descending
                ? items.OrderByDescending(item => item.CreatedAt)
                : items.OrderBy(item => item.CreatedAt)
        };
    }

    private static IEnumerable<AdminCommentListItemDto> ApplyCommentSorting(
        IEnumerable<AdminCommentListItemDto> items,
        string? sortBy,
        string? sortDir)
    {
        var descending = !string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase);

        return (sortBy ?? "createdAt").ToLower() switch
        {
            "username" => descending
                ? items.OrderByDescending(item => item.UserName ?? string.Empty).ThenByDescending(item => item.CreatedAt)
                : items.OrderBy(item => item.UserName ?? string.Empty).ThenBy(item => item.CreatedAt),
            _ => descending
                ? items.OrderByDescending(item => item.CreatedAt)
                : items.OrderBy(item => item.CreatedAt)
        };
    }
}

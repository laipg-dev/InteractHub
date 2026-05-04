using InteractHub.Core.DTOs;
using InteractHub.Core.Entities;
using InteractHub.Core.Interfaces;
using InteractHub.Core.Interfaces.Services;
using InteractHub.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InteractHub.Infrastructure.Services;

public class AdminStoryService : IAdminStoryService
{
    private readonly ApplicationDbContext _context;
    private readonly INotificationService _notificationService;
    private readonly IAppRealtimeDispatcher _appRealtimeDispatcher;

    public AdminStoryService(
        ApplicationDbContext context,
        INotificationService notificationService,
        IAppRealtimeDispatcher appRealtimeDispatcher)
    {
        _context = context;
        _notificationService = notificationService;
        _appRealtimeDispatcher = appRealtimeDispatcher;
    }

    public async Task<IReadOnlyList<AdminStoryUserListItemDto>> GetUsersAsync(
        string? query = null,
        string? sortBy = null,
        string? sortDir = null)
    {
        var groups = await GetStoriesGroupedByUserAsync();

        IEnumerable<AdminStoryUserListItemDto> items = groups.Select(group => new AdminStoryUserListItemDto
        {
            UserId = group.UserId,
            UserName = group.UserName,
            UserFullName = group.UserFullName,
            UserAvatarUrl = group.UserAvatarUrl,
            StoryCount = group.StoryCount,
            ActiveStoryCount = group.ActiveStoryCount
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
            "storycount" => descending
                ? items.OrderByDescending(item => item.StoryCount).ThenBy(item => item.UserFullName ?? item.UserName ?? string.Empty)
                : items.OrderBy(item => item.StoryCount).ThenBy(item => item.UserFullName ?? item.UserName ?? string.Empty),
            "activestorycount" => descending
                ? items.OrderByDescending(item => item.ActiveStoryCount).ThenBy(item => item.UserFullName ?? item.UserName ?? string.Empty)
                : items.OrderBy(item => item.ActiveStoryCount).ThenBy(item => item.UserFullName ?? item.UserName ?? string.Empty),
            _ => descending
                ? items.OrderByDescending(item => item.UserFullName ?? item.UserName ?? string.Empty)
                : items.OrderBy(item => item.UserFullName ?? item.UserName ?? string.Empty)
        };

        return items.ToList();
    }

    public async Task<IReadOnlyList<AdminStoryListItemDto>> GetStoriesAsync(
        string? query = null,
        string? state = null,
        string? userId = null,
        string? sortBy = null,
        string? sortDir = null)
    {
        var now = DateTime.UtcNow;

        var stories = await _context.Stories
            .IgnoreQueryFilters()
            .Include(s => s.User)
            .ToListAsync();

        IEnumerable<AdminStoryListItemDto> items = stories.Select(story =>
        {
            var expiresAt = story.CreatedAt.AddHours(24);
            return new AdminStoryListItemDto
            {
                Id = story.Id,
                UserId = story.UserId,
                UserName = story.User?.UserName,
                UserFullName = story.User?.FullName,
                UserAvatarUrl = story.User?.AvatarUrl,
                ImageUrl = story.ImageUrl,
                IsDeleted = story.IsDeleted,
                CreatedAt = story.CreatedAt,
                DeletedAt = story.DeletedAt,
                IsExpired = expiresAt <= now,
                ExpiresAt = expiresAt
            };
        });

        if (!string.IsNullOrWhiteSpace(userId))
        {
            items = items.Where(item => item.UserId == userId);
        }

        if (!string.IsNullOrWhiteSpace(state))
        {
            items = state.ToLower() switch
            {
                "active" => items.Where(item => !item.IsDeleted && !item.IsExpired),
                "removed" => items.Where(item => item.IsDeleted),
                "expired" => items.Where(item => !item.IsDeleted && item.IsExpired),
                _ => items
            };
        }

        if (!string.IsNullOrWhiteSpace(query))
        {
            var keyword = query.Trim().ToLower();
            items = items.Where(item =>
                (item.UserName ?? string.Empty).ToLower().Contains(keyword) ||
                (item.UserFullName ?? string.Empty).ToLower().Contains(keyword));
        }

        var descending = !string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase);
        items = (sortBy ?? "createdAt").ToLower() switch
        {
            "expiresat" => descending
                ? items.OrderByDescending(item => item.ExpiresAt).ThenByDescending(item => item.CreatedAt)
                : items.OrderBy(item => item.ExpiresAt).ThenBy(item => item.CreatedAt),
            _ => descending
                ? items.OrderByDescending(item => item.CreatedAt)
                : items.OrderBy(item => item.CreatedAt)
        };

        return items.ToList();
    }

    public async Task<IReadOnlyList<AdminStoryUserGroupDto>> GetStoriesGroupedByUserAsync(
        string? query = null,
        string? state = null,
        string? userId = null,
        string? sortBy = null,
        string? sortDir = null)
    {
        var stories = await GetStoriesAsync(query, state, userId, sortBy, sortDir);

        return stories
            .GroupBy(story => new { story.UserId, story.UserName, story.UserFullName, story.UserAvatarUrl })
            .Select(group => new AdminStoryUserGroupDto
            {
                UserId = group.Key.UserId,
                UserName = group.Key.UserName,
                UserFullName = group.Key.UserFullName,
                UserAvatarUrl = group.Key.UserAvatarUrl,
                StoryCount = group.Count(),
                ActiveStoryCount = group.Count(story => !story.IsDeleted && !story.IsExpired),
                Stories = group.ToList()
            })
            .OrderBy(group => group.UserFullName ?? group.UserName ?? string.Empty)
            .ToList();
    }

    public async Task<AdminStoryDetailDto?> GetStoryByIdAsync(int storyId)
    {
        var now = DateTime.UtcNow;

        var story = await _context.Stories
            .IgnoreQueryFilters()
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Id == storyId);

        if (story == null) return null;

        var expiresAt = story.CreatedAt.AddHours(24);

        return new AdminStoryDetailDto
        {
            Id = story.Id,
            UserId = story.UserId,
            UserName = story.User?.UserName,
            UserFullName = story.User?.FullName,
            UserAvatarUrl = story.User?.AvatarUrl,
            ImageUrl = story.ImageUrl,
            IsDeleted = story.IsDeleted,
            CreatedAt = story.CreatedAt,
            DeletedAt = story.DeletedAt,
            IsExpired = expiresAt <= now,
            ExpiresAt = expiresAt
        };
    }

    public async Task<bool> SetStoryRemovedStateAsync(int storyId, bool removed, string adminUserId)
    {
        var story = await _context.Stories
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.Id == storyId);

        if (story == null) return false;

        story.IsDeleted = removed;
        story.DeletedAt = removed ? DateTime.UtcNow : null;
        await _context.SaveChangesAsync();

        if (!string.IsNullOrWhiteSpace(adminUserId))
        {
            await _notificationService.CreateNotificationAsync(
                story.UserId,
                adminUserId,
                removed ? NotificationType.ContentRemoved : NotificationType.ReportResolved,
                removed
                    ? "Story của bạn đã bị quản trị viên gỡ khỏi hệ thống."
                    : "Story của bạn đã được quản trị viên khôi phục.",
                null,
                null,
                story.Id);

            await _appRealtimeDispatcher.PushStoryStateChangedAsync(
                story.UserId,
                removed ? "admin_story_removed" : "admin_story_restored",
                story.Id,
                adminUserId);
        }

        return true;
    }
}

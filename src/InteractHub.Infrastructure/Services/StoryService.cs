using Microsoft.EntityFrameworkCore;
using InteractHub.Core.Entities;
using InteractHub.Core.Interfaces;
using InteractHub.Core.Interfaces.Services;
using InteractHub.Infrastructure.Data;

namespace InteractHub.Infrastructure.Services;

public class StoryService : IStoryService
{
    private readonly ApplicationDbContext _context;
    private readonly INotificationService _notificationService;
    private readonly IAppRealtimeDispatcher _appRealtimeDispatcher;

    public StoryService(
        ApplicationDbContext context,
        INotificationService notificationService,
        IAppRealtimeDispatcher appRealtimeDispatcher)
    {
        _context = context;
        _notificationService = notificationService;
        _appRealtimeDispatcher = appRealtimeDispatcher;
    }

    public async Task<bool> CreateStoryAsync(string userId, string imageUrl)
    {
        var story = new Story
        {
            UserId = userId,
            ImageUrl = imageUrl,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddHours(24) // Tự động hết hạn sau 24h
        };

        _context.Stories.Add(story);
        var saved = await _context.SaveChangesAsync() > 0;
        if (!saved) return false;

        var friendIds = await _context.Friendships
            .Where(f => (f.UserId == userId || f.FriendId == userId) && f.IsAccepted)
            .Select(f => f.UserId == userId ? f.FriendId : f.UserId)
            .Distinct()
            .ToListAsync();

        foreach (var friendId in friendIds)
        {
            // [Notification] Mỗi người bạn nhận một notification NewStory riêng.
            await _notificationService.CreateNotificationAsync(
                friendId,
                userId,
                NotificationType.NewStory,
                storyId: story.Id);
        }

        // [SignalR] Ngoài notification, phát thêm event story:new để FE có thể refresh story bar ngay.
        await _appRealtimeDispatcher.PushStoryCreatedAsync(friendIds, userId, story.Id);

        return true;
    }

    public async Task<bool> DeleteStoryAsync(int storyId, string userId)
    {
        var story = await _context.Stories
            .FirstOrDefaultAsync(s => s.Id == storyId && s.UserId == userId);

        if (story == null) return false;

        // Thực hiện xóa mềm theo cấu trúc Duy muốn
        story.IsDeleted = true;
        story.DeletedAt = DateTime.UtcNow;

        return await _context.SaveChangesAsync() > 0;
    }

    public async Task<List<StoryGroupDto>> GetActiveStoriesAsync(string currentUserId)
    {
        var now = DateTime.UtcNow;

        // 1. Lấy danh sách ID bạn bè (Giữ nguyên logic của Duy)
        var friendIds = await _context.Friendships
            .Where(f => (f.UserId == currentUserId || f.FriendId == currentUserId) && f.IsAccepted == true)
            .Select(f => f.UserId == currentUserId ? f.FriendId : f.UserId)
            .ToListAsync();

        friendIds.Add(currentUserId);

        // 2. Lấy Story và Nhóm (Group By) theo UserId
        var groupedStories = await _context.Stories
            .Where(s => !s.IsDeleted && s.ExpiresAt > now && friendIds.Contains(s.UserId))
            .Include(s => s.User)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();

        var grouped = groupedStories
            .GroupBy(s => s.User)
            .Select(g => new StoryGroupDto
            {
                UserId = g.Key.Id,
                UserName = g.Key.UserName,
                FullName = g.Key.FullName,
                AvatarUrl = g.Key.AvatarUrl,
                Stories = g.Select(story => new StoryItemDto
                {
                    Id = story.Id,
                    ImageUrl = story.ImageUrl,
                    CreatedAt = story.CreatedAt
                }).ToList(),
                LatestStoryTime = g.Max(story => story.CreatedAt)
            })
            .OrderByDescending(dto => dto.LatestStoryTime)
            .ToList();

        return grouped;
    }
}

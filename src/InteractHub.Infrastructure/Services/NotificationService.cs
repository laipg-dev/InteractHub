using InteractHub.Core.Entities;
using InteractHub.Core.Interfaces;
using InteractHub.Core.Interfaces.Services;
using InteractHub.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InteractHub.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly ApplicationDbContext _context;
    private readonly IAppRealtimeDispatcher _appRealtimeDispatcher;

    public NotificationService(
        ApplicationDbContext context,
        IAppRealtimeDispatcher appRealtimeDispatcher)
    {
        _context = context;
        _appRealtimeDispatcher = appRealtimeDispatcher;
    }

    public async Task<IEnumerable<NotificationDto>> GetUserNotificationsAsync(string userId, int page = 1, int pageSize = 20)
    {
        return await _context.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new NotificationDto
            {
                Id = n.Id,
                Type = n.Type.ToString(),
                Message = n.Message,
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt,
                SenderId = n.SenderId,
                SenderName = n.Sender != null
                    ? (n.Sender.FullName != string.Empty ? n.Sender.FullName : n.Sender.UserName)
                    : null,
                SenderAvatarUrl = n.Sender != null ? n.Sender.AvatarUrl : null,
                PostId = n.PostId,
                CommentId = n.CommentId,
                StoryId = n.StoryId
            })
            .ToListAsync();
    }

    public async Task<NotificationDto?> CreateNotificationAsync(
        string receiverId,
        string senderId,
        NotificationType type,
        string? message = null,
        int? postId = null,
        int? commentId = null,
        int? storyId = null)
    {
        if (receiverId == senderId || !Enum.IsDefined(type))
        {
            return null;
        }

        var sender = await _context.Users.FindAsync(senderId);
        var senderName = sender?.FullName ?? sender?.UserName ?? "Ai đó";

        if (string.IsNullOrWhiteSpace(message))
        {
            message = BuildDefaultMessage(type, senderName);
        }

        var notification = new Notification
        {
            UserId = receiverId,
            SenderId = senderId,
            Type = type,
            Message = message,
            PostId = postId,
            CommentId = commentId,
            StoryId = storyId,
            CreatedAt = DateTime.UtcNow,
            IsRead = false
        };

        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

        var notificationDto = new NotificationDto
        {
            Id = notification.Id,
            Type = notification.Type.ToString(),
            Message = notification.Message,
            IsRead = notification.IsRead,
            CreatedAt = notification.CreatedAt,
            SenderId = notification.SenderId,
            SenderName = sender?.FullName ?? sender?.UserName,
            SenderAvatarUrl = sender?.AvatarUrl,
            PostId = notification.PostId,
            CommentId = notification.CommentId,
            StoryId = notification.StoryId
        };

        var unreadCount = await GetUnreadCountAsync(receiverId);
        await _appRealtimeDispatcher.PushNotificationCreatedAsync(receiverId, notificationDto, unreadCount);

        return notificationDto;
    }

    public async Task<int> GetUnreadCountAsync(string userId)
    {
        return await _context.Notifications
            .CountAsync(n => n.UserId == userId && !n.IsRead);
    }

    public async Task<bool> MarkAsReadAsync(int notificationId, string userId)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);

        if (notification == null || notification.IsRead)
        {
            return false;
        }

        notification.IsRead = true;
        await _context.SaveChangesAsync();

        var unreadCount = await GetUnreadCountAsync(userId);
        await _appRealtimeDispatcher.PushNotificationReadAsync(userId, notificationId, unreadCount);

        return true;
    }

    public async Task<bool> MarkAllAsReadAsync(string userId)
    {
        var unreadNotifications = await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync();

        if (!unreadNotifications.Any())
        {
            return false;
        }

        foreach (var notification in unreadNotifications)
        {
            notification.IsRead = true;
        }

        await _context.SaveChangesAsync();

        var unreadCount = await GetUnreadCountAsync(userId);
        await _appRealtimeDispatcher.PushNotificationsAllReadAsync(userId, unreadCount);

        return true;
    }

    private static string BuildDefaultMessage(NotificationType type, string senderName) =>
        type switch
        {
            NotificationType.FriendRequestReceived => $"{senderName} đã gửi lời mời kết bạn",
            NotificationType.FriendAccepted => $"{senderName} đã chấp nhận lời mời kết bạn của bạn",
            NotificationType.PostLiked => $"{senderName} đã bày tỏ cảm xúc với bài viết của bạn",
            NotificationType.PostCommented => $"{senderName} đã bình luận về bài viết của bạn",
            NotificationType.NewPost => $"{senderName} đã đăng một bài viết mới",
            NotificationType.NewStory => $"{senderName} đã đăng một story mới",
            NotificationType.PostReported => $"{senderName} vừa gửi một báo cáo nội dung mới cần admin xem xét",
            NotificationType.ReportResolved => $"{senderName} đã xử lý báo cáo của bạn",
            NotificationType.ContentRemoved => $"{senderName} đã gỡ nội dung sau khi xem xét báo cáo",
            NotificationType.AccountRestricted => $"{senderName} đã hạn chế một tài khoản sau khi xem xét báo cáo",
            _ => throw new ArgumentOutOfRangeException(nameof(type), type, "Unsupported notification type.")
        };
}

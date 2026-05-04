using InteractHub.Core.Interfaces.Services;
using InteractHub.Infrastructure.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace InteractHub.Infrastructure.Services;

public class AppRealtimeDispatcher : IAppRealtimeDispatcher
{
    private readonly IHubContext<AppRealtimeHub> _hubContext;

    public AppRealtimeDispatcher(IHubContext<AppRealtimeHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task PushNotificationCreatedAsync(string userId, object notification, int unreadCount)
    {
        await _hubContext.Clients.Group(AppRealtimeHub.UserGroup(userId))
            .SendAsync("notification:new", new
            {
                notification,
                unreadCount
            });
    }

    public async Task PushUnreadCountChangedAsync(string userId, int unreadCount)
    {
        await _hubContext.Clients.Group(AppRealtimeHub.UserGroup(userId))
            .SendAsync("notification:unread_count_changed", new
            {
                unreadCount
            });
    }

    public async Task PushNotificationReadAsync(string userId, int notificationId, int unreadCount)
    {
        await _hubContext.Clients.Group(AppRealtimeHub.UserGroup(userId))
            .SendAsync("notification:read", new
            {
                notificationId,
                unreadCount
            });
    }

    public async Task PushNotificationsAllReadAsync(string userId, int unreadCount)
    {
        await _hubContext.Clients.Group(AppRealtimeHub.UserGroup(userId))
            .SendAsync("notification:read_all", new
            {
                unreadCount
            });
    }

    public async Task PushFriendsRefreshAsync(params string[] userIds)
    {
        var targets = userIds
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct()
            .ToList();

        foreach (var userId in targets)
        {
            await _hubContext.Clients.Group(AppRealtimeHub.UserGroup(userId))
                .SendAsync("friends:refresh", new
                {
                    userId
                });
        }
    }

    public async Task PushPostCreatedAsync(IEnumerable<string> userIds, string senderId, int postId)
    {
        var targets = userIds
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct()
            .ToList();

        foreach (var userId in targets)
        {
            await _hubContext.Clients.Group(AppRealtimeHub.UserGroup(userId))
                .SendAsync("feed:post_created", new
                {
                    senderId,
                    postId
                });
        }
    }

    public async Task PushStoryCreatedAsync(IEnumerable<string> userIds, string senderId, int storyId)
    {
        var targets = userIds
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct()
            .ToList();

        foreach (var userId in targets)
        {
            await _hubContext.Clients.Group(AppRealtimeHub.UserGroup(userId))
                .SendAsync("story:new", new
                {
                    senderId,
                    storyId
                });
        }
    }

    public async Task PushPostInteractionAsync(
        string userId,
        string eventType,
        int postId,
        int likeCount,
        int commentCount,
        int? commentId = null,
        string? actorUserId = null)
    {
        var payload = new
        {
            eventType,
            postId,
            likeCount,
            commentCount,
            commentId,
            actorUserId
        };

        await _hubContext.Clients.Group(AppRealtimeHub.UserGroup(userId))
            .SendAsync("post:interaction", payload);

        await _hubContext.Clients.Group(AppRealtimeHub.PostGroup(postId))
            .SendAsync("post:interaction", payload);
    }

    public async Task PushStoryStateChangedAsync(
        string userId,
        string eventType,
        int storyId,
        string? actorUserId = null)
    {
        var payload = new
        {
            eventType,
            storyId,
            actorUserId
        };

        if (!string.IsNullOrWhiteSpace(userId))
        {
            await _hubContext.Clients.Group(AppRealtimeHub.UserGroup(userId))
                .SendAsync("story:state_changed", payload);
        }

        if (!string.IsNullOrWhiteSpace(actorUserId) && actorUserId != userId)
        {
            await _hubContext.Clients.Group(AppRealtimeHub.UserGroup(actorUserId))
                .SendAsync("story:state_changed", payload);
        }
    }

    public async Task PushUserStateChangedAsync(
        string userId,
        string eventType,
        string? actorUserId = null)
    {
        var payload = new
        {
            userId,
            eventType,
            actorUserId
        };

        if (!string.IsNullOrWhiteSpace(userId))
        {
            await _hubContext.Clients.Group(AppRealtimeHub.UserGroup(userId))
                .SendAsync("user:state_changed", payload);
        }

        if (!string.IsNullOrWhiteSpace(actorUserId) && actorUserId != userId)
        {
            await _hubContext.Clients.Group(AppRealtimeHub.UserGroup(actorUserId))
                .SendAsync("user:state_changed", payload);
        }
    }
}

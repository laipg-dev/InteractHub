namespace InteractHub.Core.Interfaces.Services;
public interface IAppRealtimeDispatcher
{
    Task PushNotificationCreatedAsync(string userId, object notification, int unreadCount);
    Task PushUnreadCountChangedAsync(string userId, int unreadCount);
    Task PushNotificationReadAsync(string userId, int notificationId, int unreadCount);
    Task PushNotificationsAllReadAsync(string userId, int unreadCount);
    Task PushFriendsRefreshAsync(params string[] userIds);
    Task PushPostCreatedAsync(IEnumerable<string> userIds, string senderId, int postId);
    Task PushStoryCreatedAsync(IEnumerable<string> userIds, string senderId, int storyId);
    Task PushPostInteractionAsync(
        string userId,
        string eventType,
        int postId,
        int likeCount,
        int commentCount,
        int? commentId = null,
        string? actorUserId = null);
    Task PushStoryStateChangedAsync(
        string userId,
        string eventType,
        int storyId,
        string? actorUserId = null);
    Task PushUserStateChangedAsync(
        string userId,
        string eventType,
        string? actorUserId = null);
}

namespace InteractHub.Core.Entities;

public enum NotificationType
{
    // Persisted in Notifications.Type as integer codes. Keep these values stable.
    FriendRequestReceived = 0,
    PostLiked = 1,
    PostCommented = 2,
    NewPost = 3,
    NewStory = 4,
    FriendAccepted = 5,
    PostReported = 6,
    ReportResolved = 7,
    ContentRemoved = 8,
    AccountRestricted = 9
}

public class Notification
{
    public int Id { get; set; }
    public NotificationType Type { get; set; }
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public string UserId { get; set; } = string.Empty;
    public string? SenderId { get; set; }
    public int? PostId { get; set; }
    public int? CommentId { get; set; }
    public int? StoryId { get; set; }

    public virtual ApplicationUser User { get; set; } = null!;
    public virtual ApplicationUser? Sender { get; set; }
    public virtual Post? Post { get; set; }
    public virtual Comment? Comment { get; set; }
    public virtual Story? Story { get; set; }
}

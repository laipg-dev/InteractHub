namespace InteractHub.Core.Entities;

public class Friendship
{
    // Người gửi lời mời
    public string UserId { get; set; } = string.Empty;
    public virtual ApplicationUser User { get; set; } = null!;

    // Người nhận lời mời
    public string FriendId { get; set; } = string.Empty;
    public virtual ApplicationUser Friend { get; set; } = null!;

    public bool IsAccepted { get; set; } = false; // Trạng thái kết bạn [cite: 45]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
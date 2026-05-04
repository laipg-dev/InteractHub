namespace InteractHub.Core.Entities;

public class Comment
{
    public int Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; } = false;
public DateTime? DeletedAt { get; set; }

    // Ngoại khóa đến người dùng
    public string UserId { get; set; } = string.Empty;
    public virtual ApplicationUser User { get; set; } = null!;

    // Ngoại khóa đến bài đăng
    public int PostId { get; set; }
    public virtual Post Post { get; set; } = null!;
}
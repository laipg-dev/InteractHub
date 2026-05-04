namespace InteractHub.Core.Entities;

public class Like
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public string UserId { get; set; } = string.Empty;
    public virtual ApplicationUser User { get; set; } = null!;

    public int PostId { get; set; }
    public virtual Post Post { get; set; } = null!;
    public bool IsDeleted { get; set; } = false;
public DateTime? DeletedAt { get; set; }
}
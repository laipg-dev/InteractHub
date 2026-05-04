using Microsoft.AspNetCore.Identity;

namespace InteractHub.Core.Entities;

public class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;

    public virtual ICollection<Post> Posts { get; set; } = new List<Post>();
    public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    public virtual ICollection<Friendship> SentFriendRequests { get; set; } = new List<Friendship>();
    public virtual ICollection<Friendship> ReceivedFriendRequests { get; set; } = new List<Friendship>();
    public virtual ICollection<Like> Likes { get; set; } = new List<Like>();
    public virtual ICollection<Story> Stories { get; set; } = new List<Story>();
}

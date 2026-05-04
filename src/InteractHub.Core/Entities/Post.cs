namespace InteractHub.Core.Entities;

public class Post{
    public int Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? ImageUrl { get; set; } // Đường dẫn ảnh lưu trên Azure Blob [cite: 80]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAt { get; set; }

// Khóa ngoại liên kết với User
    public string UserId { get; set; } = string.Empty;
    //- Navigation property, cho phép EF tự động liên kết bài viết với đối tượng ApplicationUser.
    public virtual ApplicationUser User { get; set; } = null!;

public virtual ICollection<Hashtag> Hashtags { get; set; } = new List<Hashtag>();
    public virtual ICollection<Comment> Comments { get; set; } = new List<Comment>();
    public virtual ICollection<Like> Likes {get; set;} = new List<Like>();
}
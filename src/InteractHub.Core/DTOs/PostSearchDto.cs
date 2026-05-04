namespace InteractHub.Core.DTOs;

public class PostSearchDto
{
    public int Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;

    public string AuthorAvatarUrl { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty; // Cần thiết
    public DateTime CreatedAt { get; set; }
    public string? ImageUrl { get; set; }
    public int LikeCount { get; set; }
    public int CommentCount { get; set; }
    public bool IsLiked { get; set; }
    public List<string> Hashtags { get; set; } = new();
}
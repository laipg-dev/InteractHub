namespace InteractHub.Core.DTOs;

public class AdminPostListItemDto
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string? UserName { get; set; }
    public string? UserFullName { get; set; }
    public string? ContentPreview { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
    public int LikeCount { get; set; }
    public int CommentCount { get; set; }
    public int ReportCount { get; set; }
    public string? CurrentFlag { get; set; }
    public List<string> Hashtags { get; set; } = new();
}

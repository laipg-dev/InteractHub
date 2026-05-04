namespace InteractHub.Core.DTOs;

public class AdminPostDetailDto
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string? UserName { get; set; }
    public string? UserFullName { get; set; }
    public string? UserAvatarUrl { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
    public int LikeCount { get; set; }
    public int ActiveCommentCount { get; set; }
    public int TotalCommentCount { get; set; }
    public int ReportCount { get; set; }
    public string? CurrentFlag { get; set; }
    public string? FinalStatus { get; set; }
    public List<string> Hashtags { get; set; } = new();
    public List<AdminCommentListItemDto> Comments { get; set; } = new();
}

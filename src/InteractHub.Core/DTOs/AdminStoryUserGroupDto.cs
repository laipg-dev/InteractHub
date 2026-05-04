namespace InteractHub.Core.DTOs;

public class AdminStoryUserGroupDto
{
    public string UserId { get; set; } = string.Empty;
    public string? UserName { get; set; }
    public string? UserFullName { get; set; }
    public string? UserAvatarUrl { get; set; }
    public int StoryCount { get; set; }
    public int ActiveStoryCount { get; set; }
    public List<AdminStoryListItemDto> Stories { get; set; } = new();
}

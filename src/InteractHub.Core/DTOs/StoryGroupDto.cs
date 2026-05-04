public class StoryGroupDto
{
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public string? AvatarUrl { get; set; }
    public List<StoryItemDto> Stories { get; set; } = new();
    public DateTime LatestStoryTime { get; set; }
}

public class StoryItemDto
{
    public int Id { get; set; }
    public string? ImageUrl { get; set; }
    public DateTime CreatedAt { get; set; }
}
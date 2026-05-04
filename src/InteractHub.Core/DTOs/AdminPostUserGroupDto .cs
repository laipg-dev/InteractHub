namespace InteractHub.Core.DTOs;

public class AdminPostUserGroupDto
{
    public string UserId { get; set; } = string.Empty;
    public string? UserName { get; set; }
    public string? UserFullName { get; set; }
    public int PostCount { get; set; }
    public int TotalReports { get; set; }
    public List<AdminPostListItemDto> Posts { get; set; } = new();
}

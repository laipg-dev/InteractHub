namespace InteractHub.Core.DTOs;

public class AdminPostUserListItemDto
{
    public string UserId { get; set; } = string.Empty;
    public string? UserName { get; set; }
    public string? UserFullName { get; set; }
    public int PostCount { get; set; }
    public int TotalReports { get; set; }
}

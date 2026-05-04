namespace InteractHub.Core.DTOs;

public class UserSearchDto
{
    public string Id { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    // Thêm DisplayName hoặc AvatarUrl sau này Duy nhé
    public string? AvatarUrl { get; set; } 
}
namespace InteractHub.Core.DTOs;

public class UpdateUserDto
{
    public string FullName { get; set; } = string.Empty;
    public string? Bio { get; set; }
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public string? AvatarUrl { get; set; }
}
namespace InteractHub.Core.DTOs;

public class UserProfileDto
{
    public string Id { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    
    // Thêm các trường này để phục vụ trang Edit
    public string? FullName { get; set; } 
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    
    public int FriendStatus { get; set; } // 0: Chưa có gì, 1: Đã gửi (chờ), 2: Được mời (đợi mình), 3: Đã là bạn
    public string? Bio { get; set; }
    public string? AvatarUrl { get; set; } // Link ảnh đại diện
    public DateTime JoinedAt { get; set; }
    public int PostCount { get; set; }
    
    public List<PostResponseDto> Posts { get; set; } = new();
}
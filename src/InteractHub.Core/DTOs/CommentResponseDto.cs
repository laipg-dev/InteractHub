namespace InteractHub.Core.DTOs;

public class CommentResponseDto
{
    public int Id { get; set; }
    public string Content { get; set; } = string.Empty;

    public string AvatarUrl { get; set; } = string.Empty; // Dùng để hiển thị nếu FullName không có
    public string UserFullName { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty; // Cần thiết để check quyền xóa
    public DateTime CreatedAt { get; set; }
}
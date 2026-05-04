public class NotificationDto
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty; // Chuyển Enum thành chuỗi (vd: "PostLiked")
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
    
    // Chỉ lấy thông tin cơ bản của người gửi để FE render Avatar + Tên
    public string? SenderId { get; set; }
    public string? SenderName { get; set; }
    public string? SenderAvatarUrl { get; set; }

    // Dữ liệu điều hướng
    public int? PostId { get; set; }
    public int? CommentId { get; set; }
    public int? StoryId { get; set; }
}
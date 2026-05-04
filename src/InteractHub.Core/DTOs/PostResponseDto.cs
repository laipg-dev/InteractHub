namespace InteractHub.Core.DTOs;

public class PostResponseDto
{
    public int Id { get; set; }
    public string Content { get; set; }
    public string? ImageUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    
    // Thông tin người đăng (đã lọc bớt)
    public string UserId { get; set; }
    public string UserName { get; set; }
    public string? UserFullName { get; set; }

    public string? AvatarUrl { get; set; } // Thêm trường AvatarUrl để hiển thị ảnh đại diện của người đăng
    // Số lượng tương tác
    public int LikeCount { get; set; }
    public int CommentCount { get; set; }

    public List<string> Hashtags { get; set; } = new List<string>(); // Trả về danh sách hashtag dưới dạng string
    public bool IsLiked { get; set; }
}
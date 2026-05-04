namespace InteractHub.Core.DTOs;

public class LikeResponseDto
{
    public bool IsLiked { get; set; } // Trạng thái sau khi bấm (true = đã like, false = đã hủy like)
    public int LikeCount { get; set; } // Tổng số like mới của bài viết để cập nhật UI ngay lập tức
}
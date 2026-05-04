namespace InteractHub.Core.DTOs;

public class SearchResultDto
{
    // Danh sách người dùng tìm thấy
    public List<UserSearchDto> Users { get; set; } = new();

    // Danh sách bài viết tìm thấy
    public List<PostSearchDto> Posts { get; set; } = new();

    // Danh sách Hashtags (Chỉ cần trả về list string tên tag là đủ)
    public List<string> Hashtags { get; set; } = new();

    // Thêm trường này để UI biết có kết quả nào không
    public int TotalCount => Users.Count + Posts.Count + Hashtags.Count;
}
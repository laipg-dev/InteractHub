namespace InteractHub.Core.DTOs;

public class CreateReportRequest
{
    public int PostId { get; set; }
    
    // Bạn có thể định nghĩa Enum cho Reason, nhưng dùng string cho linh hoạt theo Front-end truyền lên
    public string Reason { get; set; } = string.Empty; 
    public string? Description { get; set; }
}
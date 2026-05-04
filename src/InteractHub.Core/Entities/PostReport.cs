namespace InteractHub.Core.Entities;

public enum ReportStatus { Pending, Reviewed, Resolved, Rejected }

public class PostReport
{
    public int Id { get; set; }
    public int PostId { get; set; }
    public virtual Post Post { get; set; } = null!;

    public string ReporterId { get; set; } = string.Empty;
    public virtual ApplicationUser Reporter { get; set; } = null!;

    public string Reason { get; set; } = string.Empty;
    public string? Description { get; set; }

    public ReportStatus Status { get; set; } = ReportStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Admin xử lý report cụ thể này
    public string? HandlerId { get; set; }
    public string? ActionTaken { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewNote { get; set; }
    public string? ResolutionMessage { get; set; }
}

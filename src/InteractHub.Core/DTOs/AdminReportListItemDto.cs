namespace InteractHub.Core.DTOs;

public class AdminReportListItemDto
{
    public int ReportId { get; set; }
    public int PostId { get; set; }
    public string ReporterId { get; set; } = string.Empty;
    public string? ReporterName { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public int TotalReportsForPost { get; set; }
    public string? CurrentFlag { get; set; }
}

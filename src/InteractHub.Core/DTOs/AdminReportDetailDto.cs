namespace InteractHub.Core.DTOs;

public class AdminReportDetailDto
{
    public int ReportId { get; set; }
    public int PostId { get; set; }
    public string ReporterId { get; set; } = string.Empty;
    public string? ReporterName { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public string PostOwnerId { get; set; } = string.Empty;
    public string? PostOwnerName { get; set; }
    public string? PostContentPreview { get; set; }
    public string? PostImageUrl { get; set; }

    public int TotalReportsForPost { get; set; }
    public int SpamCount { get; set; }
    public int OffensiveCount { get; set; }
    public int FakeNewsCount { get; set; }
    public int OtherCount { get; set; }
    public string? CurrentFlag { get; set; }
    public string? FinalStatus { get; set; }
}

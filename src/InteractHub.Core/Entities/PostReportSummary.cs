using System.ComponentModel.DataAnnotations;

namespace InteractHub.Core.Entities;

public enum ContentFlag { Safe, Dangerous, UnderReview, Violating, Removed }

public class PostReportSummary
{
    [Key]
    public int PostId { get; set; }
    public virtual Post Post { get; set; } = null!;

    public int TotalReports { get; set; }
    public int SpamCount { get; set; }
    public int OffensiveCount { get; set; }
    public int FakeNewsCount { get; set; }
    public int OtherCount { get; set; }

    public ContentFlag Flag { get; set; } = ContentFlag.UnderReview;
    public DateTime? LastReviewedAt { get; set; }
    public string? LastReviewedByAdminId { get; set; }
    public int ReportsSinceLastReview { get; set; }
    public string? LastReviewDecision { get; set; }
    public string? ReviewerNote { get; set; }
    public DateTime? LastEscalatedAt { get; set; }
    public ContentFlag FinalStatus { get; set; } = ContentFlag.UnderReview;
}

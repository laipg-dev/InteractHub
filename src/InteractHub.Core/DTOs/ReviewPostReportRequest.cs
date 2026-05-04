namespace InteractHub.Core.DTOs;

public class ReviewPostReportRequest
{
    public AdminModerationDecision Decision { get; set; }

    // Dùng để map sang hệ thống status hiện tại của report mà không khóa cứng enum ở đây.
    public string ReportStatus { get; set; } = "Pending";

    // Dùng để map sang FinalStatus/Flag hiện tại của summary.
    public string? FinalStatus { get; set; }

    public string? AdminNote { get; set; }
    public bool NotifyReporter { get; set; } = true;
    public bool NotifyContentOwner { get; set; } = false;
}

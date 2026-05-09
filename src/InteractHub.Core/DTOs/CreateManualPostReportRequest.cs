namespace InteractHub.Core.DTOs;

public class CreateManualPostReportRequest
{
    public int PostId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? AdminNote { get; set; }
}


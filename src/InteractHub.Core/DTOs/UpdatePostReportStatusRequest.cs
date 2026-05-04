namespace InteractHub.Core.DTOs;

public class UpdatePostReportStatusRequest
{
    public string Status { get; set; } = string.Empty;
    public string? FinalStatus { get; set; }
    public string? Note { get; set; }
}

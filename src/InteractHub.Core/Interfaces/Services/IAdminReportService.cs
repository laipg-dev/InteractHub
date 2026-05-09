using InteractHub.Core.DTOs;

namespace InteractHub.Core.Interfaces;

public interface IAdminReportService
{
    Task<IReadOnlyList<AdminReportListItemDto>> GetReportsAsync(
        string? query = null,
        string? status = null,
        int? postId = null,
        string? reporterId = null,
        string? sortBy = null,
        string? sortDir = null);
    Task<AdminReportDetailDto?> GetReportByIdAsync(int reportId);
    Task<bool> UpdateReportStatusAsync(int reportId, UpdatePostReportStatusRequest request);
    Task<int> CreateManualReportAsync(CreateManualPostReportRequest request, string adminUserId);
}

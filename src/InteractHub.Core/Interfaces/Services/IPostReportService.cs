using InteractHub.Core.DTOs;

namespace InteractHub.Core.Interfaces;

public interface IPostReportService
{
    // Trả về true nếu report thành công, false/exception nếu có lỗi hoặc đã report rồi
    Task<bool> CreateReportAsync(CreateReportRequest request, string userId);
}
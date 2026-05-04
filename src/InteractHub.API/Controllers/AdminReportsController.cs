using InteractHub.Core.DTOs;
using InteractHub.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InteractHub.API.Controllers;

[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/reports")]
public class AdminReportsController : ControllerBase
{
    private readonly IAdminReportService _adminReportService;

    public AdminReportsController(IAdminReportService adminReportService)
    {
        _adminReportService = adminReportService;
    }

    [HttpGet]
    public async Task<IActionResult> GetReports(
        [FromQuery] string? query = null,
        [FromQuery] string? q = null,
        [FromQuery] string? status = null,
        [FromQuery] int? postId = null,
        [FromQuery] string? reporterId = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDir = null)
    {
        var keyword = !string.IsNullOrWhiteSpace(query) ? query : q;
        var reports = await _adminReportService.GetReportsAsync(
            keyword,
            status,
            postId,
            reporterId,
            sortBy,
            sortDir);
        return Ok(reports);
    }

    [HttpGet("{reportId:int}")]
    public async Task<IActionResult> GetReportById(int reportId)
    {
        var report = await _adminReportService.GetReportByIdAsync(reportId);
        if (report == null)
            return NotFound("Không tìm thấy report.");

        return Ok(report);
    }

    [HttpPut("{reportId:int}/status")]
    public async Task<IActionResult> UpdateStatus(int reportId, [FromBody] UpdatePostReportStatusRequest request)
    {
        var updated = await _adminReportService.UpdateReportStatusAsync(reportId, request);
        if (!updated)
            return NotFound("Không tìm thấy report để cập nhật.");

        return Ok(new { message = "Cập nhật trạng thái report thành công." });
    }
}

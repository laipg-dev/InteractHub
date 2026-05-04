


using System.Security.Claims;
using InteractHub.Core.DTOs;
using InteractHub.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[Authorize] // <--- THÊM DÒNG NÀY ĐỂ BẢO VỆ API
[ApiController]
[Route("api/[controller]")]
public class PostReportController : ControllerBase
{
    private readonly IPostReportService _postReportService;

    public PostReportController(IPostReportService postReportService)
    {
        _postReportService = postReportService;
    }

    [HttpPost("report")]
public async Task<IActionResult> ReportPost([FromBody] CreateReportRequest request)
{
    try
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        await _postReportService.CreateReportAsync(request, userId);
        return Ok(new { message = "Báo cáo của bạn đã được ghi nhận và đang chờ xử lý." });
    }
    catch (Exception ex)
    {
        return BadRequest(new { message = ex.Message });
    }
}
}
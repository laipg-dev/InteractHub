using System.Security.Claims;
using InteractHub.Core.DTOs;
using InteractHub.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InteractHub.API.Controllers;

[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/moderation")]
public class AdminModerationController : ControllerBase
{
    private readonly IAdminModerationService _adminModerationService;

    public AdminModerationController(IAdminModerationService adminModerationService)
    {
        _adminModerationService = adminModerationService;
    }

    [HttpPut("reports/{reportId:int}/review")]
    public async Task<IActionResult> ReviewReport(int reportId, [FromBody] ReviewPostReportRequest request)
    {
        var adminUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var reviewed = await _adminModerationService.ReviewPostReportAsync(reportId, request, adminUserId);
        if (!reviewed)
            return NotFound("Không tìm thấy report để xử lý.");

        return Ok(new { message = "Đã xử lý report thành công." });
    }

    [HttpPut("posts/{postId:int}/remove")]
    public async Task<IActionResult> RemovePost(int postId)
    {
        var removed = await _adminModerationService.RemovePostAsync(postId);
        if (!removed)
            return NotFound("Không tìm thấy bài viết để gỡ.");

        return Ok(new { message = "Đã gỡ bài viết thành công." });
    }

    [HttpPut("comments/{commentId:int}/remove")]
    public async Task<IActionResult> RemoveComment(int commentId)
    {
        var removed = await _adminModerationService.RemoveCommentAsync(commentId);
        if (!removed)
            return NotFound("Không tìm thấy bình luận để gỡ.");

        return Ok(new { message = "Đã gỡ bình luận thành công." });
    }

    [HttpPut("users/{userId}/deactivate")]
    public async Task<IActionResult> DeactivateUser(string userId)
    {
        var deactivated = await _adminModerationService.DeactivateUserAsync(userId);
        if (!deactivated)
            return NotFound("Không tìm thấy tài khoản để vô hiệu hóa.");

        return Ok(new { message = "Đã vô hiệu hóa tài khoản thành công." });
    }
}

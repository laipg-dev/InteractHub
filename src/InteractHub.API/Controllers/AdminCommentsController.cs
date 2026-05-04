using System.Security.Claims;
using InteractHub.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InteractHub.API.Controllers;

[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/comments")]
public class AdminCommentsController : ControllerBase
{
    private readonly IAdminPostService _adminPostService;

    public AdminCommentsController(IAdminPostService adminPostService)
    {
        _adminPostService = adminPostService;
    }

    [HttpGet]
    public async Task<IActionResult> GetComments(
        [FromQuery] string? query = null,
        [FromQuery] string? q = null,
        [FromQuery] string? state = null,
        [FromQuery] int? postId = null,
        [FromQuery] string? userId = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDir = null)
    {
        var keyword = !string.IsNullOrWhiteSpace(query) ? query : q;
        var comments = await _adminPostService.GetAllCommentsAsync(
            keyword,
            state,
            postId,
            userId,
            sortBy,
            sortDir);

        return Ok(comments);
    }

    [HttpPut("{commentId:int}/removed-state")]
    public async Task<IActionResult> SetCommentRemovedState(int commentId, [FromQuery] bool removed)
    {
        var adminUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var updated = await _adminPostService.SetCommentRemovedStateAsync(commentId, removed, adminUserId);
        if (!updated)
            return NotFound("Không tìm thấy bình luận để cập nhật trạng thái.");

        return Ok(new
        {
            message = removed ? "Đã ẩn bình luận thành công." : "Đã khôi phục bình luận thành công."
        });
    }
}


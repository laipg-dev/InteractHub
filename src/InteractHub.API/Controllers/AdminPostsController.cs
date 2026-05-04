using System.Security.Claims;
using InteractHub.Core.DTOs;
using InteractHub.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InteractHub.API.Controllers;

[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/posts")]
public class AdminPostsController : ControllerBase
{
    private readonly IAdminPostService _adminPostService;

    public AdminPostsController(IAdminPostService adminPostService)
    {
        _adminPostService = adminPostService;
    }

    [HttpGet("users")]
    [HttpGet("authors")]
    public async Task<IActionResult> GetUsers(
        [FromQuery] string? query = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDir = null)
    {
        var users = await _adminPostService.GetUsersAsync(query, sortBy, sortDir);
        return Ok(users);
    }

    [HttpGet]
    public async Task<IActionResult> GetPosts(
        [FromQuery] string? query = null,
        [FromQuery] string? state = null,
        [FromQuery] string? userId = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDir = null)
    {
        var posts = await _adminPostService.GetPostsAsync(query, state, userId, sortBy, sortDir);
        return Ok(posts);
    }

    [HttpGet("grouped")]
    [HttpGet("groups/by-author")]
    public async Task<IActionResult> GetPostsGroupedByUser(
        [FromQuery] string? query = null,
        [FromQuery] string? state = null,
        [FromQuery] string? userId = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDir = null)
    {
        var groups = await _adminPostService.GetPostsGroupedByUserAsync(query, state, userId, sortBy, sortDir);
        return Ok(groups);
    }

    [HttpGet("{postId:int}")]
    public async Task<IActionResult> GetPostById(int postId)
    {
        var post = await _adminPostService.GetPostByIdAsync(postId);
        if (post == null)
            return NotFound("Không tìm thấy bài viết.");

        return Ok(post);
    }

    [HttpPut("{postId:int}")]
    public async Task<IActionResult> UpdatePost(int postId, [FromBody] UpdateAdminPostRequest request)
    {
        var adminUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var updated = await _adminPostService.UpdatePostAsync(postId, request, adminUserId);
        if (updated == null)
            return NotFound("Không tìm thấy bài viết để cập nhật.");

        return Ok(updated);
    }

    [HttpGet("{postId:int}/comments")]
    public async Task<IActionResult> GetComments(
        int postId,
        [FromQuery] string? query = null,
        [FromQuery] string? state = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDir = null)
    {
        var comments = await _adminPostService.GetCommentsAsync(postId, query, state, sortBy, sortDir);
        return Ok(comments);
    }

    [HttpPut("{postId:int}/removed-state")]
    public async Task<IActionResult> SetPostRemovedState(int postId, [FromQuery] bool removed)
    {
        var adminUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var updated = await _adminPostService.SetPostRemovedStateAsync(postId, removed, adminUserId);
        if (!updated)
            return NotFound("Không tìm thấy bài viết để cập nhật trạng thái.");

        return Ok(new { message = removed ? "Đã ẩn bài viết thành công." : "Đã khôi phục bài viết thành công." });
    }

    [HttpPut("comments/{commentId:int}/removed-state")]
    public async Task<IActionResult> SetCommentRemovedState(int commentId, [FromQuery] bool removed)
    {
        var adminUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var updated = await _adminPostService.SetCommentRemovedStateAsync(commentId, removed, adminUserId);
        if (!updated)
            return NotFound("Không tìm thấy bình luận để cập nhật trạng thái.");

        return Ok(new { message = removed ? "Đã ẩn bình luận thành công." : "Đã khôi phục bình luận thành công." });
    }
}

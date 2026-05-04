using System.Security.Claims;
using InteractHub.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InteractHub.API.Controllers;

[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/stories")]
public class AdminStoriesController : ControllerBase
{
    private readonly IAdminStoryService _adminStoryService;

    public AdminStoriesController(IAdminStoryService adminStoryService)
    {
        _adminStoryService = adminStoryService;
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers(
        [FromQuery] string? query = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDir = null)
    {
        var users = await _adminStoryService.GetUsersAsync(query, sortBy, sortDir);
        return Ok(users);
    }

    [HttpGet]
    public async Task<IActionResult> GetStories(
        [FromQuery] string? query = null,
        [FromQuery] string? state = null,
        [FromQuery] string? userId = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDir = null)
    {
        var stories = await _adminStoryService.GetStoriesAsync(query, state, userId, sortBy, sortDir);
        return Ok(stories);
    }

    [HttpGet("grouped")]
    public async Task<IActionResult> GetStoriesGroupedByUser(
        [FromQuery] string? query = null,
        [FromQuery] string? state = null,
        [FromQuery] string? userId = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDir = null)
    {
        var groups = await _adminStoryService.GetStoriesGroupedByUserAsync(query, state, userId, sortBy, sortDir);
        return Ok(groups);
    }

    [HttpGet("{storyId:int}")]
    public async Task<IActionResult> GetStoryById(int storyId)
    {
        var story = await _adminStoryService.GetStoryByIdAsync(storyId);
        if (story == null)
            return NotFound("Không tìm thấy story.");

        return Ok(story);
    }

    [HttpPut("{storyId:int}/removed-state")]
    public async Task<IActionResult> SetStoryRemovedState(int storyId, [FromQuery] bool removed)
    {
        var adminUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var updated = await _adminStoryService.SetStoryRemovedStateAsync(storyId, removed, adminUserId);
        if (!updated)
            return NotFound("Không tìm thấy story để cập nhật trạng thái.");

        return Ok(new { message = removed ? "Đã gỡ story thành công." : "Đã khôi phục story thành công." });
    }
}

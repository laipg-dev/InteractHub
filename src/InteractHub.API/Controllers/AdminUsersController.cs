using System.Security.Claims;
using InteractHub.Core.DTOs;
using InteractHub.Core.Entities;
using InteractHub.Core.Interfaces;
using InteractHub.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InteractHub.API.Controllers;

[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/users")]
public class AdminUsersController : ControllerBase
{
    private readonly IAdminUserService _adminUserService;
    private readonly INotificationService _notificationService;
    private readonly IAppRealtimeDispatcher _appRealtimeDispatcher;

    public AdminUsersController(
        IAdminUserService adminUserService,
        INotificationService notificationService,
        IAppRealtimeDispatcher appRealtimeDispatcher)
    {
        _adminUserService = adminUserService;
        _notificationService = notificationService;
        _appRealtimeDispatcher = appRealtimeDispatcher;
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers(
        [FromQuery] string? query = null,
        [FromQuery] string? q = null,
        [FromQuery] string? role = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDir = null)
    {
        var keyword = !string.IsNullOrWhiteSpace(query) ? query : q;
        var users = await _adminUserService.GetUsersAsync(keyword, role, isActive, sortBy, sortDir);
        return Ok(users);
    }

    [HttpGet("{userId}")]
    public async Task<IActionResult> GetUserById(string userId)
    {
        var user = await _adminUserService.GetUserByIdAsync(userId);
        if (user == null)
            return NotFound("Không tìm thấy tài khoản.");

        return Ok(user);
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateAdminUserRequest request)
    {
        var user = await _adminUserService.CreateUserAsync(request);
        return Ok(user);
    }

    [HttpPut("{userId}")]
    public async Task<IActionResult> UpdateUser(string userId, [FromBody] UpdateAdminUserRequest request)
    {
        var user = await _adminUserService.UpdateUserAsync(userId, request);
        if (user == null)
            return NotFound("Không tìm thấy tài khoản để cập nhật.");

        return Ok(user);
    }

    [HttpPut("{userId}/state")]
    public async Task<IActionResult> SetUserState(string userId, [FromQuery] bool isActive)
    {
        var adminUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var targetUser = await _adminUserService.GetUserByIdAsync(userId);
        var updated = await _adminUserService.SetUserActiveStateAsync(userId, isActive);
        if (!updated)
            return NotFound("Không tìm thấy tài khoản để cập nhật.");

        if (!string.IsNullOrWhiteSpace(adminUserId) && targetUser != null)
        {
            if (!isActive)
            {
                await _notificationService.CreateNotificationAsync(
                    userId,
                    adminUserId,
                    NotificationType.AccountRestricted,
                    "Tài khoản của bạn đã bị quản trị viên tạm khóa.");
            }

            await _appRealtimeDispatcher.PushUserStateChangedAsync(
                userId,
                isActive ? "admin_user_reactivated" : "admin_user_restricted",
                adminUserId);
        }

        return Ok(new { message = "Cập nhật trạng thái tài khoản thành công." });
    }
}

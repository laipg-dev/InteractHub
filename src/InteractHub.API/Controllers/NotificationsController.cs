using System.Security.Claims;
using InteractHub.API.DTOs.Auth;
using InteractHub.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;

    public NotificationsController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    // Helper: Lấy UserId của người dùng đang gửi request từ Token (JWT)
    private string GetCurrentUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
    }

    /// <summary>
    /// Lấy danh sách thông báo của user (có phân trang)
    /// GET: /api/notifications?page=1&pageSize=20
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetNotifications([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var notifications = await _notificationService.GetUserNotificationsAsync(userId, page, pageSize);
        
        // Mẹo: Nếu bạn dùng Entity Framework trả thẳng Entity có Include() ra API,
        // có thể bị lỗi System.Text.Json.JsonException: A possible object cycle was detected.
        // Tốt nhất bạn nên map 'notifications' sang một DTO (NotificationDto) ở bước này trước khi return.
        
        return Ok(notifications);
    }

    /// <summary>
    /// Lấy số lượng thông báo chưa đọc để hiển thị badge đỏ trên icon chuông
    /// GET: /api/notifications/unread-count
    /// </summary>
    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var count = await _notificationService.GetUnreadCountAsync(userId);
        
        return Ok(new { unreadCount = count });
    }

    /// <summary>
    /// Đánh dấu 1 thông báo cụ thể là đã đọc (Khi user click vào thông báo)
    /// PUT: /api/notifications/{id}/read
    /// </summary>
    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var result = await _notificationService.MarkAsReadAsync(id, userId);
        
        if (!result) 
            return NotFound(new { message = "Không tìm thấy thông báo hoặc thông báo đã được đọc từ trước." });

        return Ok(new { message = "Đã đánh dấu đọc thành công." });
    }

    /// <summary>
    /// Đánh dấu TẤT CẢ thông báo của user là đã đọc
    /// PUT: /api/notifications/read-all
    /// </summary>
    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var result = await _notificationService.MarkAllAsReadAsync(userId);
        
        if (!result) 
            return Ok(new { message = "Không có thông báo nào cần đánh dấu." });

        return Ok(new { message = "Đã đánh dấu đọc tất cả." });
    }

    [HttpPost("create")]
    public async Task<IActionResult> CreateNotification([FromBody] CreateNotificationRequest request)
    {
        var senderId = GetCurrentUserId();
        if (string.IsNullOrEmpty(senderId)) return Unauthorized();

        // Gọi trực tiếp service, service sẽ tự lo việc generate message dựa trên Type
        var notification = await _notificationService.CreateNotificationAsync(
            request.ReceiverId, 
            senderId, 
            request.Type!.Value,
            request.Message,
            request.PostId, 
            request.CommentId, 
            request.StoryId);

        if (notification == null)
            return BadRequest(new { message = "Không thể tạo thông báo." });

        return Ok(notification);
    }

    

}

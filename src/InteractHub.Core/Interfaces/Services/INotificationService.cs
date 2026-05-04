using InteractHub.Core.Entities;
using InteractHub.Core.DTOs;    
namespace InteractHub.Core.Interfaces;

public interface INotificationService
{
    // --- Dành cho phía Người Nhận (Hiển thị UI) ---
    
    // Lấy danh sách thông báo của user (có phân trang)
    Task<IEnumerable<NotificationDto>> GetUserNotificationsAsync(string userId, int page = 1, int pageSize = 20);
    
    // Lấy số lượng thông báo chưa đọc
    Task<int> GetUnreadCountAsync(string userId);
    
    // Đánh dấu 1 thông báo là đã đọc
    Task<bool> MarkAsReadAsync(int notificationId, string userId);
    
    // Đánh dấu tất cả thông báo của user là đã đọc
    Task<bool> MarkAllAsReadAsync(string userId);

    // --- Dành cho hệ thống (Các Service khác gọi vào để tạo thông báo) ---
    
    // Hàm tạo thông báo chung
    Task<NotificationDto?> CreateNotificationAsync(
        string receiverId, 
        string senderId, 
        NotificationType type, 
        string? message = null,
        int? postId = null, 
        int? commentId = null, 
        int? storyId = null);
}

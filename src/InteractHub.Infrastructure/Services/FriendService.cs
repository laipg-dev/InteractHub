using InteractHub.Core.Entities;
using InteractHub.Core.Interfaces;
using InteractHub.Core.Interfaces.Services;
using InteractHub.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InteractHub.Infrastructure.Services;
public class FriendService : IFriendService
{
    private readonly ApplicationDbContext _context;
    private readonly INotificationService _notificationService;
    private readonly IAppRealtimeDispatcher _appRealtimeDispatcher;

    public FriendService(
        ApplicationDbContext context,
        INotificationService notificationService,
        IAppRealtimeDispatcher appRealtimeDispatcher)
    {
        _context = context;
        _notificationService = notificationService;
        _appRealtimeDispatcher = appRealtimeDispatcher;
    }

    // Trả về: 0: Chưa có gì, 1: Đã gửi (chờ), 2: Được mời (đợi mình), 3: Đã là bạn
    public async Task<int> GetFriendStatusAsync(string currentUserId, string targetUserId)
    {
        var friendship = await _context.Friendships
            .FirstOrDefaultAsync(f =>
                (f.UserId == currentUserId && f.FriendId == targetUserId) ||
                (f.UserId == targetUserId && f.FriendId == currentUserId));

        if (friendship == null) return 0;
        if (friendship.IsAccepted) return 3;

        // Nếu mình là người gửi (UserId) -> Đang chờ họ (1)
        // Nếu mình là người nhận (FriendId) -> Họ đang chờ mình (2)
        return friendship.UserId == currentUserId ? 1 : 2;
    }

    public async Task<bool> SendFriendRequestAsync(string senderId, string receiverId)
    {
        // Kiểm tra xem đã tồn tại yêu cầu nào chưa
        var exists = await _context.Friendships.AnyAsync(f =>
            (f.UserId == senderId && f.FriendId == receiverId) ||
            (f.UserId == receiverId && f.FriendId == senderId));

        if (exists) return false;

        var request = new Friendship
        {
            UserId = senderId,
            FriendId = receiverId,
            IsAccepted = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Friendships.Add(request);
        var saved = await _context.SaveChangesAsync() > 0;
        if (!saved) return false;

        // [Notification] Sau khi lưu DB thành công thì tạo thông báo cho người nhận.
        await _notificationService.CreateNotificationAsync(
            receiverId,
            senderId,
            NotificationType.FriendRequestReceived);

        // [SignalR] Đồng bộ lại danh sách bạn bè/lời mời ở cả 2 phía nếu họ đang mở nhiều tab.
        await _appRealtimeDispatcher.PushFriendsRefreshAsync(senderId, receiverId);

        return true;
    }

    public async Task<bool> AcceptFriendRequestAsync(string userId, string friendId)
    {
        // Người nhận (FriendId trong DB) nhấn Accept nên mình tìm theo ReceiverId = userId
        var request = await _context.Friendships
            .FirstOrDefaultAsync(f => f.UserId == friendId && f.FriendId == userId && !f.IsAccepted);

        if (request == null) return false;

        request.IsAccepted = true;
        var saved = await _context.SaveChangesAsync() > 0;
        if (!saved) return false;

        // [Notification] Sau khi accept thành công thì tạo thông báo ngược lại cho người đã gửi lời mời.
        await _notificationService.CreateNotificationAsync(
            friendId,
            userId,
            NotificationType.FriendAccepted);

        // [SignalR] Đồng bộ lại tab friends/requests/sent ở cả 2 người dùng.
        await _appRealtimeDispatcher.PushFriendsRefreshAsync(userId, friendId);

        return true;
    }

    public async Task<bool> RejectOrUnfriendAsync(string userId, string friendId)
    {
        var friendship = await _context.Friendships
            .FirstOrDefaultAsync(f =>
                (f.UserId == userId && f.FriendId == friendId) ||
                (f.UserId == friendId && f.FriendId == userId));

        if (friendship == null) return false;

        _context.Friendships.Remove(friendship);
        var saved = await _context.SaveChangesAsync() > 0;
        if (!saved) return false;

        // [SignalR] Không tạo notification ở nhánh này, nhưng vẫn cần refresh UI realtime ở các tab liên quan.
        await _appRealtimeDispatcher.PushFriendsRefreshAsync(userId, friendId);

        return true;
    }

    public async Task<List<FriendDto>> GetAcceptedFriendsAsync(string userId)
    {
        var friends = await _context.Friendships
            .Where(f => (f.UserId == userId || f.FriendId == userId) && f.IsAccepted)
            .Select(f => new FriendDto
            {
                UserId = f.UserId == userId ? f.FriendId : f.UserId,
                FullName = f.UserId == userId ? f.Friend.FullName : f.User.FullName,
                AvatarUrl = f.UserId == userId ? f.Friend.AvatarUrl : f.User.AvatarUrl
            })
            .ToListAsync();

        return friends;
    }

    public async Task<List<FriendDto>> GetPendingRequestsAsync(string userId)
    {
        var requests = await _context.Friendships
            .Where(f => f.FriendId == userId && !f.IsAccepted)
            .Select(f => new FriendDto
            {
                UserId = f.UserId,
                FullName = f.User.FullName,
                AvatarUrl = f.User.AvatarUrl
            })
            .ToListAsync();

        return requests;
    }

    public async Task<List<FriendDto>> GetSentRequestsAsync(string userId)
    {
        var sentRequests = await _context.Friendships
            .Where(f => f.UserId == userId && !f.IsAccepted)
            .Select(f => new FriendDto
            {
                UserId = f.FriendId,
                FullName = f.Friend.FullName,
                AvatarUrl = f.Friend.AvatarUrl
            })
            .ToListAsync();

        return sentRequests;
    }
}

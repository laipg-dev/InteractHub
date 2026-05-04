using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace InteractHub.Infrastructure.Hubs;

[Authorize]
public class AppRealtimeHub : Hub
{
    public static string UserGroup(string userId) => $"user:{userId}";
    public static string PostGroup(int postId) => $"post:{postId}";

    public override async Task OnConnectedAsync()
    {
        var userId =
            Context.UserIdentifier ??
            Context.User?.FindFirstValue(ClaimTypes.NameIdentifier) ??
            Context.User?.FindFirstValue("sub");

        if (!string.IsNullOrWhiteSpace(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, UserGroup(userId));
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId =
            Context.UserIdentifier ??
            Context.User?.FindFirstValue(ClaimTypes.NameIdentifier) ??
            Context.User?.FindFirstValue("sub");

        if (!string.IsNullOrWhiteSpace(userId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, UserGroup(userId));
        }

        await base.OnDisconnectedAsync(exception);
    }

    public async Task JoinPostGroup(int postId)
    {
        if (postId <= 0) return;

        // [SignalR] Cho phép client đang xem một post tham gia group riêng của post đó
        // để nhận realtime like/comment từ các user khác cũng đang xem cùng post.
        await Groups.AddToGroupAsync(Context.ConnectionId, PostGroup(postId));
    }

    public async Task LeavePostGroup(int postId)
    {
        if (postId <= 0) return;

        // [SignalR] Rời group khi đóng modal / không còn theo dõi post nữa.
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, PostGroup(postId));
    }
}

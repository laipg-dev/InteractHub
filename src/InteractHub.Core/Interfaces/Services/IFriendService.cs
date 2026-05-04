
namespace InteractHub.Core.Interfaces.Services;
public interface IFriendService
{
    Task<int> GetFriendStatusAsync(string currentUserId, string targetUserId);
    Task<bool> SendFriendRequestAsync(string senderId, string receiverId);
    Task<bool> AcceptFriendRequestAsync(string userId, string friendId);
    Task<bool> RejectOrUnfriendAsync(string userId, string friendId);
    Task<List<FriendDto>> GetAcceptedFriendsAsync(string userId);
    Task<List<FriendDto>> GetPendingRequestsAsync(string userId);
    Task<List<FriendDto>> GetSentRequestsAsync(string userId);
}

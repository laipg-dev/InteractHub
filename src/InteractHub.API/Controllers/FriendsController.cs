using System.Security.Claims;
using InteractHub.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class FriendsController : ControllerBase
{
    private readonly IFriendService _friendService;

    public FriendsController(IFriendService friendService)
    {
        _friendService = friendService;
    }

    [HttpGet("list-and-requests")]
    public async Task<IActionResult> GetFriendData()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var friends = await _friendService.GetAcceptedFriendsAsync(userId);
        var requests = await _friendService.GetPendingRequestsAsync(userId);
        var sent = await _friendService.GetSentRequestsAsync(userId);

        return Ok(new { friends, requests, sent });
    }

    [HttpGet("sent-requests")]
    public async Task<IActionResult> GetSentRequests()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var sent = await _friendService.GetSentRequestsAsync(userId);
        return Ok(sent);
    }

    [HttpPost("send/{receiverId}")]
    public async Task<IActionResult> SendRequest(string receiverId)
    {
        var senderId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (senderId == receiverId) return BadRequest("Duy không thể tự kết bạn với chính mình!");

        var result = await _friendService.SendFriendRequestAsync(senderId!, receiverId);
        return result ? Ok() : BadRequest("Yêu cầu đã tồn tại hoặc có lỗi.");
    }

    [HttpPost("accept/{friendId}")]
    public async Task<IActionResult> AcceptRequest(string friendId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var result = await _friendService.AcceptFriendRequestAsync(userId!, friendId);
        return result ? Ok() : BadRequest("Không tìm thấy lời mời.");
    }

    [HttpPost("reject/{friendId}")]
    public async Task<IActionResult> RejectRequest(string friendId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var result = await _friendService.RejectOrUnfriendAsync(userId!, friendId);
        return result ? Ok() : BadRequest("Thao tác thất bại.");
    }
}

using System.Security.Claims;
using InteractHub.Core.DTOs;
using InteractHub.Core.Entities;
using InteractHub.Core.Interfaces.Services;
using InteractHub.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

[Route("api/[controller]")]
[ApiController]
public class UsersController : ControllerBase
{
private readonly IAzureBlobService _azureBlobService;
    private readonly ApplicationDbContext _context;
    private readonly IPostService _postService;
    private readonly UserManager<ApplicationUser> _userManager;

    // DUY THÊM ĐOẠN CONSTRUCTOR NÀY VÀO NHÉ
    public UsersController(IPostService postService, IAzureBlobService azureBlobService, ApplicationDbContext context, UserManager<ApplicationUser> userManager)
    {
        _postService = postService;
        _azureBlobService = azureBlobService;
        _context = context;
        _userManager = userManager;
    }

    [HttpGet("profile/{id}")]
    public async Task<IActionResult> GetProfile(string id)
    {
        // Lấy ID người dùng đang đăng nhập từ Token
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "";
        
        var profile = await _postService.GetUserProfileAsync(id, currentUserId);
        
        if (profile == null) return NotFound();
        
        return Ok(profile);
    }

    [HttpGet("me")]
public async Task<IActionResult> GetMe()
{
    // Lấy ID từ Token của người đang đăng nhập
    var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (userId == null) return Unauthorized();

    // Tái sử dụng hàm lấy Profile Duy đã viết, truyền userId của chính mình vào
    var profile = await _postService.GetUserProfileAsync(userId, userId);
    
    return Ok(profile);
}

[HttpPut("update")]
public async Task<IActionResult> UpdateProfile([FromForm] UpdateUserDto model, IFormFile? avatarFile)
{
    var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (userId == null) return Unauthorized();

    var user = await _context.Users.FindAsync(userId);
    if (user == null) return NotFound();

    // 1. Xử lý upload ảnh nếu có file mới được gửi lên
    if (avatarFile != null && avatarFile.Length > 0)
    {
        using var stream = avatarFile.OpenReadStream();
        // Upload lên container "avatars" với quyền truy cập Public (Cách 1)
        var newAvatarUrl = await _azureBlobService.UploadFileAsync(
            stream, 
            avatarFile.FileName, 
            avatarFile.ContentType, 
            "avatars", 
            userId
        );
        
        user.AvatarUrl = newAvatarUrl;
    }

    // 2. Cập nhật các thông tin còn lại
    user.FullName = model.FullName;
    user.Bio = model.Bio;
    user.Email = model.Email;
    user.PhoneNumber = model.PhoneNumber;

    await _context.SaveChangesAsync();
    
    return Ok(new { 
        id = user.Id, 
        avatarUrl = user.AvatarUrl, 
        message = "Cập nhật hồ sơ thành công!" 
    });
}

[HttpPost("change-password")]
[Authorize]
public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto model)
{
    // Validate request model
    if (string.IsNullOrWhiteSpace(model.OldPassword))
        return BadRequest(new { message = "Mật khẩu hiện tại không được để trống" });

    if (string.IsNullOrWhiteSpace(model.NewPassword))
        return BadRequest(new { message = "Mật khẩu mới không được để trống" });

    if (model.NewPassword.Length < 6)
        return BadRequest(new { message = "Mật khẩu mới phải có ít nhất 6 ký tự" });

    // Get current user from JWT token
    var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrEmpty(userId))
        return Unauthorized(new { message = "Không tìm thấy thông tin người dùng" });

    var user = await _userManager.FindByIdAsync(userId);
    if (user == null)
        return NotFound(new { message = "Người dùng không tồn tại" });

    // Verify current password
    var isPasswordCorrect = await _userManager.CheckPasswordAsync(user, model.OldPassword);
    if (!isPasswordCorrect)
        return BadRequest(new { message = "Mật khẩu hiện tại không chính xác" });

    // Change password
    var result = await _userManager.ChangePasswordAsync(user, model.OldPassword, model.NewPassword);
    if (!result.Succeeded)
    {
        var errors = string.Join(", ", result.Errors.Select(e => e.Description));
        return BadRequest(new { message = $"Không thể thay đổi mật khẩu: {errors}" });
    }

    return Ok(new { message = "Đổi mật khẩu thành công!" });
}
}
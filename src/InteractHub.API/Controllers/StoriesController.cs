using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using InteractHub.Infrastructure.Services;
using System.Security.Claims;
namespace InteractHub.API.Controllers;

[Authorize] // Bắt buộc đăng nhập mới dùng được Story
[ApiController]
[Route("api/[controller]")]
public class StoriesController : ControllerBase
{
    private readonly IStoryService _storyService;
private readonly IAzureBlobService _azureBlobService;

    public StoriesController(IStoryService storyService,IAzureBlobService azureBlobService)
    {
        _storyService = storyService;
        _azureBlobService = azureBlobService;
    }

    /// <summary>
    /// Lấy danh sách Story của bản thân và bạn bè (còn hạn 24h)
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetActiveStories()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var stories = await _storyService.GetActiveStoriesAsync(userId);
        return Ok(stories);
    }

    /// <summary>
    /// Đăng một Story mới
    /// </summary>
    [HttpPost("createStory")]
public async Task<IActionResult> CreateStory([FromForm] IFormFile image)
{
    var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrEmpty(userId)) return Unauthorized();

    if (image == null || image.Length == 0)
        return BadRequest("Duy ơi, Story thì phải có hình ảnh chứ!");

    string imageUrl;

    using (var stream = image.OpenReadStream())
    {
        imageUrl = await _azureBlobService.UploadFileAsync(
            stream,
            image.FileName,
            image.ContentType,
            "stories",
            userId
        );
    }

    var result = await _storyService.CreateStoryAsync(userId, imageUrl);

    if (result)
        return Ok(new { message = "Đăng Story thành công rồi nhé!", imageUrl });

    return BadRequest("Có lỗi xảy ra khi đăng Story.");
}

    /// <summary>
    /// Xóa Story của chính mình
    /// </summary>
    [HttpDelete("deleteStory/{id}")]
    public async Task<IActionResult> DeleteStory(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var result = await _storyService.DeleteStoryAsync(id, userId);
        if (result) return Ok(new { message = "Đã xóa Story thành công." });

        return BadRequest("Không tìm thấy Story hoặc Duy không có quyền xóa tin này.");
    }
}

// Class bổ trợ để nhận dữ liệu từ Body
public class CreateStoryRequest
{
    public string ImageUrl { get; set; } = string.Empty;
}
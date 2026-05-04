using System.Security.Claims;
using InteractHub.Core.DTOs;
using InteractHub.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InteractHub.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class PostsController : ControllerBase
{
    private readonly IPostService _postService;
    private readonly IAzureBlobService _azureBlobService;

    public PostsController(IPostService postService, IAzureBlobService azureBlobService)
    {
        _postService = postService;
        _azureBlobService = azureBlobService;
    }

    [HttpGet("getAllPostByUser")]
    public async Task<IActionResult> GetAll()
    {
        var posts = await _postService.GetAllPostsAsync();
        return Ok(posts);
    }

    [HttpGet("{postId:int}")]
    public async Task<IActionResult> GetPostById(int postId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        var post = await _postService.GetPostByIdAsync(postId, userId);

        if (post == null)
            return NotFound("Bài viết không tồn tại");

        return Ok(post);
    }

    [HttpPost("CreatePost")]
    public async Task<IActionResult> Create([FromForm] CreatePostDto dto, IFormFile? image)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
            return Unauthorized("Phiên làm việc đã hết hạn.");

        if (image != null && image.Length > 0)
        {
            using (var stream = image.OpenReadStream())
            {
                var uploadedUrl = await _azureBlobService.UploadFileAsync(
                    stream,
                    image.FileName,
                    image.ContentType,
                    "posts",
                    userId
                );

                dto.ImageUrl = uploadedUrl;
            }
        }

        var post = await _postService.CreatePostAsync(userId, dto);
        return Ok(post);
    }

    [HttpPost("{postId}/like")]
    public async Task<IActionResult> ToggleLike(int postId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { error = "Vui lòng đăng nhập để thực hiện chức năng này" });

        var result = await _postService.ToggleLikeAsync(postId, userId);
        return Ok(result);
    }

    [HttpDelete("delete/{postId}")]
    public async Task<IActionResult> DeletePost(int postId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(userId))
            return Unauthorized("Không tìm thấy UserId trong Token");

        var isDeleted = await _postService.DeletePostAsync(postId, userId);
        if (!isDeleted)
            return NotFound("Post không tồn tại hoặc không phải của bạn");

        return Ok("Post đã được xóa");
    }

    [HttpPost("{postId}/comment")]
    public async Task<IActionResult> AddComment(int postId, [FromBody] CommentCreateDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        if (string.IsNullOrEmpty(dto.Content)) return BadRequest("Nội dung không được để trống");

        var result = await _postService.AddCommentAsync(postId, userId, dto.Content);
        if (result == null) return NotFound("Bài viết không tồn tại");

        return Ok(result);
    }

    [HttpDelete("comment/{commentId}")]
    public async Task<IActionResult> DeleteComment(int commentId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var result = await _postService.DeleteCommentAsync(commentId, userId);

        if (!result) return BadRequest("Không thể xóa bình luận này (Bình luận không tồn tại hoặc bạn không có quyền)");

        return Ok(new { message = "Xóa bình luận thành công" });
    }

    [HttpGet("{postId}/comments")]
    public async Task<IActionResult> GetComments(int postId)
    {
        var comments = await _postService.GetCommentsByPostIdAsync(postId);

        if (comments == null)
            return NotFound("Bài viết không tồn tại");

        return Ok(comments);
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q, [FromQuery] int? priorityId = null)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "";
        var results = await _postService.GlobalSearchAsync(q, userId, priorityId);
        return Ok(results);
    }

    [HttpGet("trending-hashtags")]
    public async Task<IActionResult> GetTrendingHashtags()
    {
        var hashtags = await _postService.GetTopTrendingHashtagsAsync(count: 10);
        return Ok(hashtags);
    }

    [HttpGet("userPosts/{userId}")]
    public async Task<IActionResult> GetUserPosts(string userId)
    {
        var posts = await _postService.GetPostsByUserIdAsync(userId);
        return Ok(posts);
    }
}

using InteractHub.Core.DTOs;
namespace InteractHub.Core.Interfaces.Services;
public interface IPostService
{
    Task<IEnumerable<PostResponseDto>> GetAllPostsAsync();
    Task<PostResponseDto?> GetPostByIdAsync(int postId, string currentUserId);
    Task<PostResponseDto> CreatePostAsync(string userId, CreatePostDto createPostDto);
    Task<bool> DeletePostAsync(int postId, string userId);

    Task<LikeResponseDto> ToggleLikeAsync(int postId, string userId);

    Task<CommentResponseDto?> AddCommentAsync(int postId, string userId, string content);

    Task<bool> DeleteCommentAsync(int commentId, string userId);

    Task<IEnumerable<CommentResponseDto>?> GetCommentsByPostIdAsync(int postId);

Task<SearchResultDto> GlobalSearchAsync(string query, string currentUserId, int? priorityPostId = null);
    Task<UserProfileDto> GetUserProfileAsync(string userId, string currentUserId);
    Task<IEnumerable<string>> GetTopTrendingHashtagsAsync(int count = 10);

    Task<IEnumerable<PostResponseDto>> GetPostsByUserIdAsync(string userId);
}

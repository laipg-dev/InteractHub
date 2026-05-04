using InteractHub.Core.DTOs;

namespace InteractHub.Core.Interfaces;

public interface IAdminPostService
{
    Task<IReadOnlyList<AdminPostUserListItemDto>> GetUsersAsync(
        string? query = null,
        string? sortBy = null,
        string? sortDir = null);

    Task<IReadOnlyList<AdminPostListItemDto>> GetPostsAsync(
        string? query = null,
        string? state = null,
        string? userId = null,
        string? sortBy = null,
        string? sortDir = null);

    Task<IReadOnlyList<AdminPostUserGroupDto>> GetPostsGroupedByUserAsync(
        string? query = null,
        string? state = null,
        string? userId = null,
        string? sortBy = null,
        string? sortDir = null);

    Task<AdminPostDetailDto?> GetPostByIdAsync(int postId);
    Task<AdminPostDetailDto?> UpdatePostAsync(int postId, UpdateAdminPostRequest request, string adminUserId);
    Task<IReadOnlyList<AdminCommentListItemDto>> GetCommentsAsync(
        int postId,
        string? query = null,
        string? state = null,
        string? sortBy = null,
        string? sortDir = null);

    Task<IReadOnlyList<AdminCommentListItemDto>> GetAllCommentsAsync(
        string? query = null,
        string? state = null,
        int? postId = null,
        string? userId = null,
        string? sortBy = null,
        string? sortDir = null);
    Task<bool> SetPostRemovedStateAsync(int postId, bool removed, string adminUserId);
    Task<bool> SetCommentRemovedStateAsync(int commentId, bool removed, string adminUserId);
}

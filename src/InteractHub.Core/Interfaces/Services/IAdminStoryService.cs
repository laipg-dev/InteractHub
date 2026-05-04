using InteractHub.Core.DTOs;

namespace InteractHub.Core.Interfaces;

public interface IAdminStoryService
{
    Task<IReadOnlyList<AdminStoryUserListItemDto>> GetUsersAsync(
        string? query = null,
        string? sortBy = null,
        string? sortDir = null);

    Task<IReadOnlyList<AdminStoryListItemDto>> GetStoriesAsync(
        string? query = null,
        string? state = null,
        string? userId = null,
        string? sortBy = null,
        string? sortDir = null);

    Task<IReadOnlyList<AdminStoryUserGroupDto>> GetStoriesGroupedByUserAsync(
        string? query = null,
        string? state = null,
        string? userId = null,
        string? sortBy = null,
        string? sortDir = null);

    Task<AdminStoryDetailDto?> GetStoryByIdAsync(int storyId);
    Task<bool> SetStoryRemovedStateAsync(int storyId, bool removed, string adminUserId);
}

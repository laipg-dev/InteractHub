using InteractHub.Core.DTOs;

namespace InteractHub.Core.Interfaces;

public interface IAdminUserService
{
    Task<IReadOnlyList<AdminUserListItemDto>> GetUsersAsync(
        string? query = null,
        string? role = null,
        bool? isActive = null,
        string? sortBy = null,
        string? sortDir = null);
    Task<AdminUserDetailDto?> GetUserByIdAsync(string userId);
    Task<AdminUserDetailDto> CreateUserAsync(CreateAdminUserRequest request);
    Task<AdminUserDetailDto?> UpdateUserAsync(string userId, UpdateAdminUserRequest request);
    Task<bool> SetUserActiveStateAsync(string userId, bool isActive);
}

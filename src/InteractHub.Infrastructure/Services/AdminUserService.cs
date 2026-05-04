using InteractHub.Core.DTOs;
using InteractHub.Core.Entities;
using InteractHub.Core.Interfaces;
using InteractHub.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace InteractHub.Infrastructure.Services;

public class AdminUserService : IAdminUserService
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;

    public AdminUserService(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    public async Task<IReadOnlyList<AdminUserListItemDto>> GetUsersAsync(
        string? query = null,
        string? role = null,
        bool? isActive = null,
        string? sortBy = null,
        string? sortDir = null)
    {
        var normalizedRole = string.IsNullOrWhiteSpace(role)
            ? null
            : role.Trim().ToLower();

        var usersQuery = _context.Users
            .IgnoreQueryFilters()
            .AsQueryable();

        if (isActive.HasValue)
        {
            usersQuery = usersQuery.Where(u => u.IsActive == isActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(query))
        {
            var keyword = query.Trim().ToLower();
            usersQuery = usersQuery.Where(u =>
                (u.UserName ?? string.Empty).ToLower().Contains(keyword) ||
                (u.FullName ?? string.Empty).ToLower().Contains(keyword) ||
                (u.Email ?? string.Empty).ToLower().Contains(keyword));
        }

        var userRolesQuery =
            from userRole in _context.UserRoles
            join roleEntity in _context.Roles on userRole.RoleId equals roleEntity.Id
            select new { userRole.UserId, RoleName = roleEntity.Name ?? string.Empty };

        var projected = await (
            from user in usersQuery
            join userRole in userRolesQuery on user.Id equals userRole.UserId into roleJoin
            from roleInfo in roleJoin.DefaultIfEmpty()
            let roleName = roleInfo != null && !string.IsNullOrWhiteSpace(roleInfo.RoleName)
                ? roleInfo.RoleName
                : "User"
            where normalizedRole == null || roleName.ToLower() == normalizedRole
            select new AdminUserListItemDto
            {
                Id = user.Id,
                UserName = user.UserName ?? string.Empty,
                FullName = user.FullName,
                Email = user.Email,
                IsActive = user.IsActive,
                Role = roleName,
                CreatedAt = user.CreatedAt,
                PostCount = _context.Posts.IgnoreQueryFilters().Count(p => p.UserId == user.Id && !p.IsDeleted),
                CommentCount = _context.Comments.IgnoreQueryFilters().Count(c => c.UserId == user.Id && !c.IsDeleted),
                StoryCount = _context.Stories.IgnoreQueryFilters().Count(s => s.UserId == user.Id && !s.IsDeleted)
            }
        ).ToListAsync();

        var items = projected.AsEnumerable();
        var descending = !string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase);

        items = (sortBy ?? "createdAt").ToLower() switch
        {
            "username" => descending
                ? items.OrderByDescending(item => item.UserName).ThenByDescending(item => item.CreatedAt)
                : items.OrderBy(item => item.UserName).ThenBy(item => item.CreatedAt),
            "fullname" => descending
                ? items.OrderByDescending(item => item.FullName ?? string.Empty).ThenByDescending(item => item.CreatedAt)
                : items.OrderBy(item => item.FullName ?? string.Empty).ThenBy(item => item.CreatedAt),
            "email" => descending
                ? items.OrderByDescending(item => item.Email ?? string.Empty).ThenByDescending(item => item.CreatedAt)
                : items.OrderBy(item => item.Email ?? string.Empty).ThenBy(item => item.CreatedAt),
            "role" => descending
                ? items.OrderByDescending(item => item.Role).ThenByDescending(item => item.CreatedAt)
                : items.OrderBy(item => item.Role).ThenBy(item => item.CreatedAt),
            _ => descending
                ? items.OrderByDescending(item => item.CreatedAt)
                : items.OrderBy(item => item.CreatedAt)
        };

        return items.ToList();
    }

    public async Task<AdminUserDetailDto?> GetUserByIdAsync(string userId)
    {
        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return null;

        return await BuildUserDetailAsync(user);
    }

    public async Task<AdminUserDetailDto> CreateUserAsync(CreateAdminUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.UserName) || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            throw new Exception("Thiếu thông tin bắt buộc để tạo tài khoản.");

        var normalizedRole = string.Equals(request.Role, "Admin", StringComparison.OrdinalIgnoreCase) ? "Admin" : "User";

        var user = new ApplicationUser
        {
            UserName = request.UserName.Trim(),
            Email = request.Email.Trim(),
            FullName = request.FullName.Trim(),
            PhoneNumber = request.PhoneNumber,
            Bio = request.Bio,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var createResult = await _userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
            throw new Exception(string.Join(", ", createResult.Errors.Select(e => e.Description)));

        await _userManager.AddToRoleAsync(user, normalizedRole);

        return await BuildUserDetailAsync(user);
    }

    public async Task<AdminUserDetailDto?> UpdateUserAsync(string userId, UpdateAdminUserRequest request)
    {
        var user = await _userManager.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return null;

        user.UserName = request.UserName.Trim();
        user.Email = request.Email.Trim();
        user.FullName = request.FullName.Trim();
        user.PhoneNumber = request.PhoneNumber;
        user.Bio = request.Bio;
        user.AvatarUrl = request.AvatarUrl;
        user.IsActive = request.IsActive;

        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
            throw new Exception(string.Join(", ", updateResult.Errors.Select(e => e.Description)));

        var currentRoles = await _userManager.GetRolesAsync(user);
        if (currentRoles.Any())
        {
            await _userManager.RemoveFromRolesAsync(user, currentRoles);
        }

        var normalizedRole = string.Equals(request.Role, "Admin", StringComparison.OrdinalIgnoreCase) ? "Admin" : "User";
        await _userManager.AddToRoleAsync(user, normalizedRole);

        if (!string.IsNullOrWhiteSpace(request.NewPassword))
        {
            var resetToken = await _userManager.GeneratePasswordResetTokenAsync(user);
            var resetResult = await _userManager.ResetPasswordAsync(user, resetToken, request.NewPassword);
            if (!resetResult.Succeeded)
                throw new Exception(string.Join(", ", resetResult.Errors.Select(e => e.Description)));
        }

        return await BuildUserDetailAsync(user);
    }

    public async Task<bool> SetUserActiveStateAsync(string userId, bool isActive)
    {
        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return false;

        user.IsActive = isActive;
        await _context.SaveChangesAsync();
        return true;
    }

    private async Task<AdminUserDetailDto> BuildUserDetailAsync(ApplicationUser user)
    {
        var role = await (
            from userRole in _context.UserRoles
            join roleEntity in _context.Roles on userRole.RoleId equals roleEntity.Id
            where userRole.UserId == user.Id
            select roleEntity.Name
        ).FirstOrDefaultAsync();

        return new AdminUserDetailDto
        {
            Id = user.Id,
            UserName = user.UserName ?? string.Empty,
            FullName = user.FullName,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            Bio = user.Bio,
            AvatarUrl = user.AvatarUrl,
            IsActive = user.IsActive,
            Role = role ?? "User",
            CreatedAt = user.CreatedAt,
            PostCount = await _context.Posts.IgnoreQueryFilters().CountAsync(p => p.UserId == user.Id && !p.IsDeleted),
            CommentCount = await _context.Comments.IgnoreQueryFilters().CountAsync(c => c.UserId == user.Id && !c.IsDeleted),
            StoryCount = await _context.Stories.IgnoreQueryFilters().CountAsync(s => s.UserId == user.Id && !s.IsDeleted),
            NotificationCount = await _context.Notifications.IgnoreQueryFilters().CountAsync(n => n.UserId == user.Id)
        };
    }
}

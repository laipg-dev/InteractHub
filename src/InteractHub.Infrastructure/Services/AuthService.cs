
using InteractHub.Core.Entities;
using InteractHub.Core.Interfaces;
using Microsoft.AspNetCore.Identity;

namespace InteractHub.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IJwtService _jwtService;

    public AuthService(UserManager<ApplicationUser> userManager, IJwtService jwtService)
    {
        _userManager = userManager;
        _jwtService = jwtService;
    }

    public async Task<(string Token, string UserName, string Email)> RegisterAsync(
    string userName,
    string email,
    string fullName,
    string password)
{
    var user = new ApplicationUser
    {
        UserName = userName,
        Email = email,
        FullName = fullName
    };

    var result = await _userManager.CreateAsync(user, password);
    if (!result.Succeeded)
    {
        throw new Exception(string.Join(", ", result.Errors.Select(e => e.Description)));
    }

    // Gán role mặc định
    await _userManager.AddToRoleAsync(user, "User");

    var roles = await _userManager.GetRolesAsync(user);
    var token = _jwtService.GenerateToken(user, roles);

    return (token, user.UserName!, user.Email!);
}

public async Task<(string Token, string UserName, string Email)> LoginAsync(
    string userName,
    string password)
{
    var user = await _userManager.FindByNameAsync(userName);
    if (user == null)
        throw new Exception("Đăng nhập thất bại: Sai username hoặc password");

    var isValid = await _userManager.CheckPasswordAsync(user, password);
    if (!isValid)
        throw new Exception("Đăng nhập thất bại: Sai username hoặc password");

    var roles = await _userManager.GetRolesAsync(user);
    var token = _jwtService.GenerateToken(user, roles);

    return (token, user.UserName!, user.Email!);
}


}
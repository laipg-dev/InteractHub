using InteractHub.API.DTOs.Auth;
using InteractHub.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace InteractHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterDto dto)
    {
        
        var result = await _authService.RegisterAsync(dto.UserName, dto.Email, dto.FullName, dto.Password);

        return Ok(new AuthResponseDto
        {
            Token = result.Token,
            UserName = result.UserName,
            Email = result.Email
        });
    }
    
    

    [HttpPost("login")]
public async Task<IActionResult> Login(LoginDto dto)
{
    // Không cần try-catch, Middleware sẽ lo nếu LoginAsync bắn ra Exception
    var result = await _authService.LoginAsync(dto.UserName, dto.Password);
    return Ok(new AuthResponseDto
    {
        Token = result.Token,
        UserName = result.UserName,
        Email = result.Email
    });
}

}
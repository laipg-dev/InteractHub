using System.ComponentModel.DataAnnotations;

namespace InteractHub.API.DTOs.Auth;

public class RegisterDto
{
    [Required]
    public string UserName { get; set; } = null!;

    [Required]
    public string FullName { get; set; } = null!;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = null!;

    [Required]
    [MinLength(6)]
    public string Password { get; set; } = null!;
}

public class LoginDto
{
    [Required]
    public string UserName { get; set; } = null!;
    [Required]
    public string Password { get; set; } = null!;
}

public class AuthResponseDto
{
    [Required]
    public string Token { get; set; } = null!;
    [Required]
    public string UserName { get; set; } = null!;
    [Required]
    public string Email { get; set; } = null!;
}
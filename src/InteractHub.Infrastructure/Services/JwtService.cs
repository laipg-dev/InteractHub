using InteractHub.Core.Interfaces;
using InteractHub.Core.Entities;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace InteractHub.Infrastructure.Services;

public class JwtService : IJwtService
{
    private readonly IConfiguration _config;

    public JwtService(IConfiguration config)
    {
        _config = config;
    }

    public string GenerateToken(ApplicationUser user, IList<string> roles)
{
    var claims = new List<Claim>
    {
        // Viết thẳng "sub" thay vì ClaimTypes.NameIdentifier
        new Claim("sub", user.Id), 
        new Claim("name", user.UserName!),
        new Claim("email", user.Email!)
    };

    // Thêm role với key ngắn là "roles" hoặc "role"
    foreach (var role in roles)
    {
        claims.Add(new Claim("role", role));
    }
    var key = new SymmetricSecurityKey(
        Encoding.UTF8.GetBytes(_config["JwtSettings:SecretKey"]!));

    var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

    var token = new JwtSecurityToken(
        issuer: "InteractHub",
        audience: _config["JwtSettings:Audience"],
        claims: claims,
        expires: DateTime.UtcNow.AddDays(
            int.Parse(_config["JwtSettings:ExpirationDays"]!)),
        signingCredentials: creds
    );

    return new JwtSecurityTokenHandler().WriteToken(token);
}


}
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace InteractHub.API.Extensions;

public static class JwtExtensions
{
    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration config)
{
    // Lấy thông tin từ config
    var secretKey = config["JwtSettings:SecretKey"];
    var issuer = config["JwtSettings:Issuer"];
    var audience = config["JwtSettings:Audience"];

    services.AddAuthentication(options =>
    {
        // Ép Server dùng Bearer làm mặc định cho tất cả các khâu
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.SaveToken = true; // Lưu token vào HttpContext để dễ debug
        options.RequireHttpsMetadata = false; // Tắt yêu cầu HTTPS vì đang chạy Docker local
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = issuer,
            ValidAudience = audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey!)),
            ClockSkew = TimeSpan.Zero // Quan trọng để fix lỗi lệch giờ Docker
        };
        options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"].ToString();
            var path = context.HttpContext.Request.Path;

            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs/realtime"))
            {
                context.Token = accessToken;
            }

            return Task.CompletedTask;
        },
        OnAuthenticationFailed = context =>
        {
            if (context.Exception.GetType() == typeof(SecurityTokenExpiredException))
            {
                Console.WriteLine("TOKEN_LOG: Token đã hết hạn.");
            }
            else 
            {
                Console.WriteLine("TOKEN_LOG: Lỗi xác thực: " + context.Exception.Message);
            }
            return Task.CompletedTask;
        },
        OnTokenValidated = context =>
        {
            Console.WriteLine("TOKEN_LOG: Token hợp lệ! Đã nhận diện User: " + context.Principal?.Identity?.Name);
            return Task.CompletedTask;
        }
    };
    });

    return services;
}
}

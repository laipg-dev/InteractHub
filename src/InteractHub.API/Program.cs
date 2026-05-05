using InteractHub.API.Extensions;
using InteractHub.Infrastructure.Services;
using InteractHub.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Text.Json.Serialization;
using InteractHub.API.Middleware;
using InteractHub.Core.Options;
using InteractHub.Infrastructure.Hubs;

// Dòng này cực kỳ quan trọng để giữ nguyên định dạng Claim từ Token
JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear(); 


var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact",
        policy => policy.WithOrigins("http://localhost:5173", "http://localhost:3000") // Cho phép cả 2 cổng
                        .AllowAnyMethod()
                        .AllowAnyHeader());
});
builder.Services.AddSignalR();
builder.Services.AddApplicationServices();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddDatabase(builder.Configuration);
builder.Services.AddIdentityServices();
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddAuthorization();
builder.Services.AddHealthChecks();
builder.Services.AddControllers()
    .ConfigureCustomApiBehavior()
    .AddJsonOptions(options =>
    {
        // Quan trọng: Giúp chuyển đổi giữa String và Enum khi gọi API
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(allowIntegerValues: false));
    });
// Đăng ký cấu hình AzureBlob từ appsettings.json
builder.Services.Configure<AzureBlobOptions>(
    builder.Configuration.GetSection("AzureBlob")
);
var app = builder.Build();

// Migrate database
// Migrate database
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    // Thay vì dùng các lệnh tạo DB, chỉ dùng MigrateAsync là đủ
    await dbContext.Database.MigrateAsync(); 
}
// Seed data
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    await DataSeeder.SeedRolesAsync(services);
}

app.UseMiddleware<ExceptionMiddleware>();
app.UseCors("AllowReact");

    app.UseSwagger();
    app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "InteractHub API V1");
    c.RoutePrefix = "swagger"; // Để vào thẳng bằng http://localhost:5001 mà không cần gõ /swagger
});


//app.UseHttpsRedirection();
app.UseAuthentication();
app.MapHealthChecks("/health");
app.UseAuthorization();
app.MapControllers();
app.MapGet("/", () => "Backend is running!");
app.MapHub<AppRealtimeHub>("/hubs/realtime");
app.Run();

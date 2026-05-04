using InteractHub.Core.Interfaces;
using InteractHub.Core.Interfaces.Services;
using InteractHub.Infrastructure.Services;

namespace InteractHub.API.Extensions;
    
public static class ApplicationServiceExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IPostService, PostService>();
        // Sau này có thêm ICommentService, IStoryService thì Duy thêm vào đây
        // services.AddScoped<ICommentService, CommentService>();
        services.AddScoped<IFriendService, FriendService>();
        services.AddScoped<IStoryService, StoryService>();
        services.AddScoped<IAzureBlobService, AzureBlobService>();
        services.AddScoped<IPostReportService, PostReportService>();
        services.AddScoped<IAdminReportService, AdminReportService>();
        services.AddScoped<IAdminModerationService, AdminModerationService>();
        services.AddScoped<IAdminUserService, AdminUserService>();
        services.AddScoped<IAdminPostService, AdminPostService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IAppRealtimeDispatcher, AppRealtimeDispatcher>();
        services.AddScoped<IAdminStoryService, AdminStoryService>();
        return services;
    }
}

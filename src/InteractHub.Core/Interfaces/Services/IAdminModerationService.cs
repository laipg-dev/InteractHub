using InteractHub.Core.DTOs;

namespace InteractHub.Core.Interfaces;

public interface IAdminModerationService
{
    Task<bool> ReviewPostReportAsync(int reportId, ReviewPostReportRequest request, string adminUserId);
    Task<bool> DeactivateUserAsync(string targetUserId, string? adminNote = null);
    Task<bool> RemovePostAsync(int postId, string? adminNote = null);
    Task<bool> RemoveCommentAsync(int commentId, string? adminNote = null);
}

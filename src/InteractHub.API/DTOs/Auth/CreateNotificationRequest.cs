using System.ComponentModel.DataAnnotations;
using InteractHub.Core.Entities;
namespace InteractHub.API.DTOs.Auth;

public class CreateNotificationRequest
{
    [Required]
    public string ReceiverId { get; set; } = string.Empty;

    [Required]
    public NotificationType? Type { get; set; }

    public string? Message { get; set; }
    public int? PostId { get; set; }
    public int? CommentId { get; set; }
    public int? StoryId { get; set; }
}

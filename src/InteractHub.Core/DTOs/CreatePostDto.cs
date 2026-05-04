using System.ComponentModel.DataAnnotations;
namespace InteractHub.Core.DTOs;
public class CreatePostDto
{
    [Required]
    public string Content { get; set; }
    public string? ImageUrl { get; set; }

    public List<string> Hashtags { get; set; } = new List<string>();
}
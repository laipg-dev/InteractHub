using InteractHub.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InteractHub.Infrastructure.Services;

internal static class PostVisibilityHelper
{
    public static async Task SetPostRemovedStateAsync(ApplicationDbContext context, int postId, bool removed)
    {
        var now = DateTime.UtcNow;

        var post = await context.Posts
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Id == postId);

        if (post == null) return;

        post.IsDeleted = removed;
        post.DeletedAt = removed ? now : null;

        var comments = await context.Comments
            .IgnoreQueryFilters()
            .Where(c => c.PostId == postId)
            .ToListAsync();
        foreach (var comment in comments)
        {
            comment.IsDeleted = removed;
            comment.DeletedAt = removed ? now : null;
        }

        var likes = await context.Likes
            .IgnoreQueryFilters()
            .Where(l => l.PostId == postId)
            .ToListAsync();
        foreach (var like in likes)
        {
            like.IsDeleted = removed;
            like.DeletedAt = removed ? now : null;
        }
    }
}


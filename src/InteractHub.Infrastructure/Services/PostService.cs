using InteractHub.Core.DTOs;
using InteractHub.Core.Entities;
using InteractHub.Core.Interfaces;
using InteractHub.Core.Interfaces.Services;
using InteractHub.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace InteractHub.Infrastructure.Services;

public class PostService : IPostService
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IFriendService _friendService;
    private readonly INotificationService _notificationService;
    private readonly IAppRealtimeDispatcher _appRealtimeDispatcher;

    public PostService(
        ApplicationDbContext context,
        UserManager<ApplicationUser> userManager,
        IFriendService friendService,
        INotificationService notificationService,
        IAppRealtimeDispatcher appRealtimeDispatcher)
    {
        _context = context;
        _userManager = userManager;
        _friendService = friendService;
        _notificationService = notificationService;
        _appRealtimeDispatcher = appRealtimeDispatcher;
    }

    public async Task<IEnumerable<PostResponseDto>> GetAllPostsAsync()
    {
        return await _context.Posts
            .Include(p => p.User)
            .Include(p => p.Hashtags)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new PostResponseDto
            {
                Id = p.Id,
                Content = p.Content,
                ImageUrl = p.ImageUrl,
                CreatedAt = p.CreatedAt,
                UserName = p.User.UserName ?? "Unknown",
                UserId = p.UserId,
                AvatarUrl = p.User.AvatarUrl,
                UserFullName = p.User.FullName,
                LikeCount = p.Likes.Count(),
                CommentCount = p.Comments.Count(),
                Hashtags = p.Hashtags.Select(h => h.Name).ToList()
            })
            .ToListAsync();
    }

    public async Task<PostResponseDto?> GetPostByIdAsync(int postId, string currentUserId)
    {
        var post = await _context.Posts
            .Where(p => p.Id == postId && !p.IsDeleted)
            .Include(p => p.User)
            .Include(p => p.Likes)
            .Include(p => p.Comments)
            .Include(p => p.Hashtags)
            .FirstOrDefaultAsync();

        if (post == null) return null;

        return new PostResponseDto
        {
            Id = post.Id,
            Content = post.Content,
            ImageUrl = post.ImageUrl,
            CreatedAt = post.CreatedAt,
            UserName = post.User.UserName ?? "Unknown",
            UserId = post.UserId,
            AvatarUrl = post.User.AvatarUrl,
            UserFullName = post.User.FullName,
            LikeCount = post.Likes.Count(l => !l.IsDeleted),
            CommentCount = post.Comments.Count(c => !c.IsDeleted),
            Hashtags = post.Hashtags.Select(h => h.Name).ToList(),
            IsLiked = post.Likes.Any(l => l.UserId == currentUserId && !l.IsDeleted)
        };
    }

    public async Task<PostResponseDto> CreatePostAsync(string userId, CreatePostDto createPostDto)
    {
        var post = new Post
        {
            Content = createPostDto.Content,
            ImageUrl = createPostDto.ImageUrl,
            UserId = userId,
            CreatedAt = DateTime.UtcNow,
            Hashtags = new List<Hashtag>()
        };

        if (createPostDto.Hashtags != null && createPostDto.Hashtags.Any())
        {
            foreach (var tagName in createPostDto.Hashtags)
            {
                var normalizedTag = tagName.Trim().ToLower().Replace("#", "");
                if (string.IsNullOrEmpty(normalizedTag)) continue;

                var existingTag = await _context.Hashtags
                    .FirstOrDefaultAsync(h => h.Name == normalizedTag);

                if (existingTag != null)
                {
                    post.Hashtags.Add(existingTag);
                }
                else
                {
                    post.Hashtags.Add(new Hashtag { Name = normalizedTag });
                }
            }
        }

        _context.Posts.Add(post);
        await _context.SaveChangesAsync();

        var user = await _context.Users.FindAsync(userId);
        var friends = await _friendService.GetAcceptedFriendsAsync(userId);
        var friendIds = friends
            .Select(f => f.UserId)
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct()
            .ToList();

        foreach (var friendId in friendIds)
        {
            await _notificationService.CreateNotificationAsync(
                friendId,
                userId,
                NotificationType.NewPost,
                postId: post.Id);
        }

        await _appRealtimeDispatcher.PushPostCreatedAsync(friendIds, userId, post.Id);

        return new PostResponseDto
        {
            Id = post.Id,
            Content = post.Content,
            ImageUrl = post.ImageUrl,
            CreatedAt = post.CreatedAt,
            UserId = post.UserId,
            UserName = user?.UserName ?? "Unknown",
            UserFullName = user?.FullName ?? "Unknown",
            AvatarUrl = user?.AvatarUrl,
            Hashtags = post.Hashtags.Select(h => h.Name).ToList()
        };
    }

    public async Task<bool> DeletePostAsync(int postId, string userId)
    {
        var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == postId);
        if (post == null || post.UserId != userId)
        {
            return false;
        }

        post.IsDeleted = true;
        post.DeletedAt = DateTime.UtcNow;

        _context.Posts.Update(post);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<LikeResponseDto> ToggleLikeAsync(int postId, string userId)
    {
        var existingLike = await _context.Likes
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(l => l.PostId == postId && l.UserId == userId);

        bool isCurrentlyLiked;

        if (existingLike != null)
        {
            existingLike.IsDeleted = !existingLike.IsDeleted;
            existingLike.DeletedAt = existingLike.IsDeleted ? DateTime.UtcNow : null;
            isCurrentlyLiked = !existingLike.IsDeleted;
        }
        else
        {
            _context.Likes.Add(new Like { PostId = postId, UserId = userId });
            isCurrentlyLiked = true;
        }

        await _context.SaveChangesAsync();

        var postOwnerId = await _context.Posts
            .Where(p => p.Id == postId)
            .Select(p => p.UserId)
            .FirstOrDefaultAsync();

        if (isCurrentlyLiked && !string.IsNullOrEmpty(postOwnerId))
        {
            await _notificationService.CreateNotificationAsync(
                postOwnerId,
                userId,
                NotificationType.PostLiked,
                postId: postId);
        }

        var likeCount = await _context.Likes.CountAsync(l => l.PostId == postId && !l.IsDeleted);
        var commentCount = await _context.Comments.CountAsync(c => c.PostId == postId && !c.IsDeleted);

        if (!string.IsNullOrEmpty(postOwnerId))
        {
            await _appRealtimeDispatcher.PushPostInteractionAsync(
                postOwnerId,
                isCurrentlyLiked ? "liked" : "unliked",
                postId,
                likeCount,
                commentCount,
                actorUserId: userId);
        }

        return new LikeResponseDto
        {
            IsLiked = isCurrentlyLiked,
            LikeCount = likeCount
        };
    }

    public async Task<CommentResponseDto?> AddCommentAsync(int postId, string userId, string content)
    {
        var postExists = await _context.Posts.AnyAsync(p => p.Id == postId);
        if (!postExists) return null;

        var comment = new Comment
        {
            PostId = postId,
            UserId = userId,
            Content = content
        };

        _context.Comments.Add(comment);
        await _context.SaveChangesAsync();

        var user = await _userManager.FindByIdAsync(userId);
        var postOwnerId = await _context.Posts
            .Where(p => p.Id == postId)
            .Select(p => p.UserId)
            .FirstOrDefaultAsync();

        var likeCount = await _context.Likes.CountAsync(l => l.PostId == postId && !l.IsDeleted);
        var commentCount = await _context.Comments.CountAsync(c => c.PostId == postId && !c.IsDeleted);

        if (!string.IsNullOrEmpty(postOwnerId))
        {
            await _notificationService.CreateNotificationAsync(
                postOwnerId,
                userId,
                NotificationType.PostCommented,
                postId: postId,
                commentId: comment.Id);

            await _appRealtimeDispatcher.PushPostInteractionAsync(
                postOwnerId,
                "comment_added",
                postId,
                likeCount,
                commentCount,
                comment.Id,
                userId);
        }

        return new CommentResponseDto
        {
            Id = comment.Id,
            Content = comment.Content,
            UserFullName = user?.FullName ?? "Ẩn danh",
            UserId = user?.Id ?? string.Empty,
            CreatedAt = comment.CreatedAt
        };
    }

    public async Task<bool> DeleteCommentAsync(int commentId, string userId)
    {
        var comment = await _context.Comments.FirstOrDefaultAsync(c => c.Id == commentId);
        if (comment == null)
        {
            return false;
        }

        var post = await _context.Posts.FindAsync(comment.PostId);

        if (comment.UserId == userId || post?.UserId == userId)
        {
            comment.IsDeleted = true;
            comment.DeletedAt = DateTime.UtcNow;

            _context.Comments.Update(comment);
            await _context.SaveChangesAsync();

            if (!string.IsNullOrEmpty(post?.UserId))
            {
                var likeCount = await _context.Likes.CountAsync(l => l.PostId == comment.PostId && !l.IsDeleted);
                var commentCount = await _context.Comments.CountAsync(c => c.PostId == comment.PostId && !c.IsDeleted);

                await _appRealtimeDispatcher.PushPostInteractionAsync(
                    post.UserId,
                    "comment_deleted",
                    comment.PostId,
                    likeCount,
                    commentCount,
                    commentId,
                    userId);
            }

            return true;
        }

        return false;
    }

    public async Task<IEnumerable<CommentResponseDto>?> GetCommentsByPostIdAsync(int postId)
    {
        var postExists = await _context.Posts.AnyAsync(p => p.Id == postId);
        if (!postExists) return null;

        return await _context.Comments
            .Where(c => c.PostId == postId && !c.IsDeleted)
            .Include(c => c.User)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new CommentResponseDto
            {
                Id = c.Id,
                Content = c.Content,
                AvatarUrl = c.User.AvatarUrl,
                UserFullName = c.User.FullName ?? "Người dùng",
                UserId = c.UserId,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<SearchResultDto> GlobalSearchAsync(string query, string currentUserId, int? priorityPostId = null)
    {
        var searchTerm = query.ToLower().Trim();
        var isHashtagSearch = searchTerm.StartsWith("#");
        var cleanTag = isHashtagSearch ? searchTerm.Substring(1) : searchTerm;

        var result = new SearchResultDto();
        var adminUserIds = await (
            from ur in _context.UserRoles
            join r in _context.Roles on ur.RoleId equals r.Id
            where r.Name == "Admin"
            select ur.UserId
        ).ToListAsync();
        result.Users = await _context.Users
            .Where(u =>
                !adminUserIds.Contains(u.Id) &&
                u.FullName != null &&
                u.FullName.ToLower().Contains(cleanTag)
            )
            .Select(u => new UserSearchDto
            {
                Id = u.Id,
                FullName = u.FullName,
                UserName = u.UserName,
                AvatarUrl = u.AvatarUrl
            })
            .Take(5)
            .ToListAsync();

        var postsQuery = _context.Posts
            .Where(p => !p.IsDeleted &&
                       (p.Content.ToLower().Contains(cleanTag) ||
                        p.Hashtags.Any(h => h.Name.ToLower().Contains(cleanTag)) ||
                        p.Id == priorityPostId))
            .Include(p => p.User)
            .Include(p => p.Likes)
            .Include(p => p.Comments)
            .Include(p => p.Hashtags);

        result.Posts = await postsQuery
            .OrderByDescending(p => priorityPostId.HasValue && p.Id == priorityPostId.Value)
            .ThenByDescending(p => isHashtagSearch && p.Hashtags.Any(h => h.Name.ToLower() == cleanTag))
            .ThenByDescending(p => p.CreatedAt)
            .Select(p => new PostSearchDto {
                Id = p.Id,
                Content = p.Content,
                AuthorName = p.User.FullName,
                AuthorAvatarUrl = p.User.AvatarUrl,
                UserId = p.UserId,
                CreatedAt = p.CreatedAt,
                ImageUrl = p.ImageUrl,
                LikeCount = p.Likes.Count(l => !l.IsDeleted),
                CommentCount = p.Comments.Count(c => !c.IsDeleted),
                IsLiked = p.Likes.Any(l => l.UserId == currentUserId && !l.IsDeleted),
                Hashtags = p.Hashtags.Select(h => h.Name).ToList()
            })
            .Take(20)
            .ToListAsync();

        result.Hashtags = await _context.Hashtags
            .Where(h => h.Name.ToLower().Contains(cleanTag))
            .Select(h => h.Name)
            .Take(5).ToListAsync();

        return result;
    }

    public async Task<UserProfileDto> GetUserProfileAsync(string userId, string currentUserId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return null!;

        var posts = await _context.Posts
            .Where(p => p.UserId == userId && !p.IsDeleted)
            .Include(p => p.User)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new PostResponseDto {
                Id = p.Id,
                Content = p.Content,
                ImageUrl = p.ImageUrl,
                CreatedAt = p.CreatedAt,
                UserId = p.UserId,
                UserName = p.User.UserName!,
                UserFullName = p.User.FullName,
                LikeCount = p.Likes.Count(l => !l.IsDeleted),
                CommentCount = p.Comments.Count(c => !c.IsDeleted),
                IsLiked = p.Likes.Any(l => l.UserId == currentUserId && !l.IsDeleted),
                Hashtags = p.Hashtags.Select(h => h.Name).ToList()
            })
            .ToListAsync();

        var status = await _friendService.GetFriendStatusAsync(currentUserId, userId);
        return new UserProfileDto {
            Id = user.Id,
            UserName = user.UserName!,
            FullName = user.FullName,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            Bio = user.Bio,
            AvatarUrl = user.AvatarUrl,
            FriendStatus = status,
            JoinedAt = DateTime.Now,
            PostCount = posts.Count,
            Posts = posts
        };
    }

    public async Task<IEnumerable<string>> GetTopTrendingHashtagsAsync(int count = 10)
    {
        var oneWeekAgo = DateTime.UtcNow.AddDays(-7);

        return await _context.Hashtags
            .Where(h => h.Posts.Any(p => p.CreatedAt >= oneWeekAgo && !p.IsDeleted))
            .Select(h => new
            {
                Name = h.Name,
                UsageCount = h.Posts.Count(p => p.CreatedAt >= oneWeekAgo && !p.IsDeleted)
            })
            .OrderByDescending(h => h.UsageCount)
            .Take(count)
            .Select(h => h.Name)
            .ToListAsync();
    }

    public async Task<IEnumerable<PostResponseDto>> GetPostsByUserIdAsync(string userId)
    {
        return await _context.Posts
            .Where(p => p.UserId == userId && !p.IsDeleted)
            .Include(p => p.User)
            .Include(p => p.Hashtags)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new PostResponseDto
            {
                Id = p.Id,
                Content = p.Content,
                ImageUrl = p.ImageUrl,
                CreatedAt = p.CreatedAt,
                UserName = p.User.UserName ?? "Unknown",
                UserId = p.UserId,
                UserFullName = p.User.FullName,
                LikeCount = p.Likes.Count(),
                CommentCount = p.Comments.Count(),
                Hashtags = p.Hashtags.Select(h => h.Name).ToList()
            })
            .ToListAsync();
    }
}

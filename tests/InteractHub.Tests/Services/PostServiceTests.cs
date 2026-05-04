using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using InteractHub.Core.DTOs;
using InteractHub.Core.Entities;
using InteractHub.Core.Interfaces;
using InteractHub.Core.Interfaces.Services;
using InteractHub.Infrastructure.Data;
using InteractHub.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace InteractHub.Tests.Services
{
    public class PostServiceTests
    {
        private static ApplicationDbContext CreateDbContext(string dbName)
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(dbName)
                .Options;

            return new ApplicationDbContext(options);
        }

        private static Mock<UserManager<ApplicationUser>> CreateUserManagerMock()
        {
            var store = new Mock<IUserStore<ApplicationUser>>();
            return new Mock<UserManager<ApplicationUser>>(
                store.Object, null!, null!, null!, null!, null!, null!, null!, null!);
        }

        private static PostService CreateService(
            ApplicationDbContext context,
            Mock<UserManager<ApplicationUser>>? userManagerMock = null,
            Mock<IFriendService>? friendServiceMock = null,
            Mock<INotificationService>? notificationServiceMock = null,
            Mock<IAppRealtimeDispatcher>? realtimeDispatcherMock = null)
        {
            userManagerMock ??= CreateUserManagerMock();
            friendServiceMock ??= new Mock<IFriendService>();
            notificationServiceMock ??= new Mock<INotificationService>();
            realtimeDispatcherMock ??= new Mock<IAppRealtimeDispatcher>();

            return new PostService(
                context,
                userManagerMock.Object,
                friendServiceMock.Object,
                notificationServiceMock.Object,
                realtimeDispatcherMock.Object);
        }

        private static void SetupAcceptedFriends(
            Mock<IFriendService> friendServiceMock,
            string userId,
            List<FriendDto>? friends = null)
        {
            friends ??= new List<FriendDto>();

            friendServiceMock
                .Setup(x => x.GetAcceptedFriendsAsync(userId))
                .ReturnsAsync(friends);
        }

        [Fact]
        public async Task GetPostByIdAsync_ShouldReturnNull_WhenPostDoesNotExist()
        {
            using var context = CreateDbContext(nameof(GetPostByIdAsync_ShouldReturnNull_WhenPostDoesNotExist));
            var service = CreateService(context);

            var result = await service.GetPostByIdAsync(999, "user-1");

            Assert.Null(result);
        }

        [Fact]
        public async Task GetPostByIdAsync_ShouldReturnNull_WhenPostIsDeleted()
        {
            using var context = CreateDbContext(nameof(GetPostByIdAsync_ShouldReturnNull_WhenPostIsDeleted));

            context.Users.Add(new ApplicationUser
            {
                Id = "user-1",
                UserName = "alice",
                FullName = "Alice"
            });

            context.Posts.Add(new Post
            {
                Id = 1,
                UserId = "user-1",
                Content = "deleted",
                CreatedAt = DateTime.UtcNow,
                IsDeleted = true
            });

            await context.SaveChangesAsync();

            var service = CreateService(context);

            var result = await service.GetPostByIdAsync(1, "user-1");

            Assert.Null(result);
        }

        [Fact]
        public async Task GetPostByIdAsync_ShouldMapBasicFields_WhenPostExists()
        {
            using var context = CreateDbContext(nameof(GetPostByIdAsync_ShouldMapBasicFields_WhenPostExists));
            var createdAt = DateTime.UtcNow;

            context.Users.Add(new ApplicationUser
            {
                Id = "user-1",
                UserName = "alice",
                FullName = "Alice Doe",
                AvatarUrl = "avatar.png"
            });

            context.Posts.Add(new Post
            {
                Id = 1,
                UserId = "user-1",
                Content = "hello world",
                ImageUrl = "img.png",
                CreatedAt = createdAt,
                IsDeleted = false
            });

            await context.SaveChangesAsync();

            var service = CreateService(context);

            var result = await service.GetPostByIdAsync(1, "other-user");

            Assert.NotNull(result);
            Assert.Equal(1, result!.Id);
            Assert.Equal("hello world", result.Content);
            Assert.Equal("img.png", result.ImageUrl);
            Assert.Equal("user-1", result.UserId);
            Assert.Equal("alice", result.UserName);
            Assert.Equal("Alice Doe", result.UserFullName);
            Assert.Equal("avatar.png", result.AvatarUrl);
        }

        [Fact]
        public async Task GetPostByIdAsync_ShouldCountOnlyNonDeletedLikesAndComments()
        {
            using var context = CreateDbContext(nameof(GetPostByIdAsync_ShouldCountOnlyNonDeletedLikesAndComments));

            context.Users.AddRange(
                new ApplicationUser { Id = "owner", UserName = "owner", FullName = "Owner" },
                new ApplicationUser { Id = "user-a", UserName = "ua", FullName = "User A" },
                new ApplicationUser { Id = "user-b", UserName = "ub", FullName = "User B" });

            context.Posts.Add(new Post
            {
                Id = 1,
                UserId = "owner",
                Content = "post",
                CreatedAt = DateTime.UtcNow,
                IsDeleted = false
            });

            context.Likes.AddRange(
                new Like { PostId = 1, UserId = "user-a", IsDeleted = false },
                new Like { PostId = 1, UserId = "user-b", IsDeleted = true });

            context.Comments.AddRange(
                new Comment { Id = 1, PostId = 1, UserId = "user-a", Content = "c1", IsDeleted = false, CreatedAt = DateTime.UtcNow },
                new Comment { Id = 2, PostId = 1, UserId = "user-b", Content = "c2", IsDeleted = true, CreatedAt = DateTime.UtcNow });

            await context.SaveChangesAsync();

            var service = CreateService(context);

            var result = await service.GetPostByIdAsync(1, "user-a");

            Assert.NotNull(result);
            Assert.Equal(1, result!.LikeCount);
            Assert.Equal(1, result.CommentCount);
            Assert.True(result.IsLiked);
        }

        [Fact]
        public async Task GetPostByIdAsync_ShouldMapHashtags_WhenPostHasHashtags()
        {
            using var context = CreateDbContext(nameof(GetPostByIdAsync_ShouldMapHashtags_WhenPostHasHashtags));

            var tag1 = new Hashtag { Id = 1, Name = "dotnet" };
            var tag2 = new Hashtag { Id = 2, Name = "xunit" };

            context.Users.Add(new ApplicationUser
            {
                Id = "user-1",
                UserName = "alice",
                FullName = "Alice"
            });

            context.Posts.Add(new Post
            {
                Id = 1,
                UserId = "user-1",
                Content = "post",
                CreatedAt = DateTime.UtcNow,
                IsDeleted = false,
                Hashtags = new List<Hashtag> { tag1, tag2 }
            });

            await context.SaveChangesAsync();

            var service = CreateService(context);

            var result = await service.GetPostByIdAsync(1, "user-x");

            Assert.NotNull(result);
            Assert.Equal(2, result!.Hashtags.Count);
            Assert.Contains("dotnet", result.Hashtags);
            Assert.Contains("xunit", result.Hashtags);
        }

        [Fact]
        public async Task CreatePostAsync_ShouldCreatePostWithoutHashtags_WhenHashtagsAreNull()
        {
            using var context = CreateDbContext(nameof(CreatePostAsync_ShouldCreatePostWithoutHashtags_WhenHashtagsAreNull));

            context.Users.Add(new ApplicationUser
            {
                Id = "user-1",
                UserName = "alice",
                FullName = "Alice"
            });

            await context.SaveChangesAsync();

            var friendServiceMock = new Mock<IFriendService>();
            SetupAcceptedFriends(friendServiceMock, "user-1", new List<FriendDto>());

            var notificationServiceMock = new Mock<INotificationService>();
            var realtimeDispatcherMock = new Mock<IAppRealtimeDispatcher>();

            var service = CreateService(
                context,
                friendServiceMock: friendServiceMock,
                notificationServiceMock: notificationServiceMock,
                realtimeDispatcherMock: realtimeDispatcherMock);

            var dto = new CreatePostDto
            {
                Content = "new post",
                ImageUrl = "img.png",
                Hashtags = new List<string>()
            };

            var result = await service.CreatePostAsync("user-1", dto);

            Assert.NotNull(result);
            Assert.Equal("new post", result.Content);
            Assert.Equal("img.png", result.ImageUrl);
            Assert.Equal("user-1", result.UserId);
            Assert.Empty(result.Hashtags);
            Assert.Single(context.Posts);
        }

        [Fact]
        public async Task CreatePostAsync_ShouldNormalizeHashtags_WhenHashtagsContainSpacesAndHashes()
        {
            using var context = CreateDbContext(nameof(CreatePostAsync_ShouldNormalizeHashtags_WhenHashtagsContainSpacesAndHashes));

            context.Users.Add(new ApplicationUser
            {
                Id = "user-1",
                UserName = "alice",
                FullName = "Alice"
            });

            await context.SaveChangesAsync();

            var friendServiceMock = new Mock<IFriendService>();
            SetupAcceptedFriends(friendServiceMock, "user-1", new List<FriendDto>());

            var service = CreateService(context, friendServiceMock: friendServiceMock);

            var dto = new CreatePostDto
            {
                Content = "post",
                Hashtags = new List<string> { "  #DotNet ", " #XUNIT " }
            };

            var result = await service.CreatePostAsync("user-1", dto);

            Assert.Contains("dotnet", result.Hashtags);
            Assert.Contains("xunit", result.Hashtags);
        }

        [Fact]
        public async Task CreatePostAsync_ShouldReuseExistingHashtag_WhenHashtagAlreadyExists()
        {
            using var context = CreateDbContext(nameof(CreatePostAsync_ShouldReuseExistingHashtag_WhenHashtagAlreadyExists));

            context.Users.Add(new ApplicationUser
            {
                Id = "user-1",
                UserName = "alice",
                FullName = "Alice"
            });

            context.Hashtags.Add(new Hashtag { Id = 10, Name = "dotnet" });
            await context.SaveChangesAsync();

            var friendServiceMock = new Mock<IFriendService>();
            SetupAcceptedFriends(friendServiceMock, "user-1", new List<FriendDto>());

            var service = CreateService(context, friendServiceMock: friendServiceMock);

            var dto = new CreatePostDto
            {
                Content = "post",
                Hashtags = new List<string> { "#dotnet" }
            };

            var result = await service.CreatePostAsync("user-1", dto);

            Assert.Single(context.Hashtags);
            Assert.Single(result.Hashtags);
            Assert.Equal("dotnet", result.Hashtags[0]);
        }

        [Fact]
        public async Task CreatePostAsync_ShouldIgnoreEmptyNormalizedHashtags()
        {
            using var context = CreateDbContext(nameof(CreatePostAsync_ShouldIgnoreEmptyNormalizedHashtags));

            context.Users.Add(new ApplicationUser
            {
                Id = "user-1",
                UserName = "alice",
                FullName = "Alice"
            });

            await context.SaveChangesAsync();

            var friendServiceMock = new Mock<IFriendService>();
            SetupAcceptedFriends(friendServiceMock, "user-1", new List<FriendDto>());

            var service = CreateService(context, friendServiceMock: friendServiceMock);

            var dto = new CreatePostDto
            {
                Content = "post",
                Hashtags = new List<string> { "#", "   ", "##" }
            };

            var result = await service.CreatePostAsync("user-1", dto);

            Assert.Empty(result.Hashtags);
            Assert.Empty(context.Hashtags);
        }

        [Fact]
        public async Task CreatePostAsync_ShouldCreateNotificationsAndRealtimePush_ForDistinctFriends()
        {
            using var context = CreateDbContext(nameof(CreatePostAsync_ShouldCreateNotificationsAndRealtimePush_ForDistinctFriends));

            context.Users.Add(new ApplicationUser
            {
                Id = "user-1",
                UserName = "alice",
                FullName = "Alice"
            });

            await context.SaveChangesAsync();

            var friendServiceMock = new Mock<IFriendService>();
            SetupAcceptedFriends(friendServiceMock, "user-1", new List<FriendDto>
            {
                new FriendDto { UserId = "friend-1", FullName = "Friend 1", AvatarUrl = "a1.png" },
                new FriendDto { UserId = "friend-2", FullName = "Friend 2", AvatarUrl = "a2.png" },
                new FriendDto { UserId = "friend-2", FullName = "Friend 2", AvatarUrl = "a2.png" },
                new FriendDto { UserId = "", FullName = "Invalid", AvatarUrl = "" }
            });

            var notificationServiceMock = new Mock<INotificationService>();
            var realtimeDispatcherMock = new Mock<IAppRealtimeDispatcher>();

            var service = CreateService(
                context,
                friendServiceMock: friendServiceMock,
                notificationServiceMock: notificationServiceMock,
                realtimeDispatcherMock: realtimeDispatcherMock);

            await service.CreatePostAsync("user-1", new CreatePostDto { Content = "post" });

            notificationServiceMock.Verify(
                x => x.CreateNotificationAsync(
                    "friend-1",
                    "user-1",
                    NotificationType.NewPost,
                    null,
                    It.IsAny<int?>(),
                    null,
                    null),
                Times.Once);

            notificationServiceMock.Verify(
                x => x.CreateNotificationAsync(
                    "friend-2",
                    "user-1",
                    NotificationType.NewPost,
                    null,
                    It.IsAny<int?>(),
                    null,
                    null),
                Times.Once);

            realtimeDispatcherMock.Verify(
                x => x.PushPostCreatedAsync(
                    It.Is<List<string>>(ids => ids.Count == 2 && ids.Contains("friend-1") && ids.Contains("friend-2")),
                    "user-1",
                    It.IsAny<int>()),
                Times.Once);
        }

        [Fact]
        public async Task DeletePostAsync_ShouldReturnFalse_WhenPostDoesNotExist()
        {
            using var context = CreateDbContext(nameof(DeletePostAsync_ShouldReturnFalse_WhenPostDoesNotExist));
            var service = CreateService(context);

            var result = await service.DeletePostAsync(999, "user-1");

            Assert.False(result);
        }

        [Fact]
        public async Task DeletePostAsync_ShouldReturnFalse_WhenUserIsNotOwner()
        {
            using var context = CreateDbContext(nameof(DeletePostAsync_ShouldReturnFalse_WhenUserIsNotOwner));

            context.Posts.Add(new Post
            {
                Id = 1,
                UserId = "owner",
                Content = "post",
                CreatedAt = DateTime.UtcNow
            });

            await context.SaveChangesAsync();

            var service = CreateService(context);

            var result = await service.DeletePostAsync(1, "other-user");

            Assert.False(result);

            var post = await context.Posts.FirstAsync();
            Assert.False(post.IsDeleted);
            Assert.Null(post.DeletedAt);
        }

        [Fact]
        public async Task DeletePostAsync_ShouldSoftDeletePost_WhenUserIsOwner()
        {
            using var context = CreateDbContext(nameof(DeletePostAsync_ShouldSoftDeletePost_WhenUserIsOwner));

            context.Posts.Add(new Post
            {
                Id = 1,
                UserId = "owner",
                Content = "post",
                CreatedAt = DateTime.UtcNow
            });

            await context.SaveChangesAsync();

            var service = CreateService(context);

            var result = await service.DeletePostAsync(1, "owner");

            Assert.True(result);

            var post = await context.Posts.IgnoreQueryFilters().FirstAsync();
            Assert.True(post.IsDeleted);
            Assert.NotNull(post.DeletedAt);
        }

        [Fact]
        public async Task ToggleLikeAsync_ShouldCreateLike_WhenUserHasNotLikedBefore()
        {
            using var context = CreateDbContext(nameof(ToggleLikeAsync_ShouldCreateLike_WhenUserHasNotLikedBefore));

            context.Posts.Add(new Post
            {
                Id = 1,
                UserId = "owner",
                Content = "post",
                CreatedAt = DateTime.UtcNow,
                IsDeleted = false
            });

            await context.SaveChangesAsync();

            var service = CreateService(context);

            var result = await service.ToggleLikeAsync(1, "user-1");

            Assert.True(result.IsLiked);
            Assert.Equal(1, result.LikeCount);
            Assert.Single(context.Likes);
            Assert.False(context.Likes.First().IsDeleted);
        }

        [Fact]
        public async Task ToggleLikeAsync_ShouldSoftDeleteLike_WhenActiveLikeAlreadyExists()
        {
            using var context = CreateDbContext(nameof(ToggleLikeAsync_ShouldSoftDeleteLike_WhenActiveLikeAlreadyExists));

            context.Posts.Add(new Post
            {
                Id = 1,
                UserId = "owner",
                Content = "post",
                CreatedAt = DateTime.UtcNow,
                IsDeleted = false
            });

            context.Likes.Add(new Like
            {
                PostId = 1,
                UserId = "user-1",
                IsDeleted = false
            });

            await context.SaveChangesAsync();

            var service = CreateService(context);

            var result = await service.ToggleLikeAsync(1, "user-1");

            Assert.False(result.IsLiked);
            Assert.Equal(0, result.LikeCount);

            var like = await context.Likes.IgnoreQueryFilters().FirstAsync();
            Assert.True(like.IsDeleted);
            Assert.NotNull(like.DeletedAt);
        }

        [Fact]
        public async Task ToggleLikeAsync_ShouldRestoreLike_WhenSoftDeletedLikeExists()
        {
            using var context = CreateDbContext(nameof(ToggleLikeAsync_ShouldRestoreLike_WhenSoftDeletedLikeExists));

            context.Posts.Add(new Post
            {
                Id = 1,
                UserId = "owner",
                Content = "post",
                CreatedAt = DateTime.UtcNow,
                IsDeleted = false
            });

            context.Likes.Add(new Like
            {
                PostId = 1,
                UserId = "user-1",
                IsDeleted = true,
                DeletedAt = DateTime.UtcNow
            });

            await context.SaveChangesAsync();

            var service = CreateService(context);

            var result = await service.ToggleLikeAsync(1, "user-1");

            Assert.True(result.IsLiked);
            Assert.Equal(1, result.LikeCount);

            var like = await context.Likes.IgnoreQueryFilters().FirstAsync();
            Assert.False(like.IsDeleted);
            Assert.Null(like.DeletedAt);
        }

        [Fact]
        public async Task ToggleLikeAsync_ShouldReturnCorrectLikeCount_WhenMultipleLikesExist()
        {
            using var context = CreateDbContext(nameof(ToggleLikeAsync_ShouldReturnCorrectLikeCount_WhenMultipleLikesExist));

            context.Posts.Add(new Post
            {
                Id = 1,
                UserId = "owner",
                Content = "post",
                CreatedAt = DateTime.UtcNow,
                IsDeleted = false
            });

            context.Likes.AddRange(
                new Like { PostId = 1, UserId = "user-a", IsDeleted = false },
                new Like { PostId = 1, UserId = "user-b", IsDeleted = false },
                new Like { PostId = 1, UserId = "user-c", IsDeleted = true }
            );

            await context.SaveChangesAsync();

            var service = CreateService(context);

            var result = await service.ToggleLikeAsync(1, "user-d");

            Assert.True(result.IsLiked);
            Assert.Equal(3, result.LikeCount);
        }

        [Fact]
        public async Task AddCommentAsync_ShouldReturnNull_WhenPostDoesNotExist()
        {
            using var context = CreateDbContext(nameof(AddCommentAsync_ShouldReturnNull_WhenPostDoesNotExist));

            var userManagerMock = CreateUserManagerMock();
            var service = CreateService(context, userManagerMock: userManagerMock);

            var result = await service.AddCommentAsync(999, "user-1", "hello");

            Assert.Null(result);
            Assert.Empty(context.Comments);
        }

        [Fact]
        public async Task AddCommentAsync_ShouldCreateComment_WhenPostExists()
        {
            using var context = CreateDbContext(nameof(AddCommentAsync_ShouldCreateComment_WhenPostExists));

            context.Posts.Add(new Post
            {
                Id = 1,
                UserId = "owner",
                Content = "post",
                CreatedAt = DateTime.UtcNow,
                IsDeleted = false
            });

            await context.SaveChangesAsync();

            var userManagerMock = CreateUserManagerMock();
            userManagerMock
                .Setup(x => x.FindByIdAsync("user-1"))
                .ReturnsAsync(new ApplicationUser
                {
                    Id = "user-1",
                    FullName = "Alice",
                    UserName = "alice"
                });

            var service = CreateService(context, userManagerMock: userManagerMock);

            var result = await service.AddCommentAsync(1, "user-1", "nice post");

            Assert.NotNull(result);
            Assert.Equal("nice post", result!.Content);
            Assert.Single(context.Comments);
            Assert.Equal("nice post", context.Comments.First().Content);
        }

        [Fact]
        public async Task AddCommentAsync_ShouldMapUserInfoFromUserManager_WhenUserExists()
        {
            using var context = CreateDbContext(nameof(AddCommentAsync_ShouldMapUserInfoFromUserManager_WhenUserExists));

            context.Posts.Add(new Post
            {
                Id = 1,
                UserId = "owner",
                Content = "post",
                CreatedAt = DateTime.UtcNow,
                IsDeleted = false
            });

            await context.SaveChangesAsync();

            var userManagerMock = CreateUserManagerMock();
            userManagerMock
                .Setup(x => x.FindByIdAsync("user-1"))
                .ReturnsAsync(new ApplicationUser
                {
                    Id = "user-1",
                    FullName = "Alice Doe",
                    AvatarUrl = "avatar.png"
                });

            var service = CreateService(context, userManagerMock: userManagerMock);

            var result = await service.AddCommentAsync(1, "user-1", "comment");

            Assert.NotNull(result);
            Assert.Equal("Alice Doe", result!.UserFullName);
            Assert.Equal("user-1", result.UserId);
        }

        [Fact]
        public async Task AddCommentAsync_ShouldUseFallbackValues_WhenUserManagerReturnsNull()
        {
            using var context = CreateDbContext(nameof(AddCommentAsync_ShouldUseFallbackValues_WhenUserManagerReturnsNull));

            context.Posts.Add(new Post
            {
                Id = 1,
                UserId = "owner",
                Content = "post",
                CreatedAt = DateTime.UtcNow,
                IsDeleted = false
            });

            await context.SaveChangesAsync();

            var userManagerMock = CreateUserManagerMock();
            userManagerMock
                .Setup(x => x.FindByIdAsync("missing-user"))
                .ReturnsAsync((ApplicationUser?)null);

            var service = CreateService(context, userManagerMock: userManagerMock);

            var result = await service.AddCommentAsync(1, "missing-user", "comment");

            Assert.NotNull(result);
            Assert.Equal("Ẩn danh", result!.UserFullName);
            Assert.Equal(string.Empty, result.UserId);
        }

        [Fact]
        public async Task DeleteCommentAsync_ShouldReturnFalse_WhenCommentDoesNotExist()
        {
            using var context = CreateDbContext(nameof(DeleteCommentAsync_ShouldReturnFalse_WhenCommentDoesNotExist));
            var service = CreateService(context);

            var result = await service.DeleteCommentAsync(999, "user-1");

            Assert.False(result);
        }

        [Fact]
        public async Task DeleteCommentAsync_ShouldReturnTrue_WhenCommentOwnerDeletesComment()
        {
            using var context = CreateDbContext(nameof(DeleteCommentAsync_ShouldReturnTrue_WhenCommentOwnerDeletesComment));

            context.Posts.Add(new Post
            {
                Id = 1,
                UserId = "post-owner",
                Content = "post",
                CreatedAt = DateTime.UtcNow
            });

            context.Comments.Add(new Comment
            {
                Id = 1,
                PostId = 1,
                UserId = "comment-owner",
                Content = "comment",
                CreatedAt = DateTime.UtcNow,
                IsDeleted = false
            });

            await context.SaveChangesAsync();

            var service = CreateService(context);

            var result = await service.DeleteCommentAsync(1, "comment-owner");

            Assert.True(result);

            var comment = await context.Comments.IgnoreQueryFilters().FirstAsync();
            Assert.True(comment.IsDeleted);
            Assert.NotNull(comment.DeletedAt);
        }

        [Fact]
        public async Task DeleteCommentAsync_ShouldReturnTrue_WhenPostOwnerDeletesComment()
        {
            using var context = CreateDbContext(nameof(DeleteCommentAsync_ShouldReturnTrue_WhenPostOwnerDeletesComment));

            context.Posts.Add(new Post
            {
                Id = 1,
                UserId = "post-owner",
                Content = "post",
                CreatedAt = DateTime.UtcNow
            });

            context.Comments.Add(new Comment
            {
                Id = 1,
                PostId = 1,
                UserId = "comment-owner",
                Content = "comment",
                CreatedAt = DateTime.UtcNow,
                IsDeleted = false
            });

            await context.SaveChangesAsync();

            var service = CreateService(context);

            var result = await service.DeleteCommentAsync(1, "post-owner");

            Assert.True(result);

            var comment = await context.Comments.IgnoreQueryFilters().FirstAsync();
            Assert.True(comment.IsDeleted);
            Assert.NotNull(comment.DeletedAt);
        }

        [Fact]
        public async Task DeleteCommentAsync_ShouldReturnFalse_WhenUserHasNoPermission()
        {
            using var context = CreateDbContext(nameof(DeleteCommentAsync_ShouldReturnFalse_WhenUserHasNoPermission));

            context.Posts.Add(new Post
            {
                Id = 1,
                UserId = "post-owner",
                Content = "post",
                CreatedAt = DateTime.UtcNow
            });

            context.Comments.Add(new Comment
            {
                Id = 1,
                PostId = 1,
                UserId = "comment-owner",
                Content = "comment",
                CreatedAt = DateTime.UtcNow,
                IsDeleted = false
            });

            await context.SaveChangesAsync();

            var service = CreateService(context);

            var result = await service.DeleteCommentAsync(1, "random-user");

            Assert.False(result);

            var comment = await context.Comments.FirstAsync();
            Assert.False(comment.IsDeleted);
            Assert.Null(comment.DeletedAt);
        }

        [Fact]
        public async Task GetCommentsByPostIdAsync_ShouldReturnNull_WhenPostDoesNotExist()
        {
            using var context = CreateDbContext(nameof(GetCommentsByPostIdAsync_ShouldReturnNull_WhenPostDoesNotExist));
            var service = CreateService(context);

            var result = await service.GetCommentsByPostIdAsync(999);

            Assert.Null(result);
        }

        [Fact]
        public async Task GetCommentsByPostIdAsync_ShouldReturnOnlyNonDeletedComments_OrderedByCreatedAt()
        {
            using var context = CreateDbContext(nameof(GetCommentsByPostIdAsync_ShouldReturnOnlyNonDeletedComments_OrderedByCreatedAt));

            context.Users.AddRange(
                new ApplicationUser { Id = "u1", FullName = "User 1", AvatarUrl = "a1.png" },
                new ApplicationUser { Id = "u2", FullName = "User 2", AvatarUrl = "a2.png" });

            context.Posts.Add(new Post
            {
                Id = 1,
                UserId = "u1",
                Content = "post",
                CreatedAt = DateTime.UtcNow
            });

            context.Comments.AddRange(
                new Comment
                {
                    Id = 1,
                    PostId = 1,
                    UserId = "u1",
                    Content = "later",
                    CreatedAt = new DateTime(2024, 1, 2),
                    IsDeleted = false
                },
                new Comment
                {
                    Id = 2,
                    PostId = 1,
                    UserId = "u2",
                    Content = "earlier",
                    CreatedAt = new DateTime(2024, 1, 1),
                    IsDeleted = false
                },
                new Comment
                {
                    Id = 3,
                    PostId = 1,
                    UserId = "u2",
                    Content = "deleted",
                    CreatedAt = new DateTime(2024, 1, 3),
                    IsDeleted = true
                });

            await context.SaveChangesAsync();

            var service = CreateService(context);

            var result = (await service.GetCommentsByPostIdAsync(1))!.ToList();

            Assert.Equal(2, result.Count);
            Assert.Equal("earlier", result[0].Content);
            Assert.Equal("later", result[1].Content);
        }

        [Fact]
        public async Task GetCommentsByPostIdAsync_ShouldMapUserFieldsCorrectly()
        {
            using var context = CreateDbContext(nameof(GetCommentsByPostIdAsync_ShouldMapUserFieldsCorrectly));

            context.Users.Add(new ApplicationUser
            {
                Id = "u1",
                FullName = "Alice Doe",
                AvatarUrl = "avatar.png"
            });

            context.Posts.Add(new Post
            {
                Id = 1,
                UserId = "u1",
                Content = "post",
                CreatedAt = DateTime.UtcNow
            });

            context.Comments.Add(new Comment
            {
                Id = 1,
                PostId = 1,
                UserId = "u1",
                Content = "hello comment",
                CreatedAt = DateTime.UtcNow,
                IsDeleted = false
            });

            await context.SaveChangesAsync();

            var service = CreateService(context);

            var result = (await service.GetCommentsByPostIdAsync(1))!.Single();

            Assert.Equal(1, result.Id);
            Assert.Equal("hello comment", result.Content);
            Assert.Equal("u1", result.UserId);
            Assert.Equal("Alice Doe", result.UserFullName);
            Assert.Equal("avatar.png", result.AvatarUrl);
        }

        [Fact]
        public async Task GetAllPostsAsync_ShouldReturnEmptyList_WhenNoPostsExist()
        {
            using var context = CreateDbContext(nameof(GetAllPostsAsync_ShouldReturnEmptyList_WhenNoPostsExist));
            var service = CreateService(context);

            var result = (await service.GetAllPostsAsync()).ToList();

            Assert.NotNull(result);
            Assert.Empty(result);
        }

        [Fact]
        public async Task GetAllPostsAsync_ShouldReturnPostsOrderedByCreatedAtDescending()
        {
            using var context = CreateDbContext(nameof(GetAllPostsAsync_ShouldReturnPostsOrderedByCreatedAtDescending));

            context.Users.Add(new ApplicationUser
            {
                Id = "u1",
                UserName = "alice",
                FullName = "Alice"
            });

            context.Posts.AddRange(
                new Post
                {
                    Id = 1,
                    UserId = "u1",
                    Content = "older",
                    CreatedAt = new DateTime(2024, 1, 1)
                },
                new Post
                {
                    Id = 2,
                    UserId = "u1",
                    Content = "newer",
                    CreatedAt = new DateTime(2024, 1, 2)
                });

            await context.SaveChangesAsync();

            var service = CreateService(context);

            var result = (await service.GetAllPostsAsync()).ToList();

            Assert.Equal(2, result.Count);
            Assert.Equal("newer", result[0].Content);
            Assert.Equal("older", result[1].Content);
        }

        [Fact]
        public async Task GetAllPostsAsync_ShouldMapCountsAndHashtags()
        {
            using var context = CreateDbContext(nameof(GetAllPostsAsync_ShouldMapCountsAndHashtags));

            var tag = new Hashtag { Id = 1, Name = "dotnet" };

            context.Users.AddRange(
                new ApplicationUser { Id = "owner", UserName = "alice", FullName = "Alice", AvatarUrl = "a.png" },
                new ApplicationUser { Id = "u2", UserName = "bob", FullName = "Bob" }
            );

            context.Posts.Add(new Post
            {
                Id = 1,
                UserId = "owner",
                Content = "post",
                CreatedAt = DateTime.UtcNow,
                Hashtags = new List<Hashtag> { tag }
            });

            context.Likes.AddRange(
                new Like { PostId = 1, UserId = "u2", IsDeleted = false },
                new Like { PostId = 1, UserId = "owner", IsDeleted = true }
            );

            context.Comments.AddRange(
                new Comment { Id = 1, PostId = 1, UserId = "u2", Content = "c1", IsDeleted = false, CreatedAt = DateTime.UtcNow },
                new Comment { Id = 2, PostId = 1, UserId = "u2", Content = "c2", IsDeleted = true, CreatedAt = DateTime.UtcNow }
            );

            await context.SaveChangesAsync();

            var service = CreateService(context);

            var result = (await service.GetAllPostsAsync()).Single();

            Assert.Equal("alice", result.UserName);
            Assert.Equal("Alice", result.UserFullName);
            Assert.Equal("a.png", result.AvatarUrl);
            Assert.Equal(1, result.LikeCount);
            Assert.Equal(1, result.CommentCount);
            Assert.Contains("dotnet", result.Hashtags);
        }

        [Fact]
        public async Task GetPostsByUserIdAsync_ShouldReturnOnlyNonDeletedPostsOfThatUser()
        {
            using var context = CreateDbContext(nameof(GetPostsByUserIdAsync_ShouldReturnOnlyNonDeletedPostsOfThatUser));

            context.Users.AddRange(
                new ApplicationUser { Id = "u1", UserName = "alice", FullName = "Alice" },
                new ApplicationUser { Id = "u2", UserName = "bob", FullName = "Bob" }
            );

            context.Posts.AddRange(
                new Post
                {
                    Id = 1,
                    UserId = "u1",
                    Content = "keep",
                    CreatedAt = DateTime.UtcNow,
                    IsDeleted = false
                },
                new Post
                {
                    Id = 2,
                    UserId = "u1",
                    Content = "deleted",
                    CreatedAt = DateTime.UtcNow.AddMinutes(-1),
                    IsDeleted = true
                },
                new Post
                {
                    Id = 3,
                    UserId = "u2",
                    Content = "other user",
                    CreatedAt = DateTime.UtcNow,
                    IsDeleted = false
                });

            await context.SaveChangesAsync();

            var service = CreateService(context);

            var result = (await service.GetPostsByUserIdAsync("u1")).ToList();

            Assert.Single(result);
            Assert.Equal("keep", result[0].Content);
            Assert.Equal("u1", result[0].UserId);
        }

        [Fact]
        public async Task GetPostsByUserIdAsync_ShouldReturnPostsOrderedByCreatedAtDescending()
        {
            using var context = CreateDbContext(nameof(GetPostsByUserIdAsync_ShouldReturnPostsOrderedByCreatedAtDescending));

            context.Users.Add(new ApplicationUser { Id = "u1", UserName = "alice", FullName = "Alice" });

            context.Posts.AddRange(
                new Post
                {
                    Id = 1,
                    UserId = "u1",
                    Content = "older",
                    CreatedAt = new DateTime(2024, 1, 1),
                    IsDeleted = false
                },
                new Post
                {
                    Id = 2,
                    UserId = "u1",
                    Content = "newer",
                    CreatedAt = new DateTime(2024, 1, 2),
                    IsDeleted = false
                });

            await context.SaveChangesAsync();

            var service = CreateService(context);

            var result = (await service.GetPostsByUserIdAsync("u1")).ToList();

            Assert.Equal(2, result.Count);
            Assert.Equal("newer", result[0].Content);
            Assert.Equal("older", result[1].Content);
        }

        [Fact]
        public async Task GetTopTrendingHashtagsAsync_ShouldReturnTopHashtagsWithinLast7Days()
        {
            using var context = CreateDbContext(nameof(GetTopTrendingHashtagsAsync_ShouldReturnTopHashtagsWithinLast7Days));

            var recent1 = new Post
            {
                Id = 1,
                UserId = "u1",
                Content = "recent1",
                CreatedAt = DateTime.UtcNow.AddDays(-1),
                IsDeleted = false
            };
            var recent2 = new Post
            {
                Id = 2,
                UserId = "u1",
                Content = "recent2",
                CreatedAt = DateTime.UtcNow.AddDays(-2),
                IsDeleted = false
            };
            var oldPost = new Post
            {
                Id = 3,
                UserId = "u1",
                Content = "old",
                CreatedAt = DateTime.UtcNow.AddDays(-10),
                IsDeleted = false
            };

            var tagA = new Hashtag { Id = 1, Name = "dotnet", Posts = new List<Post> { recent1, recent2 } };
            var tagB = new Hashtag { Id = 2, Name = "xunit", Posts = new List<Post> { recent1 } };
            var tagOld = new Hashtag { Id = 3, Name = "oldtag", Posts = new List<Post> { oldPost } };

            context.Users.Add(new ApplicationUser { Id = "u1", UserName = "alice", FullName = "Alice" });
            context.Posts.AddRange(recent1, recent2, oldPost);
            context.Hashtags.AddRange(tagA, tagB, tagOld);

            await context.SaveChangesAsync();

            var service = CreateService(context);

            var result = (await service.GetTopTrendingHashtagsAsync(2)).ToList();

            Assert.Equal(2, result.Count);
            Assert.Equal("dotnet", result[0]);
            Assert.Equal("xunit", result[1]);
            Assert.DoesNotContain("oldtag", result);
        }

        [Fact]
        public async Task GetTopTrendingHashtagsAsync_ShouldReturnEmpty_WhenNoRecentHashtagsExist()
        {
            using var context = CreateDbContext(nameof(GetTopTrendingHashtagsAsync_ShouldReturnEmpty_WhenNoRecentHashtagsExist));

            var oldPost = new Post
            {
                Id = 1,
                UserId = "u1",
                Content = "old",
                CreatedAt = DateTime.UtcNow.AddDays(-20),
                IsDeleted = false
            };

            context.Users.Add(new ApplicationUser { Id = "u1", UserName = "alice", FullName = "Alice" });
            context.Posts.Add(oldPost);
            context.Hashtags.Add(new Hashtag
            {
                Id = 1,
                Name = "legacy",
                Posts = new List<Post> { oldPost }
            });

            await context.SaveChangesAsync();

            var service = CreateService(context);

            var result = (await service.GetTopTrendingHashtagsAsync()).ToList();

            Assert.Empty(result);
        }

        [Fact]
        public async Task GetUserProfileAsync_ShouldReturnNull_WhenUserDoesNotExist()
        {
            using var context = CreateDbContext(nameof(GetUserProfileAsync_ShouldReturnNull_WhenUserDoesNotExist));

            var friendServiceMock = new Mock<IFriendService>();
            var service = CreateService(context, friendServiceMock: friendServiceMock);

            var result = await service.GetUserProfileAsync("missing-user", "current-user");

            Assert.Null(result);
        }

        [Fact]
        public async Task GetUserProfileAsync_ShouldReturnProfileWithPostsAndFriendStatus_WhenUserExists()
        {
            using var context = CreateDbContext(nameof(GetUserProfileAsync_ShouldReturnProfileWithPostsAndFriendStatus_WhenUserExists));

            context.Users.AddRange(
                new ApplicationUser
                {
                    Id = "target",
                    UserName = "alice",
                    FullName = "Alice Doe",
                    Email = "alice@test.com",
                    PhoneNumber = "123",
                    Bio = "hello",
                    AvatarUrl = "avatar.png"
                },
                new ApplicationUser
                {
                    Id = "current",
                    UserName = "bob",
                    FullName = "Bob"
                }
            );

            context.Posts.AddRange(
                new Post
                {
                    Id = 1,
                    UserId = "target",
                    Content = "visible post",
                    CreatedAt = new DateTime(2024, 1, 2),
                    IsDeleted = false
                },
                new Post
                {
                    Id = 2,
                    UserId = "target",
                    Content = "deleted post",
                    CreatedAt = new DateTime(2024, 1, 1),
                    IsDeleted = true
                });

            context.Likes.Add(new Like
            {
                PostId = 1,
                UserId = "current",
                IsDeleted = false
            });

            context.Comments.Add(new Comment
            {
                Id = 1,
                PostId = 1,
                UserId = "current",
                Content = "comment",
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow
            });

            await context.SaveChangesAsync();

            var friendServiceMock = new Mock<IFriendService>();
            friendServiceMock
                .Setup(x => x.GetFriendStatusAsync("current", "target"))
                .ReturnsAsync(3);

            var service = CreateService(context, friendServiceMock: friendServiceMock);

            var result = await service.GetUserProfileAsync("target", "current");

            Assert.NotNull(result);
            Assert.Equal("target", result.Id);
            Assert.Equal("alice", result.UserName);
            Assert.Equal("Alice Doe", result.FullName);
            Assert.Equal("alice@test.com", result.Email);
            Assert.Equal("123", result.PhoneNumber);
            Assert.Equal("hello", result.Bio);
            Assert.Equal("avatar.png", result.AvatarUrl);
            Assert.Equal(3, result.FriendStatus);
            Assert.Equal(1, result.PostCount);
            Assert.Single(result.Posts);
            Assert.Equal("visible post", result.Posts[0].Content);
            Assert.True(result.Posts[0].IsLiked);
        }

        [Fact]
        public async Task GetUserProfileAsync_ShouldOrderPostsDescendingByCreatedAt()
        {
            using var context = CreateDbContext(nameof(GetUserProfileAsync_ShouldOrderPostsDescendingByCreatedAt));

            context.Users.AddRange(
                new ApplicationUser { Id = "target", UserName = "alice", FullName = "Alice" },
                new ApplicationUser { Id = "current", UserName = "bob", FullName = "Bob" }
            );

            context.Posts.AddRange(
                new Post
                {
                    Id = 1,
                    UserId = "target",
                    Content = "older",
                    CreatedAt = new DateTime(2024, 1, 1),
                    IsDeleted = false
                },
                new Post
                {
                    Id = 2,
                    UserId = "target",
                    Content = "newer",
                    CreatedAt = new DateTime(2024, 1, 2),
                    IsDeleted = false
                });

            await context.SaveChangesAsync();

            var friendServiceMock = new Mock<IFriendService>();
            friendServiceMock
                .Setup(x => x.GetFriendStatusAsync("current", "target"))
                .ReturnsAsync(0);

            var service = CreateService(context, friendServiceMock: friendServiceMock);

            var result = await service.GetUserProfileAsync("target", "current");

            Assert.NotNull(result);
            Assert.Equal(2, result.Posts.Count);
            Assert.Equal("newer", result.Posts[0].Content);
            Assert.Equal("older", result.Posts[1].Content);
        }
        [Fact]
        public async Task ToggleLikeAsync_ShouldCreateNotification_WhenLikeIsAdded()
        {
            using var context = CreateDbContext(nameof(ToggleLikeAsync_ShouldCreateNotification_WhenLikeIsAdded));
 
            context.Posts.Add(new Post
            {
                Id = 1, UserId = "owner", Content = "post",
                CreatedAt = DateTime.UtcNow, IsDeleted = false
            });
 
            await context.SaveChangesAsync();
 
            var notificationServiceMock = new Mock<INotificationService>();
            notificationServiceMock
                .Setup(x => x.CreateNotificationAsync(
                    It.IsAny<string>(), It.IsAny<string>(),
                    It.IsAny<NotificationType>(),
                    It.IsAny<string?>(), It.IsAny<int?>(),
                    It.IsAny<int?>(), It.IsAny<int?>()))
                .ReturnsAsync(new NotificationDto());
 
            var service = CreateService(context, notificationServiceMock: notificationServiceMock);
 
            await service.ToggleLikeAsync(1, "user-1");
 
            notificationServiceMock.Verify(
                x => x.CreateNotificationAsync(
                    "owner",
                    "user-1",
                    NotificationType.PostLiked,
                    null,
                    1,
                    null,
                    null),
                Times.Once);
        }
 
        [Fact]
        public async Task ToggleLikeAsync_ShouldNotCreateNotification_WhenLikeIsRemoved()
        {
            using var context = CreateDbContext(nameof(ToggleLikeAsync_ShouldNotCreateNotification_WhenLikeIsRemoved));
 
            context.Posts.Add(new Post
            {
                Id = 1, UserId = "owner", Content = "post",
                CreatedAt = DateTime.UtcNow, IsDeleted = false
            });
 
            // Active like – toggling will remove it
            context.Likes.Add(new Like { PostId = 1, UserId = "user-1", IsDeleted = false });
 
            await context.SaveChangesAsync();
 
            var notificationServiceMock = new Mock<INotificationService>();
            var service = CreateService(context, notificationServiceMock: notificationServiceMock);
 
            await service.ToggleLikeAsync(1, "user-1");
 
            notificationServiceMock.Verify(
                x => x.CreateNotificationAsync(
                    It.IsAny<string>(), It.IsAny<string>(),
                    NotificationType.PostLiked,
                    It.IsAny<string?>(), It.IsAny<int?>(),
                    It.IsAny<int?>(), It.IsAny<int?>()),
                Times.Never);
        }
 
        [Fact]
        public async Task ToggleLikeAsync_ShouldCallPushPostInteractionAsync_OnLike()
        {
            using var context = CreateDbContext(nameof(ToggleLikeAsync_ShouldCallPushPostInteractionAsync_OnLike));
 
            context.Posts.Add(new Post
            {
                Id = 1, UserId = "owner", Content = "post",
                CreatedAt = DateTime.UtcNow, IsDeleted = false
            });
 
            await context.SaveChangesAsync();
 
            var realtimeDispatcherMock = new Mock<IAppRealtimeDispatcher>();
            var service = CreateService(context, realtimeDispatcherMock: realtimeDispatcherMock);
 
            await service.ToggleLikeAsync(1, "user-1");
 
            realtimeDispatcherMock.Verify(
                x => x.PushPostInteractionAsync(
                    "owner", "liked", 1,
                    It.IsAny<int>(), It.IsAny<int>(),
                    null, "user-1"),
                Times.Once);
        }
 
        [Fact]
        public async Task ToggleLikeAsync_ShouldCallPushPostInteractionAsync_WithUnliked_WhenRemoved()
        {
            using var context = CreateDbContext(nameof(ToggleLikeAsync_ShouldCallPushPostInteractionAsync_WithUnliked_WhenRemoved));
 
            context.Posts.Add(new Post
            {
                Id = 1, UserId = "owner", Content = "post",
                CreatedAt = DateTime.UtcNow, IsDeleted = false
            });
 
            context.Likes.Add(new Like { PostId = 1, UserId = "user-1", IsDeleted = false });
            await context.SaveChangesAsync();
 
            var realtimeDispatcherMock = new Mock<IAppRealtimeDispatcher>();
            var service = CreateService(context, realtimeDispatcherMock: realtimeDispatcherMock);
 
            await service.ToggleLikeAsync(1, "user-1");
 
            realtimeDispatcherMock.Verify(
                x => x.PushPostInteractionAsync(
                    "owner", "unliked", 1,
                    It.IsAny<int>(), It.IsAny<int>(),
                    null, "user-1"),
                Times.Once);
        }
 
        // ── AddCommentAsync – realtime dispatch ──────────────────────────────
 
        [Fact]
        public async Task AddCommentAsync_ShouldCallPushPostInteractionAsync_WhenCommentAdded()
        {
            using var context = CreateDbContext(nameof(AddCommentAsync_ShouldCallPushPostInteractionAsync_WhenCommentAdded));
 
            context.Posts.Add(new Post
            {
                Id = 1, UserId = "owner", Content = "post",
                CreatedAt = DateTime.UtcNow, IsDeleted = false
            });
 
            await context.SaveChangesAsync();
 
            var userManagerMock = CreateUserManagerMock();
            userManagerMock
                .Setup(x => x.FindByIdAsync("user-1"))
                .ReturnsAsync(new ApplicationUser { Id = "user-1", FullName = "Alice" });
 
            var realtimeDispatcherMock = new Mock<IAppRealtimeDispatcher>();
            var service = CreateService(context,
                userManagerMock: userManagerMock,
                realtimeDispatcherMock: realtimeDispatcherMock);
 
            await service.AddCommentAsync(1, "user-1", "nice!");
 
            realtimeDispatcherMock.Verify(
                x => x.PushPostInteractionAsync(
                    "owner", "comment_added", 1,
                    It.IsAny<int>(), It.IsAny<int>(),
                    It.IsAny<int?>(), "user-1"),
                Times.Once);
        }
 
        [Fact]
        public async Task AddCommentAsync_ShouldCreateNotification_WhenPostOwnerIsDifferentUser()
        {
            using var context = CreateDbContext(nameof(AddCommentAsync_ShouldCreateNotification_WhenPostOwnerIsDifferentUser));
 
            context.Posts.Add(new Post
            {
                Id = 1, UserId = "owner", Content = "post",
                CreatedAt = DateTime.UtcNow, IsDeleted = false
            });
 
            await context.SaveChangesAsync();
 
            var userManagerMock = CreateUserManagerMock();
            userManagerMock
                .Setup(x => x.FindByIdAsync("commenter"))
                .ReturnsAsync(new ApplicationUser { Id = "commenter", FullName = "Bob" });
 
            var notificationServiceMock = new Mock<INotificationService>();
            notificationServiceMock
                .Setup(x => x.CreateNotificationAsync(
                    It.IsAny<string>(), It.IsAny<string>(),
                    It.IsAny<NotificationType>(),
                    It.IsAny<string?>(), It.IsAny<int?>(),
                    It.IsAny<int?>(), It.IsAny<int?>()))
                .ReturnsAsync(new NotificationDto());
 
            var service = CreateService(context,
                userManagerMock: userManagerMock,
                notificationServiceMock: notificationServiceMock);
 
            await service.AddCommentAsync(1, "commenter", "hi!");
 
            notificationServiceMock.Verify(
                x => x.CreateNotificationAsync(
                    "owner",
                    "commenter",
                    NotificationType.PostCommented,
                    null,
                    1,
                    It.IsAny<int?>(),
                    null),
                Times.Once);
        }
 
        // ── DeleteCommentAsync – realtime dispatch ───────────────────────────
 
        [Fact]
        public async Task DeleteCommentAsync_ShouldCallPushPostInteractionAsync_WhenDeleted()
        {
            using var context = CreateDbContext(nameof(DeleteCommentAsync_ShouldCallPushPostInteractionAsync_WhenDeleted));
 
            context.Posts.Add(new Post
            {
                Id = 1, UserId = "post-owner", Content = "post",
                CreatedAt = DateTime.UtcNow
            });
 
            context.Comments.Add(new Comment
            {
                Id = 1, PostId = 1, UserId = "comment-owner",
                Content = "comment", CreatedAt = DateTime.UtcNow, IsDeleted = false
            });
 
            await context.SaveChangesAsync();
 
            var realtimeDispatcherMock = new Mock<IAppRealtimeDispatcher>();
            var service = CreateService(context, realtimeDispatcherMock: realtimeDispatcherMock);
 
            await service.DeleteCommentAsync(1, "comment-owner");
 
            realtimeDispatcherMock.Verify(
                x => x.PushPostInteractionAsync(
                    "post-owner", "comment_deleted", 1,
                    It.IsAny<int>(), It.IsAny<int>(),
                    1, "comment-owner"),
                Times.Once);
        }
 
        // ── GlobalSearchAsync ────────────────────────────────────────────────
 
        [Fact]
        public async Task GlobalSearchAsync_ShouldReturnMatchingUsersByFullName()
        {
            using var context = CreateDbContext(nameof(GlobalSearchAsync_ShouldReturnMatchingUsersByFullName));
 
            context.Users.AddRange(
                new ApplicationUser { Id = "u1", UserName = "alice", FullName = "Alice Wonder", IsActive = true },
                new ApplicationUser { Id = "u2", UserName = "bob", FullName = "Bob Builder", IsActive = true }
            );
 
            await context.SaveChangesAsync();
 
            var friendServiceMock = new Mock<IFriendService>();
            var service = CreateService(context, friendServiceMock: friendServiceMock);
 
            var result = await service.GlobalSearchAsync("alice", "u2");
 
            Assert.Single(result.Users);
            Assert.Equal("u1", result.Users[0].Id);
        }
 
        [Fact]
        public async Task GlobalSearchAsync_ShouldReturnMatchingPostsByContent()
        {
            using var context = CreateDbContext(nameof(GlobalSearchAsync_ShouldReturnMatchingPostsByContent));
 
            context.Users.Add(new ApplicationUser
            {
                Id = "u1", UserName = "alice", FullName = "Alice", IsActive = true
            });
 
            context.Posts.AddRange(
                new Post { Id = 1, UserId = "u1", Content = "hello dotnet world", CreatedAt = DateTime.UtcNow, IsDeleted = false },
                new Post { Id = 2, UserId = "u1", Content = "random content", CreatedAt = DateTime.UtcNow, IsDeleted = false }
            );
 
            await context.SaveChangesAsync();
 
            var service = CreateService(context);
 
            var result = await service.GlobalSearchAsync("dotnet", "u1");
 
            Assert.Single(result.Posts);
            Assert.Equal(1, result.Posts[0].Id);
        }
 
        [Fact]
        public async Task GlobalSearchAsync_ShouldSearchByHashtag_WhenQueryStartsWithHash()
        {
            using var context = CreateDbContext(nameof(GlobalSearchAsync_ShouldSearchByHashtag_WhenQueryStartsWithHash));
 
            context.Users.Add(new ApplicationUser
            {
                Id = "u1", UserName = "alice", FullName = "Alice", IsActive = true
            });
 
            var tag = new Hashtag { Id = 1, Name = "dotnet" };
 
            context.Posts.Add(new Post
            {
                Id = 1, UserId = "u1", Content = "tagged post",
                CreatedAt = DateTime.UtcNow, IsDeleted = false,
                Hashtags = new List<Hashtag> { tag }
            });
 
            await context.SaveChangesAsync();
 
            var service = CreateService(context);
 
            var result = await service.GlobalSearchAsync("#dotnet", "u1");
 
            Assert.Single(result.Posts);
            Assert.Contains("dotnet", result.Hashtags);
        }
 
        [Fact]
        public async Task GlobalSearchAsync_ShouldExcludeDeletedPosts()
        {
            using var context = CreateDbContext(nameof(GlobalSearchAsync_ShouldExcludeDeletedPosts));
 
            context.Users.Add(new ApplicationUser
            {
                Id = "u1", UserName = "alice", FullName = "Alice", IsActive = true
            });
 
            context.Posts.AddRange(
                new Post { Id = 1, UserId = "u1", Content = "visible dotnet post", CreatedAt = DateTime.UtcNow, IsDeleted = false },
                new Post { Id = 2, UserId = "u1", Content = "deleted dotnet post", CreatedAt = DateTime.UtcNow, IsDeleted = true }
            );
 
            await context.SaveChangesAsync();
 
            var service = CreateService(context);
 
            var result = await service.GlobalSearchAsync("dotnet", "u1");
 
            Assert.Single(result.Posts);
            Assert.Equal(1, result.Posts[0].Id);
        }
 
        [Fact]
        public async Task GlobalSearchAsync_ShouldReturnPriorityPostFirst_WhenPriorityPostIdProvided()
        {
            using var context = CreateDbContext(nameof(GlobalSearchAsync_ShouldReturnPriorityPostFirst_WhenPriorityPostIdProvided));
 
            context.Users.Add(new ApplicationUser
            {
                Id = "u1", UserName = "alice", FullName = "Alice", IsActive = true
            });
 
            context.Posts.AddRange(
                new Post { Id = 1, UserId = "u1", Content = "older dotnet post", CreatedAt = new DateTime(2024, 1, 1), IsDeleted = false },
                new Post { Id = 2, UserId = "u1", Content = "newer dotnet post", CreatedAt = new DateTime(2024, 1, 3), IsDeleted = false },
                new Post { Id = 3, UserId = "u1", Content = "priority post about dotnet", CreatedAt = new DateTime(2024, 1, 2), IsDeleted = false }
            );
 
            await context.SaveChangesAsync();
 
            var service = CreateService(context);
 
            var result = await service.GlobalSearchAsync("dotnet", "u1", priorityPostId: 3);
 
            Assert.Equal(3, result.Posts[0].Id);
        }
 
        [Fact]
        public async Task GlobalSearchAsync_ShouldReturnEmptyResults_WhenQueryMatchesNothing()
        {
            using var context = CreateDbContext(nameof(GlobalSearchAsync_ShouldReturnEmptyResults_WhenQueryMatchesNothing));
 
            context.Users.Add(new ApplicationUser
            {
                Id = "u1", UserName = "alice", FullName = "Alice Wonder", IsActive = true
            });
 
            context.Posts.Add(new Post
            {
                Id = 1, UserId = "u1", Content = "some post",
                CreatedAt = DateTime.UtcNow, IsDeleted = false
            });
 
            await context.SaveChangesAsync();
 
            var service = CreateService(context);
 
            var result = await service.GlobalSearchAsync("zzznomatch", "u1");
 
            Assert.Empty(result.Users);
            Assert.Empty(result.Posts);
            Assert.Empty(result.Hashtags);
        }
 
        // ── GetUserProfileAsync – FriendStatus variations ────────────────────
 
        [Fact]
        public async Task GetUserProfileAsync_ShouldReturnFriendStatus0_WhenNotFriends()
        {
            using var context = CreateDbContext(nameof(GetUserProfileAsync_ShouldReturnFriendStatus0_WhenNotFriends));
 
            context.Users.AddRange(
                new ApplicationUser { Id = "target", UserName = "alice", FullName = "Alice" },
                new ApplicationUser { Id = "current", UserName = "bob", FullName = "Bob" }
            );
 
            await context.SaveChangesAsync();
 
            var friendServiceMock = new Mock<IFriendService>();
            friendServiceMock
                .Setup(x => x.GetFriendStatusAsync("current", "target"))
                .ReturnsAsync(0);
 
            var service = CreateService(context, friendServiceMock: friendServiceMock);
 
            var result = await service.GetUserProfileAsync("target", "current");
 
            Assert.NotNull(result);
            Assert.Equal(0, result.FriendStatus);
        }
 
        [Fact]
        public async Task GetUserProfileAsync_ShouldReturnPostCount_MatchingNonDeletedPosts()
        {
            using var context = CreateDbContext(nameof(GetUserProfileAsync_ShouldReturnPostCount_MatchingNonDeletedPosts));
 
            context.Users.AddRange(
                new ApplicationUser { Id = "target", UserName = "alice", FullName = "Alice" },
                new ApplicationUser { Id = "current", UserName = "bob", FullName = "Bob" }
            );
 
            context.Posts.AddRange(
                new Post { Id = 1, UserId = "target", Content = "visible", CreatedAt = DateTime.UtcNow, IsDeleted = false },
                new Post { Id = 2, UserId = "target", Content = "visible2", CreatedAt = DateTime.UtcNow, IsDeleted = false },
                new Post { Id = 3, UserId = "target", Content = "deleted", CreatedAt = DateTime.UtcNow, IsDeleted = true }
            );
 
            await context.SaveChangesAsync();
 
            var friendServiceMock = new Mock<IFriendService>();
            friendServiceMock
                .Setup(x => x.GetFriendStatusAsync("current", "target"))
                .ReturnsAsync(0);
 
            var service = CreateService(context, friendServiceMock: friendServiceMock);
 
            var result = await service.GetUserProfileAsync("target", "current");
 
            Assert.NotNull(result);
            Assert.Equal(2, result.PostCount);
        }
    }
}
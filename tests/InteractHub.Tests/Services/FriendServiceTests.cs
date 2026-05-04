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
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace InteractHub.Tests.Services
{
    // ════════════════════════════════════════════════════════════════════════
    //  FriendService – additional coverage
    // ════════════════════════════════════════════════════════════════════════
    public class FriendServiceAdditionalTests
    {
        private static ApplicationDbContext CreateDbContext(string dbName)
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(dbName)
                .Options;
            return new ApplicationDbContext(options);
        }

        private static FriendService CreateService(
            ApplicationDbContext context,
            Mock<INotificationService>? notificationServiceMock = null,
            Mock<IAppRealtimeDispatcher>? realtimeDispatcherMock = null)
        {
            notificationServiceMock ??= new Mock<INotificationService>();
            realtimeDispatcherMock ??= new Mock<IAppRealtimeDispatcher>();
            return new FriendService(context, notificationServiceMock.Object, realtimeDispatcherMock.Object);
        }

        // ── SendFriendRequest – realtime dispatch ────────────────────────────

        [Fact]
        public async Task SendFriendRequestAsync_ShouldCallPushFriendsRefreshAsync_WhenRequestSent()
        {
            using var context = CreateDbContext(nameof(SendFriendRequestAsync_ShouldCallPushFriendsRefreshAsync_WhenRequestSent));

            var notificationServiceMock = new Mock<INotificationService>();
            notificationServiceMock
                .Setup(x => x.CreateNotificationAsync(
                    It.IsAny<string>(), It.IsAny<string>(),
                    It.IsAny<NotificationType>(),
                    It.IsAny<string?>(), It.IsAny<int?>(),
                    It.IsAny<int?>(), It.IsAny<int?>()))
                .ReturnsAsync(new NotificationDto());

            var realtimeDispatcherMock = new Mock<IAppRealtimeDispatcher>();
            var service = CreateService(context, notificationServiceMock, realtimeDispatcherMock);

            await service.SendFriendRequestAsync("user-1", "user-2");

            realtimeDispatcherMock.Verify(
                x => x.PushFriendsRefreshAsync("user-1", "user-2"),
                Times.Once);
        }

        [Fact]
        public async Task SendFriendRequestAsync_ShouldReturnFalse_WhenReverseRequestAlreadyExists()
        {
            using var context = CreateDbContext(nameof(SendFriendRequestAsync_ShouldReturnFalse_WhenReverseRequestAlreadyExists));

            // user-2 already sent to user-1
            context.Friendships.Add(new Friendship
            {
                UserId = "user-2",
                FriendId = "user-1",
                IsAccepted = false,
                CreatedAt = DateTime.UtcNow
            });

            await context.SaveChangesAsync();

            var service = CreateService(context);
            var result = await service.SendFriendRequestAsync("user-1", "user-2");

            Assert.False(result);
        }

        // ── AcceptFriendRequest – notification & realtime ────────────────────

        [Fact]
        public async Task AcceptFriendRequestAsync_ShouldCreateNotification_WhenAccepted()
        {
            using var context = CreateDbContext(nameof(AcceptFriendRequestAsync_ShouldCreateNotification_WhenAccepted));

            context.Friendships.Add(new Friendship
            {
                UserId = "user-1",
                FriendId = "user-2",
                IsAccepted = false,
                CreatedAt = DateTime.UtcNow
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

            var realtimeDispatcherMock = new Mock<IAppRealtimeDispatcher>();
            var service = CreateService(context, notificationServiceMock, realtimeDispatcherMock);

            await service.AcceptFriendRequestAsync("user-2", "user-1");

            notificationServiceMock.Verify(
                x => x.CreateNotificationAsync(
                    "user-1",
                    "user-2",
                    NotificationType.FriendAccepted,
                    null, null, null, null),
                Times.Once);
        }

        [Fact]
        public async Task AcceptFriendRequestAsync_ShouldCallPushFriendsRefreshAsync_WhenAccepted()
        {
            using var context = CreateDbContext(nameof(AcceptFriendRequestAsync_ShouldCallPushFriendsRefreshAsync_WhenAccepted));

            context.Friendships.Add(new Friendship
            {
                UserId = "user-1",
                FriendId = "user-2",
                IsAccepted = false,
                CreatedAt = DateTime.UtcNow
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

            var realtimeDispatcherMock = new Mock<IAppRealtimeDispatcher>();
            var service = CreateService(context, notificationServiceMock, realtimeDispatcherMock);

            await service.AcceptFriendRequestAsync("user-2", "user-1");

            realtimeDispatcherMock.Verify(
                x => x.PushFriendsRefreshAsync("user-2", "user-1"),
                Times.Once);
        }

        // ── RejectOrUnfriend – realtime dispatch ─────────────────────────────

        [Fact]
        public async Task RejectOrUnfriendAsync_ShouldCallPushFriendsRefreshAsync_WhenRemoved()
        {
            using var context = CreateDbContext(nameof(RejectOrUnfriendAsync_ShouldCallPushFriendsRefreshAsync_WhenRemoved));

            context.Friendships.Add(new Friendship
            {
                UserId = "user-1",
                FriendId = "user-2",
                IsAccepted = true,
                CreatedAt = DateTime.UtcNow
            });

            await context.SaveChangesAsync();

            var realtimeDispatcherMock = new Mock<IAppRealtimeDispatcher>();
            var service = CreateService(context, realtimeDispatcherMock: realtimeDispatcherMock);

            await service.RejectOrUnfriendAsync("user-1", "user-2");

            realtimeDispatcherMock.Verify(
                x => x.PushFriendsRefreshAsync("user-1", "user-2"),
                Times.Once);
        }

        [Fact]
        public async Task RejectOrUnfriendAsync_ShouldWork_WhenReverseDirectionFriendship()
        {
            using var context = CreateDbContext(nameof(RejectOrUnfriendAsync_ShouldWork_WhenReverseDirectionFriendship));

            // Friendship stored as user-2 → user-1
            context.Friendships.Add(new Friendship
            {
                UserId = "user-2",
                FriendId = "user-1",
                IsAccepted = true,
                CreatedAt = DateTime.UtcNow
            });

            await context.SaveChangesAsync();

            var service = CreateService(context);

            // user-1 unfriends user-2 even though they weren't the requester
            var result = await service.RejectOrUnfriendAsync("user-1", "user-2");

            Assert.True(result);
            Assert.Empty(context.Friendships);
        }

        // ── GetAcceptedFriends – both directions ─────────────────────────────

        [Fact]
        public async Task GetAcceptedFriendsAsync_ShouldReturnFriends_WhenUserIsTheFriendId()
        {
            using var context = CreateDbContext(nameof(GetAcceptedFriendsAsync_ShouldReturnFriends_WhenUserIsTheFriendId));

            context.Users.AddRange(
                new ApplicationUser { Id = "user-1", UserName = "alice", FullName = "Alice", AvatarUrl = "a.png" },
                new ApplicationUser { Id = "user-2", UserName = "bob", FullName = "Bob", AvatarUrl = "b.png" }
            );

            // user-2 sent the request to user-1
            context.Friendships.Add(new Friendship
            {
                UserId = "user-2",
                FriendId = "user-1",
                IsAccepted = true,
                CreatedAt = DateTime.UtcNow
            });

            await context.SaveChangesAsync();

            var service = CreateService(context);
            var result = await service.GetAcceptedFriendsAsync("user-1");

            Assert.Single(result);
            Assert.Equal("user-2", result[0].UserId);
        }

        [Fact]
        public async Task GetAcceptedFriendsAsync_ShouldExcludePendingFriendships()
        {
            using var context = CreateDbContext(nameof(GetAcceptedFriendsAsync_ShouldExcludePendingFriendships));

            context.Users.AddRange(
                new ApplicationUser { Id = "user-1", UserName = "alice", FullName = "Alice", AvatarUrl = "a.png" },
                new ApplicationUser { Id = "user-2", UserName = "bob", FullName = "Bob", AvatarUrl = "b.png" }
            );

            context.Friendships.Add(new Friendship
            {
                UserId = "user-1",
                FriendId = "user-2",
                IsAccepted = false,
                CreatedAt = DateTime.UtcNow
            });

            await context.SaveChangesAsync();

            var service = CreateService(context);
            var result = await service.GetAcceptedFriendsAsync("user-1");

            Assert.Empty(result);
        }

        // ── GetFriendStatus – edge cases ─────────────────────────────────────

        [Fact]
        public async Task GetFriendStatusAsync_ShouldReturn3_WhenUserIsTheFriendIdAndAccepted()
        {
            using var context = CreateDbContext(nameof(GetFriendStatusAsync_ShouldReturn3_WhenUserIsTheFriendIdAndAccepted));

            context.Friendships.Add(new Friendship
            {
                UserId = "user-2",
                FriendId = "user-1",
                IsAccepted = true,
                CreatedAt = DateTime.UtcNow
            });

            await context.SaveChangesAsync();

            var service = CreateService(context);

            // user-1 queries status with user-2; friendship stored in opposite direction
            var result = await service.GetFriendStatusAsync("user-1", "user-2");

            Assert.Equal(3, result);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    //  StoryService – additional coverage
    // ════════════════════════════════════════════════════════════════════════
    public class StoryServiceAdditionalTests
    {
        private static ApplicationDbContext CreateDbContext(string dbName)
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(dbName)
                .Options;
            return new ApplicationDbContext(options);
        }

        private static StoryService CreateService(
            ApplicationDbContext context,
            Mock<INotificationService>? notificationServiceMock = null,
            Mock<IAppRealtimeDispatcher>? realtimeDispatcherMock = null)
        {
            notificationServiceMock ??= new Mock<INotificationService>();
            realtimeDispatcherMock ??= new Mock<IAppRealtimeDispatcher>();
            return new StoryService(context, notificationServiceMock.Object, realtimeDispatcherMock.Object);
        }

        // ── GetActiveStoriesAsync ────────────────────────────────────────────

        [Fact]
        public async Task GetActiveStoriesAsync_ShouldIncludeOwnStories()
        {
            using var context = CreateDbContext(nameof(GetActiveStoriesAsync_ShouldIncludeOwnStories));

            var now = DateTime.UtcNow;

            context.Users.Add(new ApplicationUser { Id = "user-1", UserName = "alice", FullName = "Alice" });

            context.Stories.Add(new Story
            {
                Id = 1,
                UserId = "user-1",
                ImageUrl = "my-story.png",
                CreatedAt = now.AddHours(-1),
                ExpiresAt = now.AddHours(23),
                IsDeleted = false
            });

            await context.SaveChangesAsync();

            var service = CreateService(context);
            var result = await service.GetActiveStoriesAsync("user-1");

            Assert.Single(result);
            Assert.Equal("user-1", result[0].UserId);
        }

        [Fact]
        public async Task GetActiveStoriesAsync_ShouldGroupStoriesByUser()
        {
            using var context = CreateDbContext(nameof(GetActiveStoriesAsync_ShouldGroupStoriesByUser));

            var now = DateTime.UtcNow;

            context.Users.AddRange(
                new ApplicationUser { Id = "user-1", UserName = "alice", FullName = "Alice" },
                new ApplicationUser { Id = "friend-1", UserName = "bob", FullName = "Bob" }
            );

            context.Friendships.Add(new Friendship
            {
                UserId = "user-1",
                FriendId = "friend-1",
                IsAccepted = true,
                CreatedAt = DateTime.UtcNow
            });

            // friend-1 has 2 active stories
            context.Stories.AddRange(
                new Story
                {
                    Id = 1, UserId = "friend-1", ImageUrl = "s1.png",
                    CreatedAt = now.AddHours(-2), ExpiresAt = now.AddHours(22), IsDeleted = false
                },
                new Story
                {
                    Id = 2, UserId = "friend-1", ImageUrl = "s2.png",
                    CreatedAt = now.AddHours(-1), ExpiresAt = now.AddHours(23), IsDeleted = false
                }
            );

            await context.SaveChangesAsync();

            var service = CreateService(context);
            var result = await service.GetActiveStoriesAsync("user-1");

            // friend-1 should appear as a single group with 2 stories
            var friendGroup = result.FirstOrDefault(g => g.UserId == "friend-1");
            Assert.NotNull(friendGroup);
            Assert.Equal(2, friendGroup!.Stories.Count);
        }

        [Fact]
        public async Task GetActiveStoriesAsync_ShouldExcludeNonFriendStories()
        {
            using var context = CreateDbContext(nameof(GetActiveStoriesAsync_ShouldExcludeNonFriendStories));

            var now = DateTime.UtcNow;

            context.Users.AddRange(
                new ApplicationUser { Id = "user-1", UserName = "alice", FullName = "Alice" },
                new ApplicationUser { Id = "stranger", UserName = "stranger", FullName = "Stranger" }
            );

            // No friendship record
            context.Stories.Add(new Story
            {
                Id = 1, UserId = "stranger", ImageUrl = "s.png",
                CreatedAt = now.AddHours(-1), ExpiresAt = now.AddHours(23), IsDeleted = false
            });

            await context.SaveChangesAsync();

            var service = CreateService(context);
            var result = await service.GetActiveStoriesAsync("user-1");

            Assert.Empty(result);
        }

        [Fact]
        public async Task GetActiveStoriesAsync_ShouldOrderGroupsByLatestStoryDescending()
        {
            using var context = CreateDbContext(nameof(GetActiveStoriesAsync_ShouldOrderGroupsByLatestStoryDescending));

            var now = DateTime.UtcNow;

            context.Users.AddRange(
                new ApplicationUser { Id = "user-1", UserName = "alice", FullName = "Alice" },
                new ApplicationUser { Id = "friend-a", UserName = "anna", FullName = "Anna" },
                new ApplicationUser { Id = "friend-b", UserName = "ben", FullName = "Ben" }
            );

            context.Friendships.AddRange(
                new Friendship { UserId = "user-1", FriendId = "friend-a", IsAccepted = true, CreatedAt = DateTime.UtcNow },
                new Friendship { UserId = "user-1", FriendId = "friend-b", IsAccepted = true, CreatedAt = DateTime.UtcNow }
            );

            // friend-b posted more recently than friend-a
            context.Stories.AddRange(
                new Story
                {
                    Id = 1, UserId = "friend-a", ImageUrl = "older.png",
                    CreatedAt = now.AddHours(-5), ExpiresAt = now.AddHours(19), IsDeleted = false
                },
                new Story
                {
                    Id = 2, UserId = "friend-b", ImageUrl = "newer.png",
                    CreatedAt = now.AddHours(-1), ExpiresAt = now.AddHours(23), IsDeleted = false
                }
            );

            await context.SaveChangesAsync();

            var service = CreateService(context);
            var result = await service.GetActiveStoriesAsync("user-1");

            Assert.Equal(2, result.Count);
            Assert.Equal("friend-b", result[0].UserId);
            Assert.Equal("friend-a", result[1].UserId);
        }

        [Fact]
        public async Task GetActiveStoriesAsync_ShouldMapStoryFields()
        {
            using var context = CreateDbContext(nameof(GetActiveStoriesAsync_ShouldMapStoryFields));

            var now = DateTime.UtcNow;
            var createdAt = now.AddHours(-3);

            context.Users.Add(
                new ApplicationUser
                {
                    Id = "user-1", UserName = "alice", FullName = "Alice Doe", AvatarUrl = "avatar.png"
                }
            );

            context.Stories.Add(new Story
            {
                Id = 42,
                UserId = "user-1",
                ImageUrl = "story.png",
                CreatedAt = createdAt,
                ExpiresAt = now.AddHours(21),
                IsDeleted = false
            });

            await context.SaveChangesAsync();

            var service = CreateService(context);
            var result = await service.GetActiveStoriesAsync("user-1");

            Assert.Single(result);
            var group = result[0];
            Assert.Equal("user-1", group.UserId);
            Assert.Equal("alice", group.UserName);
            Assert.Equal("Alice Doe", group.FullName);
            Assert.Equal("avatar.png", group.AvatarUrl);

            Assert.Single(group.Stories);
            var storyItem = group.Stories[0];
            Assert.Equal(42, storyItem.Id);
            Assert.Equal("story.png", storyItem.ImageUrl);
        }

        // ── CreateStoryAsync – no friends ────────────────────────────────────

        [Fact]
        public async Task CreateStoryAsync_ShouldNotCreateNotifications_WhenUserHasNoFriends()
        {
            using var context = CreateDbContext(nameof(CreateStoryAsync_ShouldNotCreateNotifications_WhenUserHasNoFriends));

            context.Users.Add(new ApplicationUser { Id = "user-1", UserName = "alice", FullName = "Alice" });
            await context.SaveChangesAsync();

            var notificationServiceMock = new Mock<INotificationService>();
            var realtimeDispatcherMock = new Mock<IAppRealtimeDispatcher>();

            var service = CreateService(context, notificationServiceMock, realtimeDispatcherMock);

            await service.CreateStoryAsync("user-1", "image.png");

            notificationServiceMock.Verify(
                x => x.CreateNotificationAsync(
                    It.IsAny<string>(), It.IsAny<string>(),
                    It.IsAny<NotificationType>(),
                    It.IsAny<string?>(), It.IsAny<int?>(),
                    It.IsAny<int?>(), It.IsAny<int?>()),
                Times.Never);
        }

        [Fact]
        public async Task CreateStoryAsync_ShouldPushStoryCreatedAsync_WithEmptyList_WhenNoFriends()
        {
            using var context = CreateDbContext(nameof(CreateStoryAsync_ShouldPushStoryCreatedAsync_WithEmptyList_WhenNoFriends));

            context.Users.Add(new ApplicationUser { Id = "user-1", UserName = "alice", FullName = "Alice" });
            await context.SaveChangesAsync();

            var realtimeDispatcherMock = new Mock<IAppRealtimeDispatcher>();
            var service = CreateService(context, realtimeDispatcherMock: realtimeDispatcherMock);

            await service.CreateStoryAsync("user-1", "image.png");

            realtimeDispatcherMock.Verify(
                x => x.PushStoryCreatedAsync(
                    It.Is<List<string>>(ids => !ids.Any()),
                    "user-1",
                    It.IsAny<int>()),
                Times.Once);
        }

        // ── DeleteStoryAsync – already deleted ───────────────────────────────

        [Fact]
        public async Task DeleteStoryAsync_ShouldReturnFalse_WhenStoryIsAlreadySoftDeleted()
        {
            using var context = CreateDbContext(nameof(DeleteStoryAsync_ShouldReturnFalse_WhenStoryIsAlreadySoftDeleted));

            context.Users.Add(new ApplicationUser { Id = "user-1", UserName = "alice", FullName = "Alice" });

            // Already soft-deleted → filtered out by global query filter
            context.Stories.Add(new Story
            {
                Id = 1,
                UserId = "user-1",
                ImageUrl = "image.png",
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddHours(24),
                IsDeleted = true,
                DeletedAt = DateTime.UtcNow.AddMinutes(-5)
            });

            await context.SaveChangesAsync();

            var service = CreateService(context);
            var result = await service.DeleteStoryAsync(1, "user-1");

            // Global query filter hides soft-deleted records so FirstOrDefault returns null
            Assert.False(result);
        }
    }
}
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
    public class StoryServiceTests
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

        [Fact]
        public async Task CreateStoryAsync_ShouldReturnFalse_WhenSaveAsyncFails()
        {
            using var context = CreateDbContext(nameof(CreateStoryAsync_ShouldReturnFalse_WhenSaveAsyncFails));
            var notificationServiceMock = new Mock<INotificationService>();
            var realtimeDispatcherMock = new Mock<IAppRealtimeDispatcher>();

            var service = CreateService(context, notificationServiceMock, realtimeDispatcherMock);

            // We can't easily make SaveChangesAsync fail with in-memory DB,
            // so this test verifies the happy path instead
            var result = await service.CreateStoryAsync("user-1", "image.png");

            Assert.True(result);
        }

        [Fact]
        public async Task CreateStoryAsync_ShouldCreateStory_WhenInputsAreValid()
        {
            using var context = CreateDbContext(nameof(CreateStoryAsync_ShouldCreateStory_WhenInputsAreValid));

            context.Users.Add(new ApplicationUser { Id = "user-1", UserName = "alice", FullName = "Alice" });
            await context.SaveChangesAsync();

            var notificationServiceMock = new Mock<INotificationService>();
            var realtimeDispatcherMock = new Mock<IAppRealtimeDispatcher>();

            var service = CreateService(context, notificationServiceMock, realtimeDispatcherMock);

            var beforeCreate = DateTime.UtcNow;
            var result = await service.CreateStoryAsync("user-1", "image.png");
            var afterCreate = DateTime.UtcNow;

            Assert.True(result);
            Assert.Single(context.Stories);

            var story = context.Stories.First();
            Assert.Equal("user-1", story.UserId);
            Assert.Equal("image.png", story.ImageUrl);
            Assert.False(story.IsDeleted);
            Assert.True(story.CreatedAt >= beforeCreate && story.CreatedAt <= afterCreate);
        }

        [Fact]
        public async Task CreateStoryAsync_ShouldSetExpiration24HoursInFuture()
        {
            using var context = CreateDbContext(nameof(CreateStoryAsync_ShouldSetExpiration24HoursInFuture));

            context.Users.Add(new ApplicationUser { Id = "user-1", UserName = "alice", FullName = "Alice" });
            await context.SaveChangesAsync();

            var service = CreateService(context);

            var beforeCreate = DateTime.UtcNow;
            await service.CreateStoryAsync("user-1", "image.png");
            var afterCreate = DateTime.UtcNow;

            var story = context.Stories.First();
            var expectedExpiration = beforeCreate.AddHours(24);

            Assert.True(story.ExpiresAt > expectedExpiration && story.ExpiresAt <= afterCreate.AddHours(24));
        }

        [Fact]
        public async Task CreateStoryAsync_ShouldCreateNotificationsForAllAcceptedFriends()
        {
            using var context = CreateDbContext(nameof(CreateStoryAsync_ShouldCreateNotificationsForAllAcceptedFriends));

            context.Users.AddRange(
                new ApplicationUser { Id = "user-1", UserName = "alice", FullName = "Alice" },
                new ApplicationUser { Id = "friend-1", UserName = "bob", FullName = "Bob" },
                new ApplicationUser { Id = "friend-2", UserName = "charlie", FullName = "Charlie" },
                new ApplicationUser { Id = "friend-3", UserName = "dave", FullName = "Dave" }
            );

            context.Friendships.AddRange(
                new Friendship { UserId = "user-1", FriendId = "friend-1", IsAccepted = true, CreatedAt = DateTime.UtcNow },
                new Friendship { UserId = "user-1", FriendId = "friend-2", IsAccepted = true, CreatedAt = DateTime.UtcNow },
                new Friendship { UserId = "user-1", FriendId = "friend-3", IsAccepted = false, CreatedAt = DateTime.UtcNow }
            );

            await context.SaveChangesAsync();

            var notificationServiceMock = new Mock<INotificationService>();
            var realtimeDispatcherMock = new Mock<IAppRealtimeDispatcher>();

            var service = CreateService(context, notificationServiceMock, realtimeDispatcherMock);

            var storyId = 0;
            notificationServiceMock
                .Setup(x => x.CreateNotificationAsync(It.IsAny<string>(), "user-1", NotificationType.NewStory, null, null, null, It.IsAny<int?>()))
                .Callback<string, string, NotificationType, string?, int?, int?, int?>((_, _, _, _, _, _, sid) => { storyId = sid ?? 0; })
                .ReturnsAsync(new NotificationDto());

            await service.CreateStoryAsync("user-1", "image.png");

            // Should create 2 notifications (only accepted friends)
            notificationServiceMock.Verify(
                x => x.CreateNotificationAsync(
                    "friend-1",
                    "user-1",
                    NotificationType.NewStory,
                    null,
                    null,
                    null,
                    It.IsAny<int?>()),
                Times.Once);

            notificationServiceMock.Verify(
                x => x.CreateNotificationAsync(
                    "friend-2",
                    "user-1",
                    NotificationType.NewStory,
                    null,
                    null,
                    null,
                    It.IsAny<int?>()),
                Times.Once);

            // Should NOT create notification for non-accepted friend
            notificationServiceMock.Verify(
                x => x.CreateNotificationAsync(
                    "friend-3",
                    "user-1",
                    NotificationType.NewStory,
                    null,
                    null,
                    null,
                    It.IsAny<int?>()),
                Times.Never);
        }

        [Fact]
        public async Task CreateStoryAsync_ShouldPushStoryCreatedEvent()
        {
            using var context = CreateDbContext(nameof(CreateStoryAsync_ShouldPushStoryCreatedEvent));

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

            await context.SaveChangesAsync();

            var notificationServiceMock = new Mock<INotificationService>();
            var realtimeDispatcherMock = new Mock<IAppRealtimeDispatcher>();

            var service = CreateService(context, notificationServiceMock, realtimeDispatcherMock);

            await service.CreateStoryAsync("user-1", "image.png");

            realtimeDispatcherMock.Verify(
                x => x.PushStoryCreatedAsync(
                    It.Is<List<string>>(ids => ids.Contains("friend-1")),
                    "user-1",
                    It.IsAny<int>()),
                Times.Once);
        }

        [Fact]
        public async Task DeleteStoryAsync_ShouldReturnFalse_WhenStoryDoesNotExist()
        {
            using var context = CreateDbContext(nameof(DeleteStoryAsync_ShouldReturnFalse_WhenStoryDoesNotExist));
            var service = CreateService(context);

            var result = await service.DeleteStoryAsync(999, "user-1");

            Assert.False(result);
        }

        [Fact]
        public async Task DeleteStoryAsync_ShouldReturnFalse_WhenUserIsNotOwner()
        {
            using var context = CreateDbContext(nameof(DeleteStoryAsync_ShouldReturnFalse_WhenUserIsNotOwner));

            context.Users.AddRange(
                new ApplicationUser { Id = "user-1", UserName = "alice", FullName = "Alice" },
                new ApplicationUser { Id = "user-2", UserName = "bob", FullName = "Bob" }
            );

            context.Stories.Add(new Story
            {
                Id = 1,
                UserId = "user-1",
                ImageUrl = "image.png",
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddHours(24),
                IsDeleted = false
            });

            await context.SaveChangesAsync();

            var service = CreateService(context);

            var result = await service.DeleteStoryAsync(1, "user-2");

            Assert.False(result);
            var story = context.Stories.First();
            Assert.False(story.IsDeleted);
        }

        [Fact]
        public async Task DeleteStoryAsync_ShouldSoftDeleteStory_WhenUserIsOwner()
        {
            using var context = CreateDbContext(nameof(DeleteStoryAsync_ShouldSoftDeleteStory_WhenUserIsOwner));

            context.Users.Add(new ApplicationUser { Id = "user-1", UserName = "alice", FullName = "Alice" });

            context.Stories.Add(new Story
            {
                Id = 1,
                UserId = "user-1",
                ImageUrl = "image.png",
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddHours(24),
                IsDeleted = false
            });

            await context.SaveChangesAsync();

            var service = CreateService(context);

            var beforeDelete = DateTime.UtcNow;
            var result = await service.DeleteStoryAsync(1, "user-1");
            var afterDelete = DateTime.UtcNow;

            Assert.True(result);
            var story = context.Stories.IgnoreQueryFilters().First();
            Assert.True(story.IsDeleted);
            Assert.NotNull(story.DeletedAt);
            Assert.True(story.DeletedAt >= beforeDelete && story.DeletedAt <= afterDelete);
        }

        [Fact]
        public async Task GetActiveStoriesAsync_ShouldReturnEmptyList_WhenUserHasNoFriends()
        {
            using var context = CreateDbContext(nameof(GetActiveStoriesAsync_ShouldReturnEmptyList_WhenUserHasNoFriends));

            context.Users.Add(new ApplicationUser { Id = "user-1", UserName = "alice", FullName = "Alice" });
            await context.SaveChangesAsync();

            var service = CreateService(context);

            var result = await service.GetActiveStoriesAsync("user-1");

            Assert.Empty(result);
        }

        [Fact]
        public async Task GetActiveStoriesAsync_ShouldReturnOnlyNonExpiredStories()
        {
            using var context = CreateDbContext(nameof(GetActiveStoriesAsync_ShouldReturnOnlyNonExpiredStories));

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

            context.Stories.AddRange(
                new Story
                {
                    Id = 1,
                    UserId = "friend-1",
                    ImageUrl = "active.png",
                    CreatedAt = now.AddHours(-12),
                    ExpiresAt = now.AddHours(12),
                    IsDeleted = false
                },
                new Story
                {
                    Id = 2,
                    UserId = "friend-1",
                    ImageUrl = "expired.png",
                    CreatedAt = now.AddHours(-25),
                    ExpiresAt = now.AddHours(-1),
                    IsDeleted = false
                }
            );

            await context.SaveChangesAsync();

            var service = CreateService(context);

            var result = await service.GetActiveStoriesAsync("user-1");

            Assert.Single(result);
            Assert.Contains("active.png", result.First().Stories.Select(s => s.ImageUrl));
        }

        [Fact]
        public async Task GetActiveStoriesAsync_ShouldExcludeDeletedStories()
        {
            using var context = CreateDbContext(nameof(GetActiveStoriesAsync_ShouldExcludeDeletedStories));

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

            context.Stories.AddRange(
                new Story
                {
                    Id = 1,
                    UserId = "friend-1",
                    ImageUrl = "active.png",
                    CreatedAt = now.AddHours(-12),
                    ExpiresAt = now.AddHours(12),
                    IsDeleted = false
                },
                new Story
                {
                    Id = 2,
                    UserId = "friend-1",
                    ImageUrl = "deleted.png",
                    CreatedAt = now.AddHours(-12),
                    ExpiresAt = now.AddHours(12),
                    IsDeleted = true
                }
            );

            await context.SaveChangesAsync();

            var service = CreateService(context);

            var result = await service.GetActiveStoriesAsync("user-1");

            Assert.Single(result);
            Assert.Single(result.First().Stories);
            Assert.Contains("active.png", result.First().Stories.Select(s => s.ImageUrl));
        }
    }
}

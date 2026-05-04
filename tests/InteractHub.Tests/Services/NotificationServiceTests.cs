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
    public class NotificationServiceAdditionalTests
    {
        private static ApplicationDbContext CreateDbContext(string dbName)
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(dbName)
                .Options;
            return new ApplicationDbContext(options);
        }

        private static NotificationService CreateService(
            ApplicationDbContext context,
            Mock<IAppRealtimeDispatcher>? realtimeDispatcherMock = null)
        {
            realtimeDispatcherMock ??= new Mock<IAppRealtimeDispatcher>();
            return new NotificationService(context, realtimeDispatcherMock.Object);
        }

        // ── GetUnreadCountAsync ──────────────────────────────────────────────

        [Fact]
        public async Task GetUnreadCountAsync_ShouldReturn0_WhenUserHasNoNotifications()
        {
            using var context = CreateDbContext(nameof(GetUnreadCountAsync_ShouldReturn0_WhenUserHasNoNotifications));
            var service = CreateService(context);

            var result = await service.GetUnreadCountAsync("user-1");

            Assert.Equal(0, result);
        }

        [Fact]
        public async Task GetUnreadCountAsync_ShouldCountOnlyUnreadNotifications()
        {
            using var context = CreateDbContext(nameof(GetUnreadCountAsync_ShouldCountOnlyUnreadNotifications));

            context.Users.Add(new ApplicationUser { Id = "user-1", UserName = "alice", FullName = "Alice" });

            context.Notifications.AddRange(
                new Notification
                {
                    Id = 1, UserId = "user-1", SenderId = "user-1",
                    Type = NotificationType.NewPost, Message = "msg1",
                    IsRead = false, CreatedAt = DateTime.UtcNow
                },
                new Notification
                {
                    Id = 2, UserId = "user-1", SenderId = "user-1",
                    Type = NotificationType.NewPost, Message = "msg2",
                    IsRead = true, CreatedAt = DateTime.UtcNow
                },
                new Notification
                {
                    Id = 3, UserId = "user-1", SenderId = "user-1",
                    Type = NotificationType.NewPost, Message = "msg3",
                    IsRead = false, CreatedAt = DateTime.UtcNow
                }
            );

            await context.SaveChangesAsync();

            var service = CreateService(context);
            var result = await service.GetUnreadCountAsync("user-1");

            Assert.Equal(2, result);
        }

        [Fact]
        public async Task GetUnreadCountAsync_ShouldNotCountOtherUsersNotifications()
        {
            using var context = CreateDbContext(nameof(GetUnreadCountAsync_ShouldNotCountOtherUsersNotifications));

            context.Users.AddRange(
                new ApplicationUser { Id = "user-1", UserName = "alice", FullName = "Alice" },
                new ApplicationUser { Id = "user-2", UserName = "bob", FullName = "Bob" }
            );

            context.Notifications.AddRange(
                new Notification
                {
                    Id = 1, UserId = "user-1", SenderId = "user-1",
                    Type = NotificationType.NewPost, Message = "msg",
                    IsRead = false, CreatedAt = DateTime.UtcNow
                },
                new Notification
                {
                    Id = 2, UserId = "user-2", SenderId = "user-1",
                    Type = NotificationType.NewPost, Message = "msg2",
                    IsRead = false, CreatedAt = DateTime.UtcNow
                }
            );

            await context.SaveChangesAsync();

            var service = CreateService(context);
            var result = await service.GetUnreadCountAsync("user-1");

            Assert.Equal(1, result);
        }

        // ── MarkAsReadAsync ──────────────────────────────────────────────────

        [Fact]
        public async Task MarkAsReadAsync_ShouldReturnFalse_WhenNotificationDoesNotExist()
        {
            using var context = CreateDbContext(nameof(MarkAsReadAsync_ShouldReturnFalse_WhenNotificationDoesNotExist));
            var service = CreateService(context);

            var result = await service.MarkAsReadAsync(999, "user-1");

            Assert.False(result);
        }

        [Fact]
        public async Task MarkAsReadAsync_ShouldReturnFalse_WhenNotificationBelongsToOtherUser()
        {
            using var context = CreateDbContext(nameof(MarkAsReadAsync_ShouldReturnFalse_WhenNotificationBelongsToOtherUser));

            context.Users.AddRange(
                new ApplicationUser { Id = "user-1", UserName = "alice", FullName = "Alice" },
                new ApplicationUser { Id = "user-2", UserName = "bob", FullName = "Bob" }
            );

            context.Notifications.Add(new Notification
            {
                Id = 1, UserId = "user-2", SenderId = "user-1",
                Type = NotificationType.NewPost, Message = "msg",
                IsRead = false, CreatedAt = DateTime.UtcNow
            });

            await context.SaveChangesAsync();

            var service = CreateService(context);
            var result = await service.MarkAsReadAsync(1, "user-1");

            Assert.False(result);
        }

        [Fact]
        public async Task MarkAsReadAsync_ShouldReturnFalse_WhenNotificationIsAlreadyRead()
        {
            using var context = CreateDbContext(nameof(MarkAsReadAsync_ShouldReturnFalse_WhenNotificationIsAlreadyRead));

            context.Users.Add(new ApplicationUser { Id = "user-1", UserName = "alice", FullName = "Alice" });

            context.Notifications.Add(new Notification
            {
                Id = 1, UserId = "user-1", SenderId = "user-1",
                Type = NotificationType.NewPost, Message = "msg",
                IsRead = true, CreatedAt = DateTime.UtcNow
            });

            await context.SaveChangesAsync();

            var service = CreateService(context);
            var result = await service.MarkAsReadAsync(1, "user-1");

            Assert.False(result);
        }

        [Fact]
        public async Task MarkAsReadAsync_ShouldMarkNotificationAsRead_WhenValid()
        {
            using var context = CreateDbContext(nameof(MarkAsReadAsync_ShouldMarkNotificationAsRead_WhenValid));

            context.Users.Add(new ApplicationUser { Id = "user-1", UserName = "alice", FullName = "Alice" });

            context.Notifications.Add(new Notification
            {
                Id = 1, UserId = "user-1", SenderId = "user-1",
                Type = NotificationType.NewPost, Message = "msg",
                IsRead = false, CreatedAt = DateTime.UtcNow
            });

            await context.SaveChangesAsync();

            var realtimeDispatcherMock = new Mock<IAppRealtimeDispatcher>();
            var service = CreateService(context, realtimeDispatcherMock);

            var result = await service.MarkAsReadAsync(1, "user-1");

            Assert.True(result);
            var notification = context.Notifications.First();
            Assert.True(notification.IsRead);
        }

        [Fact]
        public async Task MarkAsReadAsync_ShouldCallPushNotificationReadAsync_WhenSuccessful()
        {
            using var context = CreateDbContext(nameof(MarkAsReadAsync_ShouldCallPushNotificationReadAsync_WhenSuccessful));

            context.Users.Add(new ApplicationUser { Id = "user-1", UserName = "alice", FullName = "Alice" });

            context.Notifications.Add(new Notification
            {
                Id = 1, UserId = "user-1", SenderId = "user-1",
                Type = NotificationType.NewPost, Message = "msg",
                IsRead = false, CreatedAt = DateTime.UtcNow
            });

            await context.SaveChangesAsync();

            var realtimeDispatcherMock = new Mock<IAppRealtimeDispatcher>();
            var service = CreateService(context, realtimeDispatcherMock);

            await service.MarkAsReadAsync(1, "user-1");

            realtimeDispatcherMock.Verify(
                x => x.PushNotificationReadAsync("user-1", 1, It.IsAny<int>()),
                Times.Once);
        }

        // ── MarkAllAsReadAsync ───────────────────────────────────────────────

        [Fact]
        public async Task MarkAllAsReadAsync_ShouldReturnFalse_WhenUserHasNoUnreadNotifications()
        {
            using var context = CreateDbContext(nameof(MarkAllAsReadAsync_ShouldReturnFalse_WhenUserHasNoUnreadNotifications));

            context.Users.Add(new ApplicationUser { Id = "user-1", UserName = "alice", FullName = "Alice" });

            context.Notifications.Add(new Notification
            {
                Id = 1, UserId = "user-1", SenderId = "user-1",
                Type = NotificationType.NewPost, Message = "already read",
                IsRead = true, CreatedAt = DateTime.UtcNow
            });

            await context.SaveChangesAsync();

            var service = CreateService(context);
            var result = await service.MarkAllAsReadAsync("user-1");

            Assert.False(result);
        }

        [Fact]
        public async Task MarkAllAsReadAsync_ShouldReturnFalse_WhenUserHasNoNotificationsAtAll()
        {
            using var context = CreateDbContext(nameof(MarkAllAsReadAsync_ShouldReturnFalse_WhenUserHasNoNotificationsAtAll));
            var service = CreateService(context);

            var result = await service.MarkAllAsReadAsync("user-1");

            Assert.False(result);
        }

        [Fact]
        public async Task MarkAllAsReadAsync_ShouldMarkAllUnreadNotificationsAsRead()
        {
            using var context = CreateDbContext(nameof(MarkAllAsReadAsync_ShouldMarkAllUnreadNotificationsAsRead));

            context.Users.Add(new ApplicationUser { Id = "user-1", UserName = "alice", FullName = "Alice" });

            context.Notifications.AddRange(
                new Notification
                {
                    Id = 1, UserId = "user-1", SenderId = "user-1",
                    Type = NotificationType.NewPost, Message = "msg1",
                    IsRead = false, CreatedAt = DateTime.UtcNow
                },
                new Notification
                {
                    Id = 2, UserId = "user-1", SenderId = "user-1",
                    Type = NotificationType.NewPost, Message = "msg2",
                    IsRead = false, CreatedAt = DateTime.UtcNow
                },
                new Notification
                {
                    Id = 3, UserId = "user-1", SenderId = "user-1",
                    Type = NotificationType.NewPost, Message = "msg3",
                    IsRead = true, CreatedAt = DateTime.UtcNow
                }
            );

            await context.SaveChangesAsync();

            var realtimeDispatcherMock = new Mock<IAppRealtimeDispatcher>();
            var service = CreateService(context, realtimeDispatcherMock);

            var result = await service.MarkAllAsReadAsync("user-1");

            Assert.True(result);
            Assert.True(context.Notifications.All(n => n.IsRead));
        }

        [Fact]
        public async Task MarkAllAsReadAsync_ShouldCallPushNotificationsAllReadAsync_WhenSuccessful()
        {
            using var context = CreateDbContext(nameof(MarkAllAsReadAsync_ShouldCallPushNotificationsAllReadAsync_WhenSuccessful));

            context.Users.Add(new ApplicationUser { Id = "user-1", UserName = "alice", FullName = "Alice" });

            context.Notifications.Add(new Notification
            {
                Id = 1, UserId = "user-1", SenderId = "user-1",
                Type = NotificationType.NewPost, Message = "msg",
                IsRead = false, CreatedAt = DateTime.UtcNow
            });

            await context.SaveChangesAsync();

            var realtimeDispatcherMock = new Mock<IAppRealtimeDispatcher>();
            var service = CreateService(context, realtimeDispatcherMock);

            await service.MarkAllAsReadAsync("user-1");

            realtimeDispatcherMock.Verify(
                x => x.PushNotificationsAllReadAsync("user-1", 0),
                Times.Once);
        }

        [Fact]
        public async Task MarkAllAsReadAsync_ShouldOnlyAffectSpecificUser()
        {
            using var context = CreateDbContext(nameof(MarkAllAsReadAsync_ShouldOnlyAffectSpecificUser));

            context.Users.AddRange(
                new ApplicationUser { Id = "user-1", UserName = "alice", FullName = "Alice" },
                new ApplicationUser { Id = "user-2", UserName = "bob", FullName = "Bob" }
            );

            context.Notifications.AddRange(
                new Notification
                {
                    Id = 1, UserId = "user-1", SenderId = "user-1",
                    Type = NotificationType.NewPost, Message = "msg",
                    IsRead = false, CreatedAt = DateTime.UtcNow
                },
                new Notification
                {
                    Id = 2, UserId = "user-2", SenderId = "user-1",
                    Type = NotificationType.NewPost, Message = "msg2",
                    IsRead = false, CreatedAt = DateTime.UtcNow
                }
            );

            await context.SaveChangesAsync();

            var service = CreateService(context);
            await service.MarkAllAsReadAsync("user-1");

            var user2Notification = context.Notifications.First(n => n.UserId == "user-2");
            Assert.False(user2Notification.IsRead);
        }

        // ── CreateNotificationAsync – default message builder ────────────────

        [Theory]
        [InlineData(NotificationType.FriendRequestReceived, "Bob", "Bob đã gửi lời mời kết bạn")]
        [InlineData(NotificationType.FriendAccepted, "Bob", "Bob đã chấp nhận lời mời kết bạn của bạn")]
        [InlineData(NotificationType.PostLiked, "Bob", "Bob đã bày tỏ cảm xúc với bài viết của bạn")]
        [InlineData(NotificationType.PostCommented, "Bob", "Bob đã bình luận về bài viết của bạn")]
        [InlineData(NotificationType.NewPost, "Bob", "Bob đã đăng một bài viết mới")]
        [InlineData(NotificationType.NewStory, "Bob", "Bob đã đăng một story mới")]
        public async Task CreateNotificationAsync_ShouldBuildCorrectDefaultMessage_ForEachType(
            NotificationType type, string senderFullName, string expectedMessage)
        {
            var dbName = $"DefaultMsg_{type}_{Guid.NewGuid()}";
            using var context = CreateDbContext(dbName);

            context.Users.AddRange(
                new ApplicationUser { Id = "user-1", UserName = "alice", FullName = "Alice" },
                new ApplicationUser { Id = "user-2", UserName = "bob", FullName = senderFullName }
            );

            await context.SaveChangesAsync();

            var service = CreateService(context);

            var result = await service.CreateNotificationAsync(
                "user-1", "user-2", type, null);

            Assert.NotNull(result);
            Assert.Equal(expectedMessage, result!.Message);
        }

        [Fact]
        public async Task CreateNotificationAsync_ShouldCallPushNotificationCreatedAsync_OnSuccess()
        {
            using var context = CreateDbContext(nameof(CreateNotificationAsync_ShouldCallPushNotificationCreatedAsync_OnSuccess));

            context.Users.AddRange(
                new ApplicationUser { Id = "user-1", UserName = "alice", FullName = "Alice" },
                new ApplicationUser { Id = "user-2", UserName = "bob", FullName = "Bob" }
            );

            await context.SaveChangesAsync();

            var realtimeDispatcherMock = new Mock<IAppRealtimeDispatcher>();
            var service = CreateService(context, realtimeDispatcherMock);

            await service.CreateNotificationAsync("user-1", "user-2", NotificationType.NewPost);

            realtimeDispatcherMock.Verify(
                x => x.PushNotificationCreatedAsync(
                    "user-1",
                    It.IsAny<object>(),
                    It.IsAny<int>()),
                Times.Once);
        }

        [Fact]
public async Task CreateNotificationAsync_ShouldUseEmptyFullName_WhenFullNameIsEmpty()
{
    using var context = CreateDbContext(nameof(CreateNotificationAsync_ShouldUseEmptyFullName_WhenFullNameIsEmpty));

    context.Users.AddRange(
        new ApplicationUser
        {
            Id = "receiver",
            UserName = "receiver_user",
            FullName = "Receiver Name",
            IsActive = true
        },
        new ApplicationUser
        {
            Id = "sender",
            UserName = "bob_username",
            FullName = "", // phải là chuỗi rỗng, không được null
            IsActive = true
        });

    await context.SaveChangesAsync();

    var realtimeDispatcherMock = new Mock<IAppRealtimeDispatcher>();
    realtimeDispatcherMock
        .Setup(x => x.PushNotificationCreatedAsync(
            It.IsAny<string>(),
            It.IsAny<object>(),
            It.IsAny<int>()))
        .Returns(Task.CompletedTask);

    var service = new NotificationService(context, realtimeDispatcherMock.Object);

    var result = await service.CreateNotificationAsync(
        "receiver",
        "sender",
        NotificationType.NewPost);

    Assert.NotNull(result);
    Assert.Equal(" đã đăng một bài viết mới", result!.Message);
}

        [Fact]
        public async Task CreateNotificationAsync_ShouldReturnNotificationWithIsReadFalse()
        {
            using var context = CreateDbContext(nameof(CreateNotificationAsync_ShouldReturnNotificationWithIsReadFalse));

            context.Users.AddRange(
                new ApplicationUser { Id = "user-1", UserName = "alice", FullName = "Alice" },
                new ApplicationUser { Id = "user-2", UserName = "bob", FullName = "Bob" }
            );

            await context.SaveChangesAsync();

            var service = CreateService(context);

            var result = await service.CreateNotificationAsync(
                "user-1", "user-2", NotificationType.NewPost);

            Assert.NotNull(result);
            Assert.False(result!.IsRead);
        }
    }
}
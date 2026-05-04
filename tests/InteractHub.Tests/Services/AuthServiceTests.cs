using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using InteractHub.Core.Entities;
using InteractHub.Core.Interfaces;
using InteractHub.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Moq;
using Xunit;

namespace InteractHub.Tests.Services
{
    public class AuthServiceTests
    {
        private static Mock<UserManager<ApplicationUser>> CreateUserManagerMock()
        {
            var store = new Mock<IUserStore<ApplicationUser>>();
            return new Mock<UserManager<ApplicationUser>>(
                store.Object, null!, null!, null!, null!, null!, null!, null!, null!);
        }

        private static AuthService CreateService(
            Mock<UserManager<ApplicationUser>>? userManagerMock = null,
            Mock<IJwtService>? jwtServiceMock = null)
        {
            userManagerMock ??= CreateUserManagerMock();
            jwtServiceMock ??= new Mock<IJwtService>();

            return new AuthService(userManagerMock.Object, jwtServiceMock.Object);
        }

        [Fact]
        public async Task RegisterAsync_ShouldReturnTokenUserNameAndEmail_WhenRegistrationSucceeds()
        {
            var userManagerMock = CreateUserManagerMock();
            var jwtServiceMock = new Mock<IJwtService>();
            const string testToken = "test-token-123";

            userManagerMock
                .Setup(x => x.CreateAsync(It.IsAny<ApplicationUser>(), It.IsAny<string>()))
                .ReturnsAsync(IdentityResult.Success);

            userManagerMock
                .Setup(x => x.AddToRoleAsync(It.IsAny<ApplicationUser>(), It.IsAny<string>()))
                .ReturnsAsync(IdentityResult.Success);

            userManagerMock
                .Setup(x => x.GetRolesAsync(It.IsAny<ApplicationUser>()))
                .ReturnsAsync(new List<string> { "User" });

            jwtServiceMock
                .Setup(x => x.GenerateToken(It.IsAny<ApplicationUser>(), It.IsAny<IList<string>>()))
                .Returns(testToken);

            var service = new AuthService(userManagerMock.Object, jwtServiceMock.Object);

            var result = await service.RegisterAsync("johndoe", "john@test.com", "John Doe", "password123");

            Assert.Equal(testToken, result.Token);
            Assert.Equal("johndoe", result.UserName);
            Assert.Equal("john@test.com", result.Email);
        }

        [Fact]
        public async Task RegisterAsync_ShouldThrowException_WhenCreateAsyncFails()
        {
            var userManagerMock = CreateUserManagerMock();
            var jwtServiceMock = new Mock<IJwtService>();

            var identityError = new IdentityError { Code = "DuplicateUserName", Description = "Username already exists" };
            var failedResult = IdentityResult.Failed(identityError);

            userManagerMock
                .Setup(x => x.CreateAsync(It.IsAny<ApplicationUser>(), It.IsAny<string>()))
                .ReturnsAsync(failedResult);

            var service = new AuthService(userManagerMock.Object, jwtServiceMock.Object);

            var exception = await Assert.ThrowsAsync<Exception>(() =>
                service.RegisterAsync("johndoe", "john@test.com", "John Doe", "password123"));

            Assert.Contains("Username already exists", exception.Message);
        }

        [Fact]
        public async Task RegisterAsync_ShouldAssignUserRoleByDefault()
        {
            var userManagerMock = CreateUserManagerMock();
            var jwtServiceMock = new Mock<IJwtService>();

            ApplicationUser? createdUser = null;

            userManagerMock
                .Setup(x => x.CreateAsync(It.IsAny<ApplicationUser>(), It.IsAny<string>()))
                .Callback<ApplicationUser, string>((user, password) => { createdUser = user; })
                .ReturnsAsync(IdentityResult.Success);

            userManagerMock
                .Setup(x => x.AddToRoleAsync(It.IsAny<ApplicationUser>(), "User"))
                .ReturnsAsync(IdentityResult.Success);

            userManagerMock
                .Setup(x => x.GetRolesAsync(It.IsAny<ApplicationUser>()))
                .ReturnsAsync(new List<string> { "User" });

            jwtServiceMock
                .Setup(x => x.GenerateToken(It.IsAny<ApplicationUser>(), It.IsAny<IList<string>>()))
                .Returns("token");

            var service = new AuthService(userManagerMock.Object, jwtServiceMock.Object);

            await service.RegisterAsync("alice", "alice@test.com", "Alice", "pwd123");

            userManagerMock.Verify(
                x => x.AddToRoleAsync(It.IsAny<ApplicationUser>(), "User"),
                Times.Once);
        }

        [Fact]
        public async Task LoginAsync_ShouldReturnTokenUserNameAndEmail_WhenCredentialsAreValid()
        {
            var userManagerMock = CreateUserManagerMock();
            var jwtServiceMock = new Mock<IJwtService>();
            const string testToken = "login-token-456";

            var testUser = new ApplicationUser
            {
                Id = "user-1",
                UserName = "johndoe",
                Email = "john@test.com"
            };

            userManagerMock
                .Setup(x => x.FindByNameAsync("johndoe"))
                .ReturnsAsync(testUser);

            userManagerMock
                .Setup(x => x.CheckPasswordAsync(testUser, "password123"))
                .ReturnsAsync(true);

            userManagerMock
                .Setup(x => x.GetRolesAsync(testUser))
                .ReturnsAsync(new List<string> { "User" });

            jwtServiceMock
                .Setup(x => x.GenerateToken(testUser, It.IsAny<IList<string>>()))
                .Returns(testToken);

            var service = new AuthService(userManagerMock.Object, jwtServiceMock.Object);

            var result = await service.LoginAsync("johndoe", "password123");

            Assert.Equal(testToken, result.Token);
            Assert.Equal("johndoe", result.UserName);
            Assert.Equal("john@test.com", result.Email);
        }

        [Fact]
        public async Task LoginAsync_ShouldThrowException_WhenUserNotFound()
        {
            var userManagerMock = CreateUserManagerMock();
            var jwtServiceMock = new Mock<IJwtService>();

            userManagerMock
                .Setup(x => x.FindByNameAsync("nonexistent"))
                .ReturnsAsync((ApplicationUser?)null);

            var service = new AuthService(userManagerMock.Object, jwtServiceMock.Object);

            var exception = await Assert.ThrowsAsync<Exception>(() =>
                service.LoginAsync("nonexistent", "password123"));

            Assert.Contains("Sai username hoặc password", exception.Message);
        }

        [Fact]
        public async Task LoginAsync_ShouldThrowException_WhenPasswordIsIncorrect()
        {
            var userManagerMock = CreateUserManagerMock();
            var jwtServiceMock = new Mock<IJwtService>();

            var testUser = new ApplicationUser
            {
                Id = "user-1",
                UserName = "johndoe",
                Email = "john@test.com"
            };

            userManagerMock
                .Setup(x => x.FindByNameAsync("johndoe"))
                .ReturnsAsync(testUser);

            userManagerMock
                .Setup(x => x.CheckPasswordAsync(testUser, "wrongpassword"))
                .ReturnsAsync(false);

            var service = new AuthService(userManagerMock.Object, jwtServiceMock.Object);

            var exception = await Assert.ThrowsAsync<Exception>(() =>
                service.LoginAsync("johndoe", "wrongpassword"));

            Assert.Contains("Sai username hoặc password", exception.Message);
        }

        [Fact]
        public async Task LoginAsync_ShouldCallGetRolesAsync_WhenUserIsAuthenticated()
        {
            var userManagerMock = CreateUserManagerMock();
            var jwtServiceMock = new Mock<IJwtService>();

            var testUser = new ApplicationUser
            {
                Id = "user-1",
                UserName = "johndoe",
                Email = "john@test.com"
            };

            userManagerMock
                .Setup(x => x.FindByNameAsync("johndoe"))
                .ReturnsAsync(testUser);

            userManagerMock
                .Setup(x => x.CheckPasswordAsync(testUser, "password123"))
                .ReturnsAsync(true);

            userManagerMock
                .Setup(x => x.GetRolesAsync(testUser))
                .ReturnsAsync(new List<string> { "User", "Admin" });

            jwtServiceMock
                .Setup(x => x.GenerateToken(It.IsAny<ApplicationUser>(), It.IsAny<IList<string>>()))
                .Returns("token");

            var service = new AuthService(userManagerMock.Object, jwtServiceMock.Object);

            await service.LoginAsync("johndoe", "password123");

            userManagerMock.Verify(
                x => x.GetRolesAsync(testUser),
                Times.Once);
        }
    }
}

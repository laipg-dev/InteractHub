namespace InteractHub.Core.Interfaces;

public interface IAuthService
{
    Task<(string Token, string UserName, string Email)> RegisterAsync(
        string userName,
        string email,
        string fullName,
        string password);

    Task<(string Token, string UserName, string Email)> LoginAsync(
        string userName,
        string password);
}
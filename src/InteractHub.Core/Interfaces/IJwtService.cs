using InteractHub.Core.Entities;

namespace InteractHub.Core.Interfaces;

public interface IJwtService
{
    
    string GenerateToken(ApplicationUser user, IList<string> roles);
}
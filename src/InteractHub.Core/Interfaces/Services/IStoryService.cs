namespace InteractHub.Infrastructure.Services;

public interface IStoryService
{
    // Tạo Story mới
    Task<bool> CreateStoryAsync(string userId, string imageUrl);
    
    // Xóa Story (Xóa mềm - Soft Delete)
    Task<bool> DeleteStoryAsync(int storyId, string userId);
    
    // Lấy danh sách Story còn hạn của bản thân và bạn bè
    Task<List<StoryGroupDto>> GetActiveStoriesAsync(string currentUserId);
}
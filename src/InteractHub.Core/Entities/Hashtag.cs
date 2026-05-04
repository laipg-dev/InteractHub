namespace InteractHub.Core.Entities;

public class Hashtag
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    // Quan hệ nhiều-nhiều với bài đăng
    public virtual ICollection<Post> Posts { get; set; } = new List<Post>();
}
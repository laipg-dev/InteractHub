using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using InteractHub.Core.Entities;
using Microsoft.AspNetCore.Identity;

namespace InteractHub.Infrastructure.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<Post> Posts { get; set; } = null!;
    public DbSet<Comment> Comments { get; set; } = null!;
    public DbSet<Like> Likes { get; set; } = null!;
    public DbSet<Friendship> Friendships { get; set; } = null!;
    public DbSet<Story> Stories { get; set; } = null!;
    public DbSet<Notification> Notifications { get; set; } = null!;
    public DbSet<Hashtag> Hashtags { get; set; } = null!;
    
    // Thêm 2 bảng Report
    public DbSet<PostReport> PostReports { get; set; } = null!;
    public DbSet<PostReportSummary> PostReportSummaries { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // --- 1. GLOBAL QUERY FILTERS (SOFT DELETE) ---
        builder.Entity<Post>().HasQueryFilter(p => !p.IsDeleted);
        builder.Entity<Comment>().HasQueryFilter(c => !c.IsDeleted);
        builder.Entity<Story>().HasQueryFilter(s => !s.IsDeleted);
        builder.Entity<Like>().HasQueryFilter(l => !l.IsDeleted);
        builder.Entity<ApplicationUser>().HasQueryFilter(u => u.IsActive);

        builder.Entity<IdentityRole>().HasData(
            new IdentityRole
            {
                Id = "1", // hoặc Guid cố định: "d3f1a8c2-1234-5678-9abc-def123456789"
                Name = "Admin",
                NormalizedName = "ADMIN",
                ConcurrencyStamp = "a1111111-b222-3333-c444-555555555555"
            },
            new IdentityRole
            {
                Id = "2",
                Name = "User",
                NormalizedName = "USER",
                ConcurrencyStamp = "b1111111-b222-3333-c444-555555555555"
            }
        );

        builder.Entity<Story>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.HasOne(s => s.User)
                  .WithMany(u => u.Stories)
                  .HasForeignKey(s => s.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // --- 2. CẤU HÌNH FRIENDSHIP ---
        builder.Entity<Friendship>(entity =>
        {
            entity.HasKey(f => new { f.UserId, f.FriendId });

            entity.HasOne(f => f.User)
                .WithMany(u => u.SentFriendRequests)
                .HasForeignKey(f => f.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(f => f.Friend)
                .WithMany(u => u.ReceivedFriendRequests)
                .HasForeignKey(f => f.FriendId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // --- 3. CẤU HÌNH LIKE ---
        builder.Entity<Like>(entity =>
        {
            entity.HasKey(l => l.Id);
            entity.HasOne(l => l.Post)
                  .WithMany(p => p.Likes)
                  .HasForeignKey(l => l.PostId)
                  .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(l => l.User)
                  .WithMany(u => u.Likes)
                  .HasForeignKey(l => l.UserId)
                  .OnDelete(DeleteBehavior.NoAction);
        });

        // --- 4. CẤU HÌNH COMMENT ---
        builder.Entity<Comment>(entity =>
        {
            entity.HasOne(c => c.Post)
                .WithMany(p => p.Comments)
                .HasForeignKey(c => c.PostId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(c => c.User)
                .WithMany()
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // --- 5. CẤU HÌNH HASHTAG ---
        builder.Entity<Post>()
            .HasMany(p => p.Hashtags)
            .WithMany(h => h.Posts)
            .UsingEntity<Dictionary<string, object>>(
                "PostHashtags",
                j => j.HasOne<Hashtag>().WithMany().HasForeignKey("HashtagId"),
                j => j.HasOne<Post>().WithMany().HasForeignKey("PostId")
            );

        // --- 6. CẤU HÌNH REPORT & SUMMARY ---
        builder.Entity<PostReport>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.HasOne(r => r.Post)
                .WithMany()
                .HasForeignKey(r => r.PostId)
                .OnDelete(DeleteBehavior.NoAction); // Tránh lỗi cascade do Post đã có nhiều liên kết
            entity.HasOne(r => r.Reporter)
                .WithMany() 
                .HasForeignKey(r => r.ReporterId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<PostReportSummary>(entity =>
        {
            // Set PostId làm khóa chính luôn (quan hệ 1-1 với Post)
            entity.HasKey(rs => rs.PostId); 
            
            entity.HasOne(rs => rs.Post)
                  .WithOne() // Không cần khai báo thuộc tính Summary trong class Post để tránh rối
                  .HasForeignKey<PostReportSummary>(rs => rs.PostId)
                  .OnDelete(DeleteBehavior.Cascade); // Nếu Admin xóa vĩnh viễn bài viết, xóa luôn bảng thống kê
        });
        // --- 7. CẤU HÌNH NOTIFICATION ---
        builder.Entity<Notification>(entity =>
        {
            entity.HasKey(n => n.Id);

            // Quan hệ với User nhận thông báo
            entity.HasOne(n => n.User)
                .WithMany(u => u.Notifications)
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Quan hệ với người gửi (Sender)
            entity.HasOne(n => n.Sender)
                .WithMany()
                .HasForeignKey(n => n.SenderId)
                .OnDelete(DeleteBehavior.NoAction);

            // Quan hệ với các thực thể liên quan (Post, Comment, Story)
            entity.HasOne(n => n.Post)
                .WithMany()
                .HasForeignKey(n => n.PostId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(n => n.Comment)
                .WithMany()
                .HasForeignKey(n => n.CommentId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(n => n.Story)
                .WithMany()
                .HasForeignKey(n => n.StoryId)
                .OnDelete(DeleteBehavior.NoAction);
        });
    }
}

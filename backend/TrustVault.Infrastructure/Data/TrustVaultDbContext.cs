using Microsoft.EntityFrameworkCore;
using TrustVault.Core.Entities;

namespace TrustVault.Infrastructure.Data;

public class TrustVaultDbContext : DbContext
{
    public TrustVaultDbContext(DbContextOptions<TrustVaultDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<DocumentPermission> DocumentPermissions => Set<DocumentPermission>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<UserTag> UserTags => Set<UserTag>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User Configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.HasIndex(u => u.Email).IsUnique();
            entity.HasIndex(u => u.Username).IsUnique();
            entity.Property(u => u.Email).HasMaxLength(256).IsRequired();
            entity.Property(u => u.Username).HasMaxLength(100).IsRequired();
            entity.Property(u => u.Role).HasConversion<int>();
        });

        // Document Configuration
        modelBuilder.Entity<Document>(entity =>
        {
            entity.HasKey(d => d.Id);
            entity.HasIndex(d => d.OwnerId);
            entity.HasIndex(d => d.Category);
            entity.HasIndex(d => d.CreatedAt);
            entity.Property(d => d.Title).HasMaxLength(256).IsRequired();
            entity.Property(d => d.OriginalFileName).HasMaxLength(256).IsRequired();
            entity.Property(d => d.StorageFileName).HasMaxLength(256).IsRequired();

            entity.HasOne(d => d.Owner)
                .WithMany(u => u.OwnedDocuments)
                .HasForeignKey(d => d.OwnerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // DocumentPermission Configuration (Enforces 1 permission entry per document per user)
        modelBuilder.Entity<DocumentPermission>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.HasIndex(p => new { p.DocumentId, p.UserId }).IsUnique();
            entity.Property(p => p.Level).HasConversion<int>();

            entity.HasOne(p => p.Document)
                .WithMany(d => d.Permissions)
                .HasForeignKey(p => p.DocumentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(p => p.User)
                .WithMany(u => u.ReceivedPermissions)
                .HasForeignKey(p => p.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(p => p.GrantedByUser)
                .WithMany(u => u.GrantedPermissions)
                .HasForeignKey(p => p.GrantedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // AuditLog Configuration (Append-Only, Hash Chained)
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Id).ValueGeneratedOnAdd();
            entity.HasIndex(a => a.Timestamp);
            entity.HasIndex(a => a.DocumentId);
            entity.HasIndex(a => a.UserId);
            entity.Property(a => a.Action).HasConversion<int>();
            entity.Property(a => a.Status).HasConversion<int>();
            entity.Property(a => a.PreviousHash).HasMaxLength(64).IsRequired();
            entity.Property(a => a.CurrentHash).HasMaxLength(64).IsRequired();

            entity.HasOne(a => a.User)
                .WithMany(u => u.AuditLogs)
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(a => a.Document)
                .WithMany(d => d.AuditLogs)
                .HasForeignKey(a => a.DocumentId)
                .OnDelete(DeleteBehavior.SetNull); // Never delete audit logs even if doc is removed
        });

        // UserTag Configuration (Owner-scoped user tagging)
        modelBuilder.Entity<UserTag>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.HasIndex(t => new { t.OwnerId, t.UserId, t.TagName }).IsUnique();
            entity.Property(t => t.TagName).HasMaxLength(50).IsRequired();

            entity.HasOne(t => t.Owner)
                .WithMany()
                .HasForeignKey(t => t.OwnerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(t => t.User)
                .WithMany()
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}

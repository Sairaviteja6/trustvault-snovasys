using TrustVault.Core.Entities;
using TrustVault.Core.Enums;
using TrustVault.Core.Interfaces;

namespace TrustVault.Infrastructure.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(TrustVaultDbContext context, IAuditService auditService, IEncryptionService encryptionService)
    {
        if (context.Users.Any())
        {
            return; // Already seeded
        }

        // 1. Seed Default Users
        var admin = new User
        {
            Username = "admin",
            Email = "admin@trustvault.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@12345!"),
            Role = UserRole.Admin,
            Department = "IT Security",
            CreatedAt = DateTime.UtcNow
        };

        var owner = new User
        {
            Username = "document_owner",
            Email = "owner@trustvault.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Owner@12345!"),
            Role = UserRole.Owner,
            Department = "Corporate Legal & HR",
            CreatedAt = DateTime.UtcNow
        };

        var alice = new User
        {
            Username = "alice_viewer",
            Email = "alice@trustvault.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Viewer@12345!"),
            Role = UserRole.Viewer,
            Department = "Finance",
            CreatedAt = DateTime.UtcNow
        };

        var bob = new User
        {
            Username = "bob_viewer",
            Email = "bob@trustvault.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Viewer@12345!"),
            Role = UserRole.Viewer,
            Department = "Engineering",
            CreatedAt = DateTime.UtcNow
        };

        context.Users.AddRange(admin, owner, alice, bob);
        await context.SaveChangesAsync();

        // 2. Seed User Tags for Owner
        var tagFinance = new UserTag { OwnerId = owner.Id, UserId = alice.Id, TagName = "Finance" };
        var tagDev = new UserTag { OwnerId = owner.Id, UserId = bob.Id, TagName = "Developer" };
        context.UserTags.AddRange(tagFinance, tagDev);

        // 3. Seed Sample Documents
        var doc1 = new Document
        {
            Title = "2026 Executive Compensation & Salary Matrix",
            Description = "Highly confidential compensation data for executive leadership.",
            Category = "Salary",
            OriginalFileName = "Executive_Comp_2026.pdf",
            StorageFileName = $"{Guid.NewGuid():N}.blob",
            ContentType = "application/pdf",
            FileSizeBytes = 1024 * 45,
            FileHashSha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            EncryptionIv = new byte[12],
            EncryptionTag = new byte[16],
            OwnerId = owner.Id,
            CreatedAt = DateTime.UtcNow.AddDays(-2)
        };

        var doc2 = new Document
        {
            Title = "Enterprise Master Services Agreement — Acme Corp",
            Description = "Standard commercial terms and NDA for Acme Corp.",
            Category = "Contracts",
            OriginalFileName = "AcmeCorp_MSA_Final.pdf",
            StorageFileName = $"{Guid.NewGuid():N}.blob",
            ContentType = "application/pdf",
            FileSizeBytes = 1024 * 128,
            FileHashSha256 = "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
            EncryptionIv = new byte[12],
            EncryptionTag = new byte[16],
            OwnerId = owner.Id,
            CreatedAt = DateTime.UtcNow.AddDays(-1)
        };

        context.Documents.AddRange(doc1, doc2);
        await context.SaveChangesAsync();

        // 4. Seed Permissions: Grant Alice READ on doc2 (MSA)
        var permAlice = new DocumentPermission
        {
            DocumentId = doc2.Id,
            UserId = alice.Id,
            Level = PermissionLevel.Read,
            GrantedByUserId = owner.Id,
            GrantedAt = DateTime.UtcNow.AddDays(-1)
        };

        context.DocumentPermissions.Add(permAlice);
        await context.SaveChangesAsync();

        // 5. Seed Initial Audit Logs with Cryptographic Hash Chain
        await auditService.LogAsync(
            AuditAction.UserRegistered,
            AuditStatus.Allowed,
            admin.Id,
            admin.Email,
            admin.Role.ToString(),
            null,
            null,
            "127.0.0.1",
            "SeedService",
            "Initial system administrator seeded");

        await auditService.LogAsync(
            AuditAction.DocumentUpload,
            AuditStatus.Allowed,
            owner.Id,
            owner.Email,
            owner.Role.ToString(),
            doc1.Id,
            doc1.Title,
            "127.0.0.1",
            "SeedService",
            "Confidential document uploaded by owner");

        await auditService.LogAsync(
            AuditAction.PermissionGranted,
            AuditStatus.Allowed,
            owner.Id,
            owner.Email,
            owner.Role.ToString(),
            doc2.Id,
            doc2.Title,
            "127.0.0.1",
            "SeedService",
            $"Granted READ access to {alice.Email}");
    }
}

using TrustVault.Core.Entities;
using TrustVault.Core.Enums;
using TrustVault.Core.Interfaces;

namespace TrustVault.Infrastructure.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(TrustVaultDbContext context, IAuditService auditService, IEncryptionService encryptionService, string storageDirectory)
    {
        if (context.Users.Any())
        {
            return; // Already seeded
        }

        if (!Directory.Exists(storageDirectory))
        {
            Directory.CreateDirectory(storageDirectory);
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

        // 3. Helper to create encrypted mock documents on disk
        async Task<(string storageName, byte[] iv, byte[] tag, string hash, long size)> CreateEncryptedMockFileAsync(string contentText)
        {
            var rawBytes = System.Text.Encoding.UTF8.GetBytes(contentText);
            using var rawStream = new MemoryStream(rawBytes);
            var hash = await encryptionService.ComputeSha256Async(rawStream);

            rawStream.Position = 0;
            var storageFileName = $"{Guid.NewGuid():N}.blob";
            var filePath = Path.Combine(storageDirectory, storageFileName);

            using var fileStream = new FileStream(filePath, FileMode.CreateNew, FileAccess.Write);
            var (iv, tag) = await encryptionService.EncryptAsync(rawStream, fileStream);

            return (storageFileName, iv, tag, hash, rawBytes.Length);
        }

        // Mock Document 1: Highly confidential salary schedule (Owner only)
        var file1 = await CreateEncryptedMockFileAsync("%PDF-1.4 Confidential 2026 Executive Compensation Schedule. Base, Stock Grants & Executive Bonus Metrics.");
        var doc1 = new Document
        {
            Title = "2026 Executive Compensation & Salary Matrix",
            Description = "Highly confidential compensation data for executive leadership.",
            Category = "Salary",
            OriginalFileName = "Executive_Comp_2026.pdf",
            StorageFileName = file1.storageName,
            ContentType = "application/pdf",
            FileSizeBytes = file1.size,
            FileHashSha256 = file1.hash,
            EncryptionIv = file1.iv,
            EncryptionTag = file1.tag,
            OwnerId = owner.Id,
            CreatedAt = DateTime.UtcNow.AddDays(-2)
        };

        // Mock Document 2: Master Service Agreement (Owner grants Alice READ and DOWNLOAD)
        var file2 = await CreateEncryptedMockFileAsync("%PDF-1.4 Enterprise Master Services Agreement with Acme Corp. Legal Terms, SLA and Payment Schedules.");
        var doc2 = new Document
        {
            Title = "Enterprise Master Services Agreement — Acme Corp",
            Description = "Standard commercial terms and NDA for Acme Corp.",
            Category = "Contracts",
            OriginalFileName = "AcmeCorp_MSA_Final.pdf",
            StorageFileName = file2.storageName,
            ContentType = "application/pdf",
            FileSizeBytes = file2.size,
            FileHashSha256 = file2.hash,
            EncryptionIv = file2.iv,
            EncryptionTag = file2.tag,
            OwnerId = owner.Id,
            CreatedAt = DateTime.UtcNow.AddDays(-1)
        };

        context.Documents.AddRange(doc1, doc2);
        await context.SaveChangesAsync();

        // 4. Seed Grants: Grant Alice READ and DOWNLOAD on doc2
        var grantRead = new DocumentGrant
        {
            DocumentId = doc2.Id,
            UserId = alice.Id,
            PermissionType = PermissionType.Read,
            GrantedByUserId = owner.Id,
            CreatedAtUtc = DateTime.UtcNow.AddDays(-1)
        };

        var grantDownload = new DocumentGrant
        {
            DocumentId = doc2.Id,
            UserId = alice.Id,
            PermissionType = PermissionType.Download,
            GrantedByUserId = owner.Id,
            CreatedAtUtc = DateTime.UtcNow.AddDays(-1)
        };

        context.DocumentGrants.AddRange(grantRead, grantDownload);
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
            "SystemSeeder",
            "Initial administrator provisioned");

        await auditService.LogAsync(
            AuditAction.DocumentUpload,
            AuditStatus.Allowed,
            owner.Id,
            owner.Email,
            owner.Role.ToString(),
            doc1.Id,
            doc1.Title,
            "127.0.0.1",
            "SystemSeeder",
            "Confidential salary matrix uploaded and encrypted with AES-256-GCM");

        await auditService.LogAsync(
            AuditAction.PermissionGranted,
            AuditStatus.Allowed,
            owner.Id,
            owner.Email,
            owner.Role.ToString(),
            doc2.Id,
            doc2.Title,
            "127.0.0.1",
            "SystemSeeder",
            $"Granted READ and DOWNLOAD access to {alice.Email}");
    }
}

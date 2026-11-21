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

        // 1. Seed Core Personas for Immediate Frictionless Evaluation
        var admin = new User
        {
            Username = "admin",
            Email = "admin@trustvault.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@12345!"),
            Role = UserRole.Admin,
            IsMasterAdmin = true,
            Department = "IT Security & Compliance",
            MustChangePassword = false,
            CreatedAt = DateTime.UtcNow
        };

        var owner = new User
        {
            Username = "document_owner",
            Email = "owner@trustvault.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Owner@12345!"),
            Role = UserRole.Owner,
            Department = "Corporate Legal",
            MustChangePassword = false,
            CreatedAt = DateTime.UtcNow
        };

        var alice = new User
        {
            Username = "alice_viewer",
            Email = "alice@trustvault.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Viewer@12345!"),
            Role = UserRole.Viewer,
            Department = "Finance",
            MustChangePassword = false,
            CreatedAt = DateTime.UtcNow
        };

        var bob = new User
        {
            Username = "bob_viewer",
            Email = "bob@trustvault.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Viewer@12345!"),
            Role = UserRole.Viewer,
            Department = "Engineering",
            MustChangePassword = false,
            CreatedAt = DateTime.UtcNow
        };

        context.Users.AddRange(admin, owner, alice, bob);
        await context.SaveChangesAsync();

        // 2. Seed User Tags for Bulk Permissions
        var tagFinance = new UserTag { OwnerId = owner.Id, UserId = alice.Id, TagName = "Finance" };
        var tagEngineering = new UserTag { OwnerId = owner.Id, UserId = bob.Id, TagName = "Engineering" };
        context.UserTags.AddRange(tagFinance, tagEngineering);
        await context.SaveChangesAsync();

        // 3. Helper to create genuine encrypted blobs on disk
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

        // Mock Document 1: Highly Confidential Compensation Matrix (Owner Only)
        var file1 = await CreateEncryptedMockFileAsync(
            "%PDF-1.4\nConfidential 2026 Executive Compensation Schedule.\n" +
            "Base Salaries, Equity Grants & Performance Bonus Targets.\n" +
            "Strictly restricted: Unauthorized inspection prohibited.");

        var doc1 = new Document
        {
            Title = "2026 Executive Compensation Matrix",
            Description = "Confidential executive leadership compensation schedule.",
            Category = "Salary",
            OriginalFileName = "Executive_Compensation_2026.pdf",
            StorageFileName = file1.storageName,
            ContentType = "application/pdf",
            FileSizeBytes = file1.size,
            FileHashSha256 = file1.hash,
            EncryptionIv = file1.iv,
            EncryptionTag = file1.tag,
            OwnerId = owner.Id,
            CreatedAt = DateTime.UtcNow.AddDays(-2)
        };

        // Mock Document 2: Master Services Agreement (Owner Grants Read + Download to Alice)
        var file2 = await CreateEncryptedMockFileAsync(
            "%PDF-1.4\nEnterprise Master Services Agreement — Acme Corp.\n" +
            "Commercial Terms, Non-Disclosure Invariants, and SLA Guarantees.\n" +
            "Granted to Finance Department (Alice) for commercial review.");

        var doc2 = new Document
        {
            Title = "Enterprise Master Services Agreement — Acme Corp",
            Description = "Commercial MSA contract and NDA terms with Acme Corp.",
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

        // 4. Initial Snapshots for Document Versioning
        context.DocumentSnapshots.AddRange(
            new DocumentSnapshot
            {
                DocumentId = doc1.Id,
                VersionNumber = 1,
                StorageFileName = file1.storageName,
                EncryptionIv = file1.iv,
                EncryptionTag = file1.tag,
                FileSizeBytes = file1.size,
                FileHashSha256 = file1.hash,
                EditedByUserId = owner.Id,
                EditedByUserEmail = owner.Email,
                EditedByRole = "Owner",
                ChangeSummary = "Initial Document Upload",
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            },
            new DocumentSnapshot
            {
                DocumentId = doc2.Id,
                VersionNumber = 1,
                StorageFileName = file2.storageName,
                EncryptionIv = file2.iv,
                EncryptionTag = file2.tag,
                FileSizeBytes = file2.size,
                FileHashSha256 = file2.hash,
                EditedByUserId = owner.Id,
                EditedByUserEmail = owner.Email,
                EditedByRole = "Owner",
                ChangeSummary = "Initial Document Upload",
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            }
        );

        // 5. Seed Discrete Grants: Alice has READ and DOWNLOAD on Document 2 (Acme MSA)
        context.DocumentGrants.AddRange(
            new DocumentGrant
            {
                DocumentId = doc2.Id,
                UserId = alice.Id,
                PermissionType = PermissionType.Read,
                GrantedByUserId = owner.Id,
                CreatedAtUtc = DateTime.UtcNow.AddDays(-1)
            },
            new DocumentGrant
            {
                DocumentId = doc2.Id,
                UserId = alice.Id,
                PermissionType = PermissionType.Download,
                GrantedByUserId = owner.Id,
                CreatedAtUtc = DateTime.UtcNow.AddDays(-1)
            }
        );
        await context.SaveChangesAsync();

        // 6. Cryptographically Hash-Chained Audit Log Trail
        await auditService.LogAsync(
            AuditAction.UserRegistered,
            AuditStatus.Allowed,
            admin.Id,
            admin.Email,
            "Admin",
            null,
            null,
            "127.0.0.1",
            "SystemSeeder",
            "Genesis Administrator account initialized.");

        await auditService.LogAsync(
            AuditAction.DocumentUpload,
            AuditStatus.Allowed,
            owner.Id,
            owner.Email,
            "Owner",
            doc1.Id,
            doc1.Title,
            "127.0.0.1",
            "SystemSeeder",
            "Confidential salary matrix uploaded (AES-256-GCM encrypted blob).");

        await auditService.LogAsync(
            AuditAction.DocumentUpload,
            AuditStatus.Allowed,
            owner.Id,
            owner.Email,
            "Owner",
            doc2.Id,
            doc2.Title,
            "127.0.0.1",
            "SystemSeeder",
            "Enterprise Master Services Agreement uploaded.");

        await auditService.LogAsync(
            AuditAction.PermissionGranted,
            AuditStatus.Allowed,
            owner.Id,
            owner.Email,
            "Owner",
            doc2.Id,
            doc2.Title,
            "127.0.0.1",
            "SystemSeeder",
            $"Explicit Read & Download permissions granted to {alice.Email}.");
    }
}

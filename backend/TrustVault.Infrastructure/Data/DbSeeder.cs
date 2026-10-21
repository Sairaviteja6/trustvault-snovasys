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

        // Only the initial Administrator is present out-of-the-box
        var admin = new User
        {
            Username = "admin",
            Email = "admin@trustvault.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@12345!"),
            Role = UserRole.Admin,
            IsMasterAdmin = true,
            Department = "IT Security",
            CreatedAt = DateTime.UtcNow
        };

        context.Users.Add(admin);
        await context.SaveChangesAsync();

        // Seed Genesis Audit Log entry for Admin registration
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
            "Initial root Administrator provisioned. All subsequent Owners and Viewers to be provisioned via role hierarchy.");
    }
}

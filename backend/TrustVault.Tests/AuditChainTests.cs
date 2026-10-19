using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TrustVault.Core.Enums;
using TrustVault.Infrastructure.Data;
using TrustVault.Infrastructure.Services;
using Xunit;

namespace TrustVault.Tests;

public class AuditChainTests
{
    private TrustVaultDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<TrustVaultDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new TrustVaultDbContext(options);
    }

    [Fact]
    public async Task AuditChain_SequentialLogs_ShouldPassIntegrityVerification()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var auditService = new AuditService(context);

        // Act - Log several operations
        await auditService.LogAsync(AuditAction.UserLogin, AuditStatus.Allowed, Guid.NewGuid(), "alice@trustvault.com", "Owner", null, null, "192.168.1.1", "Chrome");
        await auditService.LogAsync(AuditAction.DocumentUpload, AuditStatus.Allowed, Guid.NewGuid(), "alice@trustvault.com", "Owner", Guid.NewGuid(), "Q3_Report.pdf", "192.168.1.1", "Chrome");
        await auditService.LogAsync(AuditAction.PermissionGranted, AuditStatus.Allowed, Guid.NewGuid(), "alice@trustvault.com", "Owner", Guid.NewGuid(), "Q3_Report.pdf", "192.168.1.1", "Chrome", "Granted READ to Bob");
        await auditService.LogAsync(AuditAction.DocumentDownload, AuditStatus.Allowed, Guid.NewGuid(), "bob@trustvault.com", "Viewer", Guid.NewGuid(), "Q3_Report.pdf", "192.168.1.2", "Firefox");

        // Assert
        var (isValid, brokenLogId) = await auditService.VerifyChainIntegrityAsync();
        isValid.Should().BeTrue();
        brokenLogId.Should().BeNull();
    }

    [Fact]
    public async Task AuditChain_WhenLogPayloadIsTampered_VerificationMustFailAndIdentifyCompromisedLog()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var auditService = new AuditService(context);

        await auditService.LogAsync(AuditAction.UserLogin, AuditStatus.Allowed, Guid.NewGuid(), "alice@trustvault.com", "Owner", null, null, "192.168.1.1", "Chrome");
        var uploadLog = await auditService.LogAsync(AuditAction.DocumentUpload, AuditStatus.Allowed, Guid.NewGuid(), "alice@trustvault.com", "Owner", Guid.NewGuid(), "Confidential_Salary.pdf", "192.168.1.1", "Chrome");
        await auditService.LogAsync(AuditAction.DocumentDownload, AuditStatus.Allowed, Guid.NewGuid(), "bob@trustvault.com", "Viewer", uploadLog.DocumentId, "Confidential_Salary.pdf", "192.168.1.2", "Firefox");

        // Act - Attacker tampers directly with the 2nd log payload to falsify details
        uploadLog.Details = "Tampered payload trying to erase evidence";
        await context.SaveChangesAsync();

        // Assert
        var (isValid, brokenLogId) = await auditService.VerifyChainIntegrityAsync();
        isValid.Should().BeFalse();
        brokenLogId.Should().Be(uploadLog.Id);
    }

    [Fact]
    public async Task AuditChain_WhenLogEntryIsDeleted_ChainLinkBreaks()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var auditService = new AuditService(context);

        var log1 = await auditService.LogAsync(AuditAction.UserLogin, AuditStatus.Allowed, Guid.NewGuid(), "alice@trustvault.com", "Owner", null, null, "192.168.1.1", "Chrome");
        var log2 = await auditService.LogAsync(AuditAction.DocumentUpload, AuditStatus.Allowed, Guid.NewGuid(), "alice@trustvault.com", "Owner", Guid.NewGuid(), "Doc1.pdf", "192.168.1.1", "Chrome");
        var log3 = await auditService.LogAsync(AuditAction.DocumentDownload, AuditStatus.Allowed, Guid.NewGuid(), "bob@trustvault.com", "Viewer", log2.DocumentId, "Doc1.pdf", "192.168.1.2", "Firefox");

        // Act - Attacker deletes the middle log entry
        context.AuditLogs.Remove(log2);
        await context.SaveChangesAsync();

        // Assert
        var (isValid, brokenLogId) = await auditService.VerifyChainIntegrityAsync();
        isValid.Should().BeFalse();
        brokenLogId.Should().Be(log3.Id); // log3's PreviousHash will point to deleted log2, breaking the chain
    }
}

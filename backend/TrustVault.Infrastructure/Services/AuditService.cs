using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using TrustVault.Core.Entities;
using TrustVault.Core.Enums;
using TrustVault.Core.Interfaces;
using TrustVault.Infrastructure.Data;

namespace TrustVault.Infrastructure.Services;

public class AuditService : IAuditService
{
    private readonly TrustVaultDbContext _dbContext;
    private const string GenesisHash = "0000000000000000000000000000000000000000000000000000000000000000";

    public AuditService(TrustVaultDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<AuditLog> LogAsync(
        AuditAction action,
        AuditStatus status,
        Guid? userId,
        string? userEmail,
        string? userRole,
        Guid? documentId,
        string? documentTitle,
        string ipAddress,
        string userAgent,
        string? details = null)
    {
        // 1. Fetch the hash of the latest audit log entry
        var lastLog = await _dbContext.AuditLogs
            .OrderByDescending(a => a.Id)
            .Select(a => new { a.Id, a.CurrentHash })
            .FirstOrDefaultAsync();

        var previousHash = lastLog?.CurrentHash ?? GenesisHash;
        var timestamp = DateTime.UtcNow;

        // 2. Compute the cryptographic hash chain
        var payloadToHash = BuildPayloadString(previousHash, timestamp, userId, action, status, documentId, details);
        var currentHash = ComputeSha256(payloadToHash);

        var auditLog = new AuditLog
        {
            Timestamp = timestamp,
            UserId = userId,
            UserEmail = userEmail,
            UserRole = userRole,
            Action = action,
            Status = status,
            DocumentId = documentId,
            DocumentTitle = documentTitle,
            IpAddress = string.IsNullOrWhiteSpace(ipAddress) ? "127.0.0.1" : ipAddress,
            UserAgent = userAgent ?? string.Empty,
            Details = details,
            PreviousHash = previousHash,
            CurrentHash = currentHash
        };

        _dbContext.AuditLogs.Add(auditLog);
        await _dbContext.SaveChangesAsync();

        return auditLog;
    }

    public async Task<(bool isValid, long? brokenLogId)> VerifyChainIntegrityAsync()
    {
        var logs = await _dbContext.AuditLogs
            .OrderBy(a => a.Id)
            .ToListAsync();

        if (logs.Count == 0)
        {
            return (true, null);
        }

        string expectedPreviousHash = GenesisHash;

        foreach (var log in logs)
        {
            // Verify link to previous entry
            if (log.PreviousHash != expectedPreviousHash)
            {
                return (false, log.Id);
            }

            // Recompute expected current hash
            var payload = BuildPayloadString(
                log.PreviousHash,
                log.Timestamp,
                log.UserId,
                log.Action,
                log.Status,
                log.DocumentId,
                log.Details);

            var recalculatedHash = ComputeSha256(payload);

            if (log.CurrentHash != recalculatedHash)
            {
                return (false, log.Id);
            }

            expectedPreviousHash = log.CurrentHash;
        }

        return (true, null);
    }

    private static string BuildPayloadString(
        string previousHash,
        DateTime timestamp,
        Guid? userId,
        AuditAction action,
        AuditStatus status,
        Guid? documentId,
        string? details)
    {
        return $"{previousHash}|{timestamp:O}|{userId?.ToString() ?? "NONE"}|{(int)action}|{(int)status}|{documentId?.ToString() ?? "NONE"}|{details ?? string.Empty}";
    }

    private static string ComputeSha256(string rawData)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawData));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}

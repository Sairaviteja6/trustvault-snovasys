using TrustVault.Core.Entities;
using TrustVault.Core.Enums;

namespace TrustVault.Core.Interfaces;

public interface IAuditService
{
    Task<AuditLog> LogAsync(
        AuditAction action,
        AuditStatus status,
        Guid? userId,
        string? userEmail,
        string? userRole,
        Guid? documentId,
        string? documentTitle,
        string ipAddress,
        string userAgent,
        string? details = null);

    Task<(bool isValid, long? brokenLogId)> VerifyChainIntegrityAsync();
}

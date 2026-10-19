using Microsoft.EntityFrameworkCore;
using TrustVault.Core.Entities;
using TrustVault.Core.Enums;
using TrustVault.Core.Interfaces;
using TrustVault.Infrastructure.Data;

namespace TrustVault.Api.Services;

public class DocumentAuthorizationService
{
    private readonly TrustVaultDbContext _dbContext;
    private readonly IAuditService _auditService;

    public DocumentAuthorizationService(TrustVaultDbContext dbContext, IAuditService auditService)
    {
        _dbContext = dbContext;
        _auditService = auditService;
    }

    public record AccessEvaluationResult(bool IsAuthorized, Document? Document, PermissionLevel? GrantedLevel);

    /// <summary>
    /// Evaluates access strictly server-side on every single request.
    /// Non-negotiable invariant:
    /// 1. Document Owner always has Full (Edit/Read) access.
    /// 2. Admin role DOES NOT bypass document content access.
    /// 3. Viewer must have an explicit, active DocumentPermission entry.
    /// 4. Unauthorized requests are logged to the tamper-evident audit trail as AccessRefused.
    /// </summary>
    public async Task<AccessEvaluationResult> EvaluateAccessAsync(
        Guid documentId,
        Guid currentUserId,
        UserRole currentUserRole,
        string currentUserEmail,
        PermissionLevel requiredLevel,
        string ipAddress,
        string userAgent,
        string requestedAction)
    {
        // 1. Fetch document from database (re-evaluated on every request, no cached permissions)
        var document = await _dbContext.Documents
            .Include(d => d.Permissions)
            .FirstOrDefaultAsync(d => d.Id == documentId && !d.IsDeleted);

        if (document == null)
        {
            // Do not leak existence or non-existence to caller
            await _auditService.LogAsync(
                AuditAction.AccessRefused,
                AuditStatus.Refused,
                currentUserId,
                currentUserEmail,
                currentUserRole.ToString(),
                documentId,
                null,
                ipAddress,
                userAgent,
                $"Attempted {requestedAction} on non-existent or deleted document {documentId}");

            return new AccessEvaluationResult(false, null, null);
        }

        // 2. Document Owner check
        if (document.OwnerId == currentUserId)
        {
            return new AccessEvaluationResult(true, document, PermissionLevel.Edit);
        }

        // 3. Admin least-privilege enforcement
        // Admins CANNOT read document content unless explicitly granted like any other user
        var activePermission = document.Permissions.FirstOrDefault(p => p.UserId == currentUserId);

        if (activePermission == null)
        {
            // REFUSED: No grant exists
            await _auditService.LogAsync(
                AuditAction.AccessRefused,
                AuditStatus.Refused,
                currentUserId,
                currentUserEmail,
                currentUserRole.ToString(),
                document.Id,
                document.Title,
                ipAddress,
                userAgent,
                $"Refused {requestedAction}: User has no active permission grant on document {document.Title}");

            return new AccessEvaluationResult(false, null, null);
        }

        // 4. Permission Level check (Read vs Edit)
        if (requiredLevel == PermissionLevel.Edit && activePermission.Level < PermissionLevel.Edit)
        {
            // REFUSED: Insufficient privilege level
            await _auditService.LogAsync(
                AuditAction.AccessRefused,
                AuditStatus.Refused,
                currentUserId,
                currentUserEmail,
                currentUserRole.ToString(),
                document.Id,
                document.Title,
                ipAddress,
                userAgent,
                $"Refused {requestedAction}: User has {activePermission.Level} but requires {requiredLevel}");

            return new AccessEvaluationResult(false, null, null);
        }

        return new AccessEvaluationResult(true, document, activePermission.Level);
    }
}

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

    public record AccessEvaluationResult(bool IsAuthorized, Document? Document, List<PermissionType> ActivePermissions);

    /// <summary>
    /// Evaluates access strictly server-side on every single request.
    /// Non-negotiable invariant:
    /// 1. Document Owner always has full access (Read, Download, Edit, Delete).
    /// 2. Admin role DOES NOT bypass document content access (Least Privilege).
    /// 3. Viewer must have an explicit, active DocumentGrant matching the required permission.
    /// 4. EDIT permission does NOT automatically permit DOWNLOAD.
    /// 5. Unauthorized requests are logged to the tamper-evident audit trail as AccessRefused.
    /// </summary>
    public async Task<AccessEvaluationResult> EvaluateAccessAsync(
        Guid documentId,
        Guid currentUserId,
        UserRole currentUserRole,
        string currentUserEmail,
        PermissionType requiredPermission,
        string ipAddress,
        string userAgent,
        string requestedAction)
    {
        // 1. Fetch document from database (re-evaluated on every request, no cached permissions)
        var document = await _dbContext.Documents
            .Include(d => d.Grants)
            .FirstOrDefaultAsync(d => d.Id == documentId && !d.IsDeleted);

        if (document == null)
        {
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

            return new AccessEvaluationResult(false, null, new List<PermissionType>());
        }

        // 2. Document Owner check
        if (document.OwnerId == currentUserId)
        {
            var ownerPermissions = new List<PermissionType>
            {
                PermissionType.Read,
                PermissionType.Download,
                PermissionType.Edit,
                PermissionType.Delete
            };
            return new AccessEvaluationResult(true, document, ownerPermissions);
        }

        // 3. Admin least-privilege enforcement
        // Admins CANNOT read/download/edit document content unless explicitly granted
        var activeGrants = document.Grants
            .Where(g => g.UserId == currentUserId && g.RevokedAtUtc == null)
            .Select(g => g.PermissionType)
            .ToList();

        var hasRequiredPermission = activeGrants.Contains(requiredPermission);

        if (!hasRequiredPermission)
        {
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
                $"Refused {requestedAction}: User lacks explicit '{requiredPermission}' grant on document {document.Title}");

            return new AccessEvaluationResult(false, null, activeGrants);
        }

        return new AccessEvaluationResult(true, document, activeGrants);
    }
}

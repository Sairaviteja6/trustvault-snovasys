using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrustVault.Api.DTOs;
using TrustVault.Core.Entities;
using TrustVault.Core.Enums;
using TrustVault.Core.Interfaces;
using TrustVault.Infrastructure.Data;

namespace TrustVault.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/documents/{documentId}/[controller]")]
public class PermissionsController : ControllerBase
{
    private readonly TrustVaultDbContext _dbContext;
    private readonly IAuditService _auditService;

    public PermissionsController(TrustVaultDbContext dbContext, IAuditService auditService)
    {
        _dbContext = dbContext;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<IActionResult> ListPermissions(Guid documentId)
    {
        var (userId, userRole, _) = GetCurrentUser();

        var document = await _dbContext.Documents
            .Include(d => d.Permissions)
            .ThenInclude(p => p.User)
            .FirstOrDefaultAsync(d => d.Id == documentId && !d.IsDeleted);

        if (document == null || document.OwnerId != userId)
        {
            return NotFound(new { message = "Document not found or you are not the owner." });
        }

        var list = document.Permissions.Select(p => new PermissionResponse(
            p.Id,
            p.UserId,
            p.User?.Username ?? "Unknown",
            p.User?.Email ?? "Unknown",
            p.Level.ToString(),
            p.GrantedAt));

        return Ok(list);
    }

    [HttpPost("grant")]
    public async Task<IActionResult> GrantPermission(Guid documentId, [FromBody] GrantPermissionRequest request)
    {
        var (userId, userRole, userEmail) = GetCurrentUser();

        var document = await _dbContext.Documents.FirstOrDefaultAsync(d => d.Id == documentId && !d.IsDeleted);
        if (document == null || document.OwnerId != userId)
        {
            return NotFound(new { message = "Document not found or you are not the owner." });
        }

        var targetUser = await _dbContext.Users.FindAsync(request.UserId);
        if (targetUser == null || !targetUser.IsActive)
        {
            return BadRequest(new { message = "Target user does not exist or is inactive." });
        }

        if (targetUser.Id == userId)
        {
            return BadRequest(new { message = "Owner already has full access to the document." });
        }

        // Upsert permission
        var existing = await _dbContext.DocumentPermissions
            .FirstOrDefaultAsync(p => p.DocumentId == documentId && p.UserId == request.UserId);

        if (existing != null)
        {
            existing.Level = request.Level;
            existing.GrantedAt = DateTime.UtcNow;
            existing.GrantedByUserId = userId;
        }
        else
        {
            var perm = new DocumentPermission
            {
                DocumentId = documentId,
                UserId = request.UserId,
                Level = request.Level,
                GrantedByUserId = userId,
                GrantedAt = DateTime.UtcNow
            };
            _dbContext.DocumentPermissions.Add(perm);
        }

        await _dbContext.SaveChangesAsync();

        await _auditService.LogAsync(
            AuditAction.PermissionGranted,
            AuditStatus.Allowed,
            userId,
            userEmail,
            userRole.ToString(),
            document.Id,
            document.Title,
            GetIpAddress(),
            GetUserAgent(),
            $"Granted {request.Level} access to named user {targetUser.Email}");

        return Ok(new { message = $"Access {request.Level} successfully granted to {targetUser.Email}." });
    }

    [HttpPost("grant-by-tag")]
    public async Task<IActionResult> GrantByTag(Guid documentId, [FromBody] GrantByTagRequest request)
    {
        var (userId, userRole, userEmail) = GetCurrentUser();

        var document = await _dbContext.Documents.FirstOrDefaultAsync(d => d.Id == documentId && !d.IsDeleted);
        if (document == null || document.OwnerId != userId)
        {
            return NotFound(new { message = "Document not found or you are not the owner." });
        }

        // Find all named users tagged with this tag name by this owner
        var taggedUsers = await _dbContext.UserTags
            .Include(t => t.User)
            .Where(t => t.OwnerId == userId && t.TagName.ToLower() == request.TagName.Trim().ToLower())
            .Select(t => t.User!)
            .ToListAsync();

        if (taggedUsers.Count == 0)
        {
            return BadRequest(new { message = $"No users found associated with tag '{request.TagName}'." });
        }

        int grantedCount = 0;
        foreach (var user in taggedUsers)
        {
            if (user.Id == userId) continue;

            var existing = await _dbContext.DocumentPermissions
                .FirstOrDefaultAsync(p => p.DocumentId == documentId && p.UserId == user.Id);

            if (existing != null)
            {
                existing.Level = request.Level;
                existing.GrantedAt = DateTime.UtcNow;
            }
            else
            {
                _dbContext.DocumentPermissions.Add(new DocumentPermission
                {
                    DocumentId = documentId,
                    UserId = user.Id,
                    Level = request.Level,
                    GrantedByUserId = userId,
                    GrantedAt = DateTime.UtcNow
                });
            }
            grantedCount++;
        }

        await _dbContext.SaveChangesAsync();

        await _auditService.LogAsync(
            AuditAction.PermissionGranted,
            AuditStatus.Allowed,
            userId,
            userEmail,
            userRole.ToString(),
            document.Id,
            document.Title,
            GetIpAddress(),
            GetUserAgent(),
            $"Bulk-expanded tag '{request.TagName}': granted {request.Level} to {grantedCount} named individuals.");

        return Ok(new { message = $"Successfully granted {request.Level} to {grantedCount} users from tag '{request.TagName}'." });
    }

    [HttpDelete("revoke/{targetUserId}")]
    public async Task<IActionResult> RevokePermission(Guid documentId, Guid targetUserId)
    {
        var (userId, userRole, userEmail) = GetCurrentUser();

        var document = await _dbContext.Documents.FirstOrDefaultAsync(d => d.Id == documentId && !d.IsDeleted);
        if (document == null || document.OwnerId != userId)
        {
            return NotFound(new { message = "Document not found or you are not the owner." });
        }

        var permission = await _dbContext.DocumentPermissions
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.DocumentId == documentId && p.UserId == targetUserId);

        if (permission == null)
        {
            return NotFound(new { message = "Permission not found for this user." });
        }

        var targetEmail = permission.User?.Email ?? targetUserId.ToString();

        // Immediate revocation: Remove from DB
        _dbContext.DocumentPermissions.Remove(permission);
        await _dbContext.SaveChangesAsync();

        // Log immediately to audit trail
        await _auditService.LogAsync(
            AuditAction.PermissionRevoked,
            AuditStatus.Allowed,
            userId,
            userEmail,
            userRole.ToString(),
            document.Id,
            document.Title,
            GetIpAddress(),
            GetUserAgent(),
            $"Revoked access from named user {targetEmail}");

        return Ok(new { message = $"Access revoked immediately for user {targetEmail}." });
    }

    private (Guid userId, UserRole role, string email) GetCurrentUser()
    {
        var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var roleClaim = User.FindFirstValue(ClaimTypes.Role);
        var emailClaim = User.FindFirstValue(ClaimTypes.Email);

        var userId = Guid.TryParse(idClaim, out var id) ? id : Guid.Empty;
        var role = Enum.TryParse<UserRole>(roleClaim, out var r) ? r : UserRole.Viewer;

        return (userId, role, emailClaim ?? "unknown");
    }

    private string GetIpAddress() =>
        HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

    private string GetUserAgent() =>
        Request.Headers.UserAgent.ToString();
}

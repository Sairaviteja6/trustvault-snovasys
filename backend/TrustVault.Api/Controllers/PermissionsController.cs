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

[Authorize(Roles = "Owner")]
[ApiController]
[Route("api/v1/documents/{documentId}/[controller]")]
public class PermissionsController : ControllerBase
{
    private readonly TrustVaultDbContext _dbContext;
    private readonly IAuditService _auditService;
    private readonly IEmailService _emailService;
    private readonly ILogger<PermissionsController> _logger;

    public PermissionsController(
        TrustVaultDbContext dbContext,
        IAuditService auditService,
        IEmailService emailService,
        ILogger<PermissionsController> logger)
    {
        _dbContext = dbContext;
        _auditService = auditService;
        _emailService = emailService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> ListPermissions(Guid documentId)
    {
        var (userId, userRole, _) = GetCurrentUser();

        var document = await _dbContext.Documents
            .Include(d => d.Grants)
            .ThenInclude(g => g.User)
            .FirstOrDefaultAsync(d => d.Id == documentId && !d.IsDeleted);

        if (document == null || document.OwnerId != userId)
        {
            return NotFound(new { message = "Document not found or you are not the owner." });
        }

        var list = document.Grants
            .Where(g => g.RevokedAtUtc == null)
            .Select(g => new PermissionResponse(
                g.Id,
                g.UserId,
                g.User?.Username ?? "Unknown",
                g.User?.Email ?? "Unknown",
                g.PermissionType.ToString(),
                g.CreatedAtUtc));

        return Ok(list);
    }

    [HttpPost("grant")]
    public async Task<IActionResult> GrantPermissions(Guid documentId, [FromBody] GrantPermissionRequest request)
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

        if (request.Permissions == null || request.Permissions.Count == 0)
        {
            return BadRequest(new { message = "At least one permission must be specified." });
        }

        var grantedTypes = new List<string>();

        foreach (var permType in request.Permissions.Distinct())
        {
            var existing = await _dbContext.DocumentGrants
                .FirstOrDefaultAsync(g => g.DocumentId == documentId && g.UserId == request.UserId && g.PermissionType == permType);

            if (existing != null)
            {
                existing.RevokedAtUtc = null;
                existing.UpdatedAtUtc = DateTime.UtcNow;
                existing.GrantedByUserId = userId;
            }
            else
            {
                _dbContext.DocumentGrants.Add(new DocumentGrant
                {
                    DocumentId = documentId,
                    UserId = request.UserId,
                    PermissionType = permType,
                    GrantedByUserId = userId,
                    CreatedAtUtc = DateTime.UtcNow
                });
            }
            grantedTypes.Add(permType.ToString());
        }

        await _dbContext.SaveChangesAsync();

        var permSummary = string.Join(", ", grantedTypes);
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
            $"Granted [{permSummary}] to named user {targetUser.Email}");

        // Dispatch notification email to Viewer
        try
        {
            var viewUrl = $"{Request.Scheme}://{Request.Host}/viewer?docId={document.Id}";
            await _emailService.SendDocumentAccessGrantedAsync(
                targetUser.Email,
                targetUser.Username,
                document.Title,
                userEmail,
                permSummary,
                viewUrl);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not send document access granted email to {Email}", targetUser.Email);
        }

        return Ok(new { message = $"Permissions [{permSummary}] successfully granted to {targetUser.Email}." });
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

        var taggedUsers = await _dbContext.UserTags
            .Include(t => t.User)
            .Where(t => t.OwnerId == userId && t.TagName.ToLower() == request.TagName.Trim().ToLower())
            .Select(t => t.User!)
            .ToListAsync();

        if (taggedUsers.Count == 0)
        {
            return BadRequest(new { message = $"No users found associated with tag '{request.TagName}'." });
        }

        int userCount = 0;
        foreach (var user in taggedUsers)
        {
            if (user.Id == userId) continue;

            foreach (var permType in request.Permissions.Distinct())
            {
                var existing = await _dbContext.DocumentGrants
                    .FirstOrDefaultAsync(g => g.DocumentId == documentId && g.UserId == user.Id && g.PermissionType == permType);

                if (existing != null)
                {
                    existing.RevokedAtUtc = null;
                    existing.UpdatedAtUtc = DateTime.UtcNow;
                }
                else
                {
                    _dbContext.DocumentGrants.Add(new DocumentGrant
                    {
                        DocumentId = documentId,
                        UserId = user.Id,
                        PermissionType = permType,
                        GrantedByUserId = userId,
                        CreatedAtUtc = DateTime.UtcNow
                    });
                }
            }
            userCount++;
        }

        await _dbContext.SaveChangesAsync();

        var permSummary = string.Join(", ", request.Permissions);
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
            $"Bulk-expanded tag '{request.TagName}': granted [{permSummary}] to {userCount} named individuals.");

        // Dispatch notification emails to granted users
        var viewUrl = $"{Request.Scheme}://{Request.Host}/viewer?docId={document.Id}";
        foreach (var u in taggedUsers)
        {
            if (u.Id == userId) continue;
            try
            {
                await _emailService.SendDocumentAccessGrantedAsync(
                    u.Email,
                    u.Username,
                    document.Title,
                    userEmail,
                    permSummary,
                    viewUrl);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not send document access granted email to {Email}", u.Email);
            }
        }

        return Ok(new { message = $"Successfully granted [{permSummary}] to {userCount} users from tag '{request.TagName}'." });
    }

    [HttpDelete("revoke/{targetUserId}")]
    public async Task<IActionResult> RevokeAllPermissionsForUser(Guid documentId, Guid targetUserId)
    {
        var (userId, userRole, userEmail) = GetCurrentUser();

        var document = await _dbContext.Documents.FirstOrDefaultAsync(d => d.Id == documentId && !d.IsDeleted);
        if (document == null || document.OwnerId != userId)
        {
            return NotFound(new { message = "Document not found or you are not the owner." });
        }

        var activeGrants = await _dbContext.DocumentGrants
            .Include(g => g.User)
            .Where(g => g.DocumentId == documentId && g.UserId == targetUserId && g.RevokedAtUtc == null)
            .ToListAsync();

        if (activeGrants.Count == 0)
        {
            return NotFound(new { message = "No active permissions found for this user on this document." });
        }

        var targetEmail = activeGrants.First().User?.Email ?? targetUserId.ToString();

        // Immediate revocation: Mark RevokedAtUtc = UtcNow
        foreach (var grant in activeGrants)
        {
            grant.RevokedAtUtc = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync();

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
            $"Revoked all access from named user {targetEmail}");

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

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
[Route("api/v1/[controller]")]
public class OwnerController : ControllerBase
{
    private readonly TrustVaultDbContext _dbContext;
    private readonly IAuditService _auditService;
    private readonly IEmailService _emailService;
    private readonly ILogger<OwnerController> _logger;

    public OwnerController(
        TrustVaultDbContext dbContext,
        IAuditService auditService,
        IEmailService emailService,
        ILogger<OwnerController> logger)
    {
        _dbContext = dbContext;
        _auditService = auditService;
        _emailService = emailService;
        _logger = logger;
    }

    /// <summary>
    /// Audit logs strictly scoped to documents owned by the calling Document Owner.
    /// Non-negotiable: Owner CANNOT access system-wide audit logs or other owners' logs.
    /// </summary>
    [HttpGet("audit-logs")]
    public async Task<IActionResult> GetOwnerAuditLogs(
        [FromQuery] Guid? documentId,
        [FromQuery] string? search,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? preset = "today",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = await BuildScopedOwnerAuditQueryAsync(documentId, search, fromDate, toDate, preset);

        var totalCount = await query.CountAsync();
        var logs = await query
            .OrderByDescending(a => a.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AuditLogDto(
                a.Id,
                a.Timestamp,
                a.UserId,
                a.UserEmail,
                a.UserRole,
                a.Action.ToString(),
                a.Status.ToString(),
                a.DocumentId,
                a.DocumentTitle,
                a.IpAddress,
                a.UserAgent,
                a.Details,
                a.PreviousHash,
                a.CurrentHash))
            .ToListAsync();

        return Ok(new { totalCount, page, pageSize, items = logs });
    }

    [HttpGet("audit-logs/export")]
    public async Task<IActionResult> ExportOwnerAuditLogs(
        [FromQuery] Guid? documentId,
        [FromQuery] string? search,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? preset = "today")
    {
        var query = await BuildScopedOwnerAuditQueryAsync(documentId, search, fromDate, toDate, preset);

        var logs = await query
            .OrderByDescending(a => a.Id)
            .Take(5000)
            .ToListAsync();

        var (isChainIntact, compromisedId) = await _auditService.VerifyChainIntegrityAsync();

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("TrustVault Document Activity Statement");
        sb.AppendLine($"Exported At (UTC),{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss}");
        sb.AppendLine($"Cryptographic Chain Verified,{isChainIntact}");
        sb.AppendLine($"Total Records In Export,{logs.Count}");
        sb.AppendLine();
        sb.AppendLine("ID,Timestamp (UTC),User Email,Role,Action,Status,Document Title,IP Address,Details,Previous Hash,Current Hash");

        foreach (var log in logs)
        {
            var title = (log.DocumentTitle ?? "—").Replace("\"", "\"\"");
            var details = (log.Details ?? "—").Replace("\"", "\"\"");
            var email = (log.UserEmail ?? "System / Anonymous").Replace("\"", "\"\"");

            sb.AppendLine($"{log.Id},{log.Timestamp:yyyy-MM-dd HH:mm:ss},{email},{log.UserRole ?? "N/A"},{log.Action},{log.Status},\"{title}\",{log.IpAddress},\"{details}\",{log.PreviousHash},{log.CurrentHash}");
        }

        var bytes = System.Text.Encoding.UTF8.GetBytes(sb.ToString());
        var fileName = $"document-audit-statement-{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
        return File(bytes, "text/csv", fileName);
    }

    private async Task<IQueryable<AuditLog>> BuildScopedOwnerAuditQueryAsync(
        Guid? documentId,
        string? search,
        DateTime? fromDate,
        DateTime? toDate,
        string? preset)
    {
        var ownerId = GetCurrentUserId();

        // Subquery of document IDs owned by this owner
        var ownedDocIds = await _dbContext.Documents
            .Where(d => d.OwnerId == ownerId)
            .Select(d => d.Id)
            .ToListAsync();

        var query = _dbContext.AuditLogs
            .Where(a => a.DocumentId != null && ownedDocIds.Contains(a.DocumentId.Value));

        if (documentId.HasValue && ownedDocIds.Contains(documentId.Value))
        {
            query = query.Where(a => a.DocumentId == documentId.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(a =>
                (a.UserEmail != null && a.UserEmail.ToLower().Contains(s)) ||
                (a.DocumentTitle != null && a.DocumentTitle.ToLower().Contains(s)) ||
                (a.Details != null && a.Details.ToLower().Contains(s)));
        }

        // Time range filtering
        if (fromDate.HasValue)
        {
            query = query.Where(a => a.Timestamp >= fromDate.Value);
        }
        if (toDate.HasValue)
        {
            query = query.Where(a => a.Timestamp <= toDate.Value);
        }

        if (!fromDate.HasValue && !toDate.HasValue && !string.IsNullOrWhiteSpace(preset))
        {
            var normalizedPreset = preset.Trim().ToLowerInvariant();
            if (normalizedPreset == "today")
            {
                var todayUtc = DateTime.UtcNow.Date;
                query = query.Where(a => a.Timestamp >= todayUtc);
            }
            else if (normalizedPreset == "yesterday")
            {
                var yestStart = DateTime.UtcNow.Date.AddDays(-1);
                var yestEnd = DateTime.UtcNow.Date;
                query = query.Where(a => a.Timestamp >= yestStart && a.Timestamp < yestEnd);
            }
            else if (normalizedPreset == "7days" || normalizedPreset == "week")
            {
                var past7 = DateTime.UtcNow.AddDays(-7);
                query = query.Where(a => a.Timestamp >= past7);
            }
            else if (normalizedPreset == "30days" || normalizedPreset == "month")
            {
                var past30 = DateTime.UtcNow.AddDays(-30);
                query = query.Where(a => a.Timestamp >= past30);
            }
        }

        return query;
    }

    /// <summary>
    /// Owner provisions a new Viewer account.
    /// </summary>
    [HttpPost("users/viewers")]
    public async Task<IActionResult> CreateViewer([FromBody] CreateViewerRequest request)
    {
        var ownerId = GetCurrentUserId();
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var trimmedUsername = request.Username.Trim();
        var exists = await _dbContext.Users.AnyAsync(u => u.Email == normalizedEmail || u.Username == trimmedUsername);
        if (exists)
        {
            return Conflict(new { message = "User with this email or username already exists." });
        }

        var viewer = new User
        {
            Username = request.Username.Trim(),
            Email = normalizedEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = UserRole.Viewer,
            Department = request.Department,
            MustChangePassword = true,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Users.Add(viewer);
        await _dbContext.SaveChangesAsync();

        // Assign initial tags if provided
        if (request.InitialTags != null && request.InitialTags.Count > 0)
        {
            foreach (var tag in request.InitialTags.Distinct())
            {
                if (!string.IsNullOrWhiteSpace(tag))
                {
                    _dbContext.UserTags.Add(new UserTag
                    {
                        OwnerId = ownerId,
                        UserId = viewer.Id,
                        TagName = tag.Trim()
                    });
                }
            }
            await _dbContext.SaveChangesAsync();
        }

        // Dispatch credentials email to the newly provisioned Viewer
        var encodedEmail = System.Net.WebUtility.UrlEncode(viewer.Email);
        var encodedTemp = System.Net.WebUtility.UrlEncode(request.Password);
        var setPasswordUrl = $"{Request.Scheme}://{Request.Host}/login?action=set-password&email={encodedEmail}&temp={encodedTemp}";
        try
        {
            await _emailService.SendProvisionedCredentialsAsync(
                viewer.Email,
                viewer.Username,
                viewer.Username,
                request.Password,
                "Viewer",
                setPasswordUrl);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not send credentials email to provisioned Viewer {Email}", viewer.Email);
        }

        await _auditService.LogAsync(
            AuditAction.UserRegistered,
            AuditStatus.Allowed,
            ownerId,
            User.FindFirstValue(ClaimTypes.Email),
            "Owner",
            null,
            null,
            GetIpAddress(),
            GetUserAgent(),
            $"Owner provisioned new Viewer account: {viewer.Email}");

        return CreatedAtAction(nameof(ListViewers), new { id = viewer.Id }, new UserDto(
            viewer.Id, viewer.Username, viewer.Email, viewer.Role.ToString(), viewer.Department, viewer.IsActive, viewer.CreatedAt, viewer.IsMasterAdmin, viewer.MustChangePassword));
    }

    /// <summary>
    /// Lists all Viewers in the system so the Owner can select named individuals for sharing.
    /// </summary>
    [HttpGet("users/viewers")]
    public async Task<IActionResult> ListViewers()
    {
        var viewers = await _dbContext.Users
            .Where(u => u.Role == UserRole.Viewer)
            .OrderBy(u => u.Email)
            .Select(u => new UserDto(u.Id, u.Username, u.Email, u.Role.ToString(), u.Department, u.IsActive, u.CreatedAt, u.IsMasterAdmin, u.MustChangePassword, u.Organization))
            .ToListAsync();

        return Ok(viewers);
    }

    /// <summary>
    /// Owner deletes / removes a Viewer account and revokes all grants and tags.
    /// </summary>
    [HttpDelete("users/viewers/{id}")]
    public async Task<IActionResult> DeleteViewer(Guid id)
    {
        var ownerId = GetCurrentUserId();
        var viewer = await _dbContext.Users.FindAsync(id);
        if (viewer == null || viewer.Role != UserRole.Viewer)
        {
            return NotFound(new { message = "Viewer account not found." });
        }

        // Remove all grants for this viewer
        var grants = await _dbContext.DocumentGrants.Where(g => g.UserId == id).ToListAsync();
        _dbContext.DocumentGrants.RemoveRange(grants);

        // Remove user tags
        var tags = await _dbContext.UserTags.Where(t => t.UserId == id).ToListAsync();
        _dbContext.UserTags.RemoveRange(tags);

        // Remove viewer record
        _dbContext.Users.Remove(viewer);
        await _dbContext.SaveChangesAsync();

        await _auditService.LogAsync(
            AuditAction.PermissionRevoked,
            AuditStatus.Allowed,
            ownerId,
            User.FindFirstValue(ClaimTypes.Email),
            "Owner",
            null,
            null,
            GetIpAddress(),
            GetUserAgent(),
            $"Document Owner removed Viewer account {viewer.Email}");

        return Ok(new { message = $"Viewer {viewer.Email} was successfully removed." });
    }

    /// <summary>
    /// Metrics for Owner Dashboard
    /// </summary>
    [HttpGet("metrics")]
    public async Task<IActionResult> GetOwnerMetrics()
    {
        var ownerId = GetCurrentUserId();

        var totalOwnedDocs = await _dbContext.Documents.CountAsync(d => d.OwnerId == ownerId && !d.IsDeleted);
        var activeGrantsCount = await _dbContext.DocumentGrants
            .CountAsync(g => g.GrantedByUserId == ownerId && g.RevokedAtUtc == null);
        var totalViewers = await _dbContext.Users.CountAsync(u => u.Role == UserRole.Viewer);
        var totalTags = await _dbContext.UserTags.Where(t => t.OwnerId == ownerId).Select(t => t.TagName).Distinct().CountAsync();

        return Ok(new
        {
            totalOwnedDocs,
            activeGrantsCount,
            totalViewers,
            totalTags
        });
    }

    private Guid GetCurrentUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(claim, out var id) ? id : Guid.Empty;
    }

    private string GetIpAddress() =>
        HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

    private string GetUserAgent() =>
        Request.Headers.UserAgent.ToString();
}

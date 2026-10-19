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

    public OwnerController(TrustVaultDbContext dbContext, IAuditService auditService)
    {
        _dbContext = dbContext;
        _auditService = auditService;
    }

    /// <summary>
    /// Audit logs strictly scoped to documents owned by the calling Document Owner.
    /// Non-negotiable: Owner CANNOT access system-wide audit logs or other owners' logs.
    /// </summary>
    [HttpGet("audit-logs")]
    public async Task<IActionResult> GetOwnerAuditLogs(
        [FromQuery] Guid? documentId,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
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
            viewer.Id, viewer.Username, viewer.Email, viewer.Role.ToString(), viewer.Department, viewer.IsActive, viewer.CreatedAt));
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
            .Select(u => new UserDto(u.Id, u.Username, u.Email, u.Role.ToString(), u.Department, u.IsActive, u.CreatedAt))
            .ToListAsync();

        return Ok(viewers);
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

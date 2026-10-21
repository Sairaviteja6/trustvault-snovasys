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

[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/v1/[controller]")]
public class AdminController : ControllerBase
{
    private readonly TrustVaultDbContext _dbContext;
    private readonly IAuditService _auditService;

    public AdminController(TrustVaultDbContext dbContext, IAuditService auditService)
    {
        _dbContext = dbContext;
        _auditService = auditService;
    }

    [HttpGet("audit-logs")]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] string? search,
        [FromQuery] AuditAction? action,
        [FromQuery] AuditStatus? status,
        [FromQuery] Guid? userId,
        [FromQuery] Guid? documentId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = _dbContext.AuditLogs.AsQueryable();

        if (action.HasValue)
        {
            query = query.Where(a => a.Action == action.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(a => a.Status == status.Value);
        }

        if (userId.HasValue)
        {
            query = query.Where(a => a.UserId == userId.Value);
        }

        if (documentId.HasValue)
        {
            query = query.Where(a => a.DocumentId == documentId.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(a => 
                (a.UserEmail != null && a.UserEmail.ToLower().Contains(s)) ||
                (a.DocumentTitle != null && a.DocumentTitle.ToLower().Contains(s)) ||
                (a.Details != null && a.Details.ToLower().Contains(s)) ||
                a.IpAddress.Contains(s));
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

        return Ok(new
        {
            totalCount,
            page,
            pageSize,
            items = logs
        });
    }

    [HttpGet("audit-verify")]
    public async Task<IActionResult> VerifyAuditChain()
    {
        var (isValid, brokenLogId) = await _auditService.VerifyChainIntegrityAsync();
        var totalLogs = await _dbContext.AuditLogs.CountAsync();

        return Ok(new
        {
            isChainIntact = isValid,
            totalAuditedRecords = totalLogs,
            compromisedLogId = brokenLogId,
            verificationTimestamp = DateTime.UtcNow,
            status = isValid 
                ? "Cryptographic chain verified: zero tampering detected." 
                : $"INTEGRITY COMPROMISED: Record #{brokenLogId} has been tampered with or deleted."
        });
    }

    [HttpGet("metrics")]
    public async Task<IActionResult> GetSecurityMetrics()
    {
        var totalActiveOwners = await _dbContext.Users.CountAsync(u => u.Role == UserRole.Owner && u.IsActive);
        var totalActiveViewers = await _dbContext.Users.CountAsync(u => u.Role == UserRole.Viewer && u.IsActive);
        var totalDocuments = await _dbContext.Documents.CountAsync(d => !d.IsDeleted);
        var totalAuditLogs = await _dbContext.AuditLogs.CountAsync();

        var refusedAttempts = await _dbContext.AuditLogs
            .CountAsync(a => a.Status == AuditStatus.Refused);

        var recentRefused = await _dbContext.AuditLogs
            .Where(a => a.Status == AuditStatus.Refused)
            .OrderByDescending(a => a.Id)
            .Take(10)
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

        return Ok(new AdminMetricsResponse(
            totalActiveOwners,
            totalActiveViewers,
            totalDocuments,
            totalAuditLogs,
            refusedAttempts,
            recentRefused));
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _dbContext.Users
            .OrderBy(u => u.Role)
            .ThenBy(u => u.Email)
            .Select(u => new UserDto(u.Id, u.Username, u.Email, u.Role.ToString(), u.Department, u.IsActive, u.CreatedAt, u.IsMasterAdmin))
            .ToListAsync();

        return Ok(users);
    }

    /// <summary>
    /// Master Administrator provisions a secondary administrator with restricted privileges.
    /// </summary>
    [HttpPost("users/admins")]
    public async Task<IActionResult> CreateSubAdmin([FromBody] CreateAdminRequest request)
    {
        if (!await IsCallerMasterAdminAsync())
        {
            await _auditService.LogAsync(
                AuditAction.AccessRefused,
                AuditStatus.Refused,
                GetCurrentUserId(),
                User.FindFirstValue(ClaimTypes.Email),
                "Admin",
                null,
                null,
                GetIpAddress(),
                GetUserAgent(),
                "Access Denied: Only Master Administrator can provision secondary administrators.");

            return StatusCode(403, new { message = "Only the Master Administrator has authority to provision secondary administrators." });
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var trimmedUsername = request.Username.Trim();
        var exists = await _dbContext.Users.AnyAsync(u => u.Email == normalizedEmail || u.Username == trimmedUsername);
        if (exists)
        {
            return Conflict(new { message = "User with this email or username already exists." });
        }

        var subAdmin = new User
        {
            Username = trimmedUsername,
            Email = normalizedEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = UserRole.Admin,
            IsMasterAdmin = false, // Secondary Admin has restricted privileges
            Department = string.IsNullOrWhiteSpace(request.Department) ? "Security Operations" : request.Department.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Users.Add(subAdmin);
        await _dbContext.SaveChangesAsync();

        await _auditService.LogAsync(
            AuditAction.UserRegistered,
            AuditStatus.Allowed,
            GetCurrentUserId(),
            User.FindFirstValue(ClaimTypes.Email),
            "MasterAdmin",
            null,
            null,
            GetIpAddress(),
            GetUserAgent(),
            $"Master Administrator provisioned Secondary Administrator: {subAdmin.Email} (Department: {subAdmin.Department})");

        return CreatedAtAction(nameof(GetUsers), new { id = subAdmin.Id }, new UserDto(
            subAdmin.Id, subAdmin.Username, subAdmin.Email, subAdmin.Role.ToString(), subAdmin.Department, subAdmin.IsActive, subAdmin.CreatedAt, subAdmin.IsMasterAdmin));
    }

    /// <summary>
    /// Administrator provisions an Owner account (Master Admin only).
    /// </summary>
    [HttpPost("users/owners")]
    public async Task<IActionResult> CreateOwner([FromBody] CreateOwnerRequest request)
    {
        if (!await IsCallerMasterAdminAsync())
        {
            await _auditService.LogAsync(
                AuditAction.AccessRefused,
                AuditStatus.Refused,
                GetCurrentUserId(),
                User.FindFirstValue(ClaimTypes.Email),
                "Admin",
                null,
                null,
                GetIpAddress(),
                GetUserAgent(),
                "Access Denied: Only Master Administrator can provision Document Owners.");

            return StatusCode(403, new { message = "Only the Master Administrator has authority to provision Document Owners." });
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var trimmedUsername = request.Username.Trim();
        var exists = await _dbContext.Users.AnyAsync(u => u.Email == normalizedEmail || u.Username == trimmedUsername);
        if (exists)
        {
            return Conflict(new { message = "User with this email or username already exists." });
        }

        var owner = new User
        {
            Username = request.Username.Trim(),
            Email = normalizedEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = UserRole.Owner,
            IsMasterAdmin = false,
            Department = request.Department,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Users.Add(owner);
        await _dbContext.SaveChangesAsync();

        await _auditService.LogAsync(
            AuditAction.UserRegistered,
            AuditStatus.Allowed,
            GetCurrentUserId(),
            User.FindFirstValue(ClaimTypes.Email),
            "MasterAdmin",
            null,
            null,
            GetIpAddress(),
            GetUserAgent(),
            $"Administrator provisioned new Document Owner: {owner.Email}");

        return CreatedAtAction(nameof(GetUsers), new { id = owner.Id }, new UserDto(
            owner.Id, owner.Username, owner.Email, owner.Role.ToString(), owner.Department, owner.IsActive, owner.CreatedAt, owner.IsMasterAdmin));
    }

    /// <summary>
    /// Administrator activates or deactivates an account.
    /// </summary>
    [HttpPatch("users/{userId}/toggle-status")]
    public async Task<IActionResult> ToggleUserStatus(Guid userId)
    {
        var isMaster = await IsCallerMasterAdminAsync();

        var user = await _dbContext.Users.FindAsync(userId);
        if (user == null)
        {
            return NotFound(new { message = "User not found." });
        }

        if (!isMaster && (user.IsMasterAdmin || user.Role == UserRole.Owner))
        {
            return StatusCode(403, new { message = "Secondary Administrators cannot alter Master Admin or Document Owner accounts." });
        }

        user.IsActive = !user.IsActive;
        if (!user.IsActive)
        {
            user.RefreshToken = null;
            user.IsRevoked = true;
        }

        await _dbContext.SaveChangesAsync();

        await _auditService.LogAsync(
            user.IsActive ? AuditAction.UserRegistered : AuditAction.UserLogout,
            AuditStatus.Allowed,
            GetCurrentUserId(),
            User.FindFirstValue(ClaimTypes.Email),
            isMaster ? "MasterAdmin" : "Admin",
            null,
            null,
            GetIpAddress(),
            GetUserAgent(),
            $"User {user.Email} status updated: IsActive = {user.IsActive}");

        return Ok(new { message = $"User status updated. IsActive = {user.IsActive}", isActive = user.IsActive });
    }

    private async Task<bool> IsCallerMasterAdminAsync()
    {
        var userId = GetCurrentUserId();
        var user = await _dbContext.Users.FindAsync(userId);
        return user != null && user.IsMasterAdmin;
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

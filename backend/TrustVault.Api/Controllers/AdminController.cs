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
    private readonly IEmailService _emailService;
    private readonly ILogger<AdminController> _logger;

    public AdminController(
        TrustVaultDbContext dbContext,
        IAuditService auditService,
        IEmailService emailService,
        ILogger<AdminController> logger)
    {
        _dbContext = dbContext;
        _auditService = auditService;
        _emailService = emailService;
        _logger = logger;
    }

    [HttpGet("audit-logs")]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] string? search,
        [FromQuery] string? organization,
        [FromQuery] AuditAction? action,
        [FromQuery] AuditStatus? status,
        [FromQuery] Guid? userId,
        [FromQuery] Guid? documentId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? preset = "today",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = await BuildScopedAuditQueryAsync(search, organization, action, status, userId, documentId, fromDate, toDate, preset);

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

    [HttpGet("audit-logs/export")]
    public async Task<IActionResult> ExportAuditLogs(
        [FromQuery] string? search,
        [FromQuery] string? organization,
        [FromQuery] AuditAction? action,
        [FromQuery] AuditStatus? status,
        [FromQuery] Guid? userId,
        [FromQuery] Guid? documentId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? preset = "today")
    {
        var query = await BuildScopedAuditQueryAsync(search, organization, action, status, userId, documentId, fromDate, toDate, preset);

        var logs = await query
            .OrderByDescending(a => a.Id)
            .Take(5000)
            .ToListAsync();

        var (isChainIntact, compromisedId) = await _auditService.VerifyChainIntegrityAsync();

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("TrustVault Audit Log Statement");
        sb.AppendLine($"Exported At (UTC),{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss}");
        sb.AppendLine($"Cryptographic Chain Verified,{isChainIntact}");
        sb.AppendLine($"Total Records In Export,{logs.Count}");
        sb.AppendLine();
        sb.AppendLine("ID,Timestamp (UTC),Caller Email,Caller Role,Action,Status,Document Title,IP Address,Details,Previous Hash,Current Hash");

        foreach (var log in logs)
        {
            var title = (log.DocumentTitle ?? "—").Replace("\"", "\"\"");
            var details = (log.Details ?? "—").Replace("\"", "\"\"");
            var email = (log.UserEmail ?? "System / Anonymous").Replace("\"", "\"\"");

            sb.AppendLine($"{log.Id},{log.Timestamp:yyyy-MM-dd HH:mm:ss},{email},{log.UserRole ?? "N/A"},{log.Action},{log.Status},\"{title}\",{log.IpAddress},\"{details}\",{log.PreviousHash},{log.CurrentHash}");
        }

        var bytes = System.Text.Encoding.UTF8.GetBytes(sb.ToString());
        var fileName = $"trustvault-audit-statement-{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
        return File(bytes, "text/csv", fileName);
    }

    private async Task<IQueryable<AuditLog>> BuildScopedAuditQueryAsync(
        string? search,
        string? organization,
        AuditAction? action,
        AuditStatus? status,
        Guid? userId,
        Guid? documentId,
        DateTime? fromDate,
        DateTime? toDate,
        string? preset)
    {
        var callerId = GetCurrentUserId();
        var isMaster = await IsCallerMasterAdminAsync();
        var query = _dbContext.AuditLogs.AsQueryable();

        // 1. Scoping: Master Admin sees all; Secondary Admin sees only their own actions and their created owners' actions & documents
        if (!isMaster)
        {
            var createdOwnerIds = await _dbContext.Users
                .Where(u => u.CreatedByAdminId == callerId && u.Role == UserRole.Owner)
                .Select(u => u.Id)
                .ToListAsync();

            var createdOwnerDocIds = await _dbContext.Documents
                .Where(d => createdOwnerIds.Contains(d.OwnerId))
                .Select(d => d.Id)
                .ToListAsync();

            var viewerIdsUnderOwners = await _dbContext.Users
                .Where(u => u.Role == UserRole.Viewer && u.CreatedByAdminId.HasValue && createdOwnerIds.Contains(u.CreatedByAdminId.Value))
                .Select(u => u.Id)
                .ToListAsync();

            var taggedViewerIds = await _dbContext.UserTags
                .Where(ut => createdOwnerIds.Contains(ut.OwnerId))
                .Select(ut => ut.UserId)
                .ToListAsync();

            var permittedViewerIds = await _dbContext.DocumentGrants
                .Where(p => createdOwnerDocIds.Contains(p.DocumentId))
                .Select(p => p.UserId)
                .ToListAsync();

            var relevantViewerIds = viewerIdsUnderOwners
                .Concat(taggedViewerIds)
                .Concat(permittedViewerIds)
                .Distinct()
                .ToList();

            query = query.Where(a =>
                a.UserId == callerId ||
                (a.UserId.HasValue && createdOwnerIds.Contains(a.UserId.Value)) ||
                (a.DocumentId.HasValue && createdOwnerDocIds.Contains(a.DocumentId.Value)) ||
                (a.UserId.HasValue && relevantViewerIds.Contains(a.UserId.Value)));
        }

        // 2. Action & Status filters
        if (action.HasValue) query = query.Where(a => a.Action == action.Value);
        if (status.HasValue) query = query.Where(a => a.Status == status.Value);
        if (userId.HasValue) query = query.Where(a => a.UserId == userId.Value);
        if (documentId.HasValue) query = query.Where(a => a.DocumentId == documentId.Value);

        // 2b. Organization filter
        if (!string.IsNullOrWhiteSpace(organization))
        {
            var org = organization.Trim().ToLowerInvariant();
            var orgUserIds = await _dbContext.Users
                .Where(u => (u.Organization != null && u.Organization.ToLower() == org) || 
                            (u.Department != null && u.Department.ToLower() == org))
                .Select(u => u.Id)
                .ToListAsync();

            var orgEmails = await _dbContext.Users
                .Where(u => (u.Organization != null && u.Organization.ToLower() == org) || 
                            (u.Department != null && u.Department.ToLower() == org))
                .Select(u => u.Email.ToLower())
                .ToListAsync();

            query = query.Where(a =>
                (a.UserId.HasValue && orgUserIds.Contains(a.UserId.Value)) ||
                (a.UserEmail != null && orgEmails.Contains(a.UserEmail.ToLower())));
        }

        // 3. Search query
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(a =>
                (a.UserEmail != null && a.UserEmail.ToLower().Contains(s)) ||
                (a.DocumentTitle != null && a.DocumentTitle.ToLower().Contains(s)) ||
                (a.Details != null && a.Details.ToLower().Contains(s)) ||
                a.IpAddress.Contains(s));
        }

        // 4. Time range filtering
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
            // "all" leaves query unbounded by date
        }

        return query;
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
        var callerId = GetCurrentUserId();
        var isMaster = await IsCallerMasterAdminAsync();

        var query = _dbContext.Users.AsQueryable();
        if (!isMaster)
        {
            // Secondary Admin only sees themselves and owners/viewers provisioned by them
            query = query.Where(u => u.Id == callerId || u.CreatedByAdminId == callerId);
        }

        var users = await query
            .OrderBy(u => u.Role)
            .ThenBy(u => u.Email)
            .Select(u => new UserDto(
                u.Id, 
                u.Username, 
                u.Email, 
                u.Role.ToString(), 
                u.Department, 
                u.IsActive, 
                u.CreatedAt, 
                u.IsMasterAdmin, 
                u.MustChangePassword,
                u.Organization ?? u.Department ?? "Corporate Vault"))
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

        var callerId = GetCurrentUserId();
        var subAdmin = new User
        {
            Username = trimmedUsername,
            Email = normalizedEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = UserRole.Admin,
            IsMasterAdmin = false, // Secondary Admin has restricted privileges
            CreatedByAdminId = callerId,
            MustChangePassword = true,
            Department = string.IsNullOrWhiteSpace(request.Department) ? "Security Operations" : request.Department.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Users.Add(subAdmin);
        await _dbContext.SaveChangesAsync();

        // Dispatch credentials email
        var encodedEmail = System.Net.WebUtility.UrlEncode(subAdmin.Email);
        var encodedTemp = System.Net.WebUtility.UrlEncode(request.Password);
        var setPasswordUrl = $"{Request.Scheme}://{Request.Host}/login?action=set-password&email={encodedEmail}&temp={encodedTemp}";
        try
        {
            await _emailService.SendProvisionedCredentialsAsync(
                subAdmin.Email,
                subAdmin.Username,
                subAdmin.Username,
                request.Password,
                "Secondary Administrator",
                setPasswordUrl);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not send credentials email to provisioned Secondary Admin {Email}", subAdmin.Email);
        }

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
            subAdmin.Id, subAdmin.Username, subAdmin.Email, subAdmin.Role.ToString(), subAdmin.Department, subAdmin.IsActive, subAdmin.CreatedAt, subAdmin.IsMasterAdmin, subAdmin.MustChangePassword));
    }

    /// <summary>
    /// Administrator provisions an Owner account (both Master Admin and Secondary Admins).
    /// </summary>
    [HttpPost("users/owners")]
    public async Task<IActionResult> CreateOwner([FromBody] CreateOwnerRequest request)
    {
        var callerId = GetCurrentUserId();
        var isMaster = await IsCallerMasterAdminAsync();

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
            CreatedByAdminId = callerId,
            Department = request.Department,
            MustChangePassword = true,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Users.Add(owner);
        await _dbContext.SaveChangesAsync();

        // Dispatch credentials email
        var encodedOwnerEmail = System.Net.WebUtility.UrlEncode(owner.Email);
        var encodedOwnerTemp = System.Net.WebUtility.UrlEncode(request.Password);
        var ownerSetPasswordUrl = $"{Request.Scheme}://{Request.Host}/login?action=set-password&email={encodedOwnerEmail}&temp={encodedOwnerTemp}";
        try
        {
            await _emailService.SendProvisionedCredentialsAsync(
                owner.Email,
                owner.Username,
                owner.Username,
                request.Password,
                "Document Owner",
                ownerSetPasswordUrl);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not send credentials email to provisioned Owner {Email}", owner.Email);
        }

        await _auditService.LogAsync(
            AuditAction.UserRegistered,
            AuditStatus.Allowed,
            callerId,
            User.FindFirstValue(ClaimTypes.Email),
            isMaster ? "MasterAdmin" : "Admin",
            null,
            null,
            GetIpAddress(),
            GetUserAgent(),
            $"{(isMaster ? "Master Administrator" : "Secondary Administrator")} provisioned new Document Owner: {owner.Email}");

        return CreatedAtAction(nameof(GetUsers), new { id = owner.Id }, new UserDto(
            owner.Id, owner.Username, owner.Email, owner.Role.ToString(), owner.Department, owner.IsActive, owner.CreatedAt, owner.IsMasterAdmin, owner.MustChangePassword));
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

    /// <summary>
    /// Master Administrator permanently removes/deletes a user account.
    /// </summary>
    [HttpDelete("users/{userId}")]
    public async Task<IActionResult> DeleteUser(Guid userId)
    {
        var isMaster = await IsCallerMasterAdminAsync();
        if (!isMaster)
        {
            return StatusCode(403, new { message = "Only the Master Administrator has authority to delete user accounts." });
        }

        var callerId = GetCurrentUserId();
        if (userId == callerId)
        {
            return BadRequest(new { message = "Cannot delete the active Master Administrator account." });
        }

        var user = await _dbContext.Users.FindAsync(userId);
        if (user == null)
        {
            return NotFound(new { message = "User not found." });
        }

        var userEmail = user.Email;
        var userRole = user.Role.ToString();
        var org = user.Organization ?? user.Department ?? "Corporate Vault";

        // 1. Unlink Client Inquiries
        var inquiries = await _dbContext.ClientInquiries.Where(i => i.ProvisionedUserId == userId).ToListAsync();
        foreach (var inq in inquiries) 
        { 
            inq.ProvisionedUserId = null; 
        }

        // 2. Clean up Document Grants (received or granted)
        var grants = await _dbContext.DocumentGrants.Where(g => g.UserId == userId || g.GrantedByUserId == userId).ToListAsync();
        _dbContext.DocumentGrants.RemoveRange(grants);

        // 3. Clean up User Tags (assigned or created by this user)
        var userTags = await _dbContext.UserTags.Where(t => t.UserId == userId || t.OwnerId == userId).ToListAsync();
        _dbContext.UserTags.RemoveRange(userTags);

        // 4. Clean up Documents owned by this user (including child snapshots and grants)
        var ownedDocs = await _dbContext.Documents
            .Include(d => d.Snapshots)
            .Include(d => d.Grants)
            .Where(d => d.OwnerId == userId)
            .ToListAsync();

        foreach (var doc in ownedDocs)
        {
            if (doc.Grants != null && doc.Grants.Any())
            {
                _dbContext.DocumentGrants.RemoveRange(doc.Grants);
            }
            if (doc.Snapshots != null && doc.Snapshots.Any())
            {
                _dbContext.DocumentSnapshots.RemoveRange(doc.Snapshots);
            }
            var docAudits = await _dbContext.AuditLogs.Where(a => a.DocumentId == doc.Id).ToListAsync();
            foreach (var a in docAudits) 
            { 
                a.DocumentId = null; 
            }
            _dbContext.Documents.Remove(doc);
        }

        // 5. Unlink Audit Logs referencing this user (preserves blockchain hash integrity while allowing user deletion)
        var userAudits = await _dbContext.AuditLogs.Where(a => a.UserId == userId).ToListAsync();
        foreach (var a in userAudits) 
        { 
            a.UserId = null; 
        }

        // 6. Permanently delete the user entity
        _dbContext.Users.Remove(user);
        await _dbContext.SaveChangesAsync();

        await _auditService.LogAsync(
            AuditAction.UserLogout,
            AuditStatus.Allowed,
            callerId,
            User.FindFirstValue(ClaimTypes.Email),
            "MasterAdmin",
            null,
            null,
            GetIpAddress(),
            GetUserAgent(),
            $"User account {userEmail} ({userRole}, Org: {org}) permanently removed by Master Administrator.");

        return Ok(new { message = $"User account '{userEmail}' has been permanently deleted from the system." });
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

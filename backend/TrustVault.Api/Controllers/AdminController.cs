using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrustVault.Api.DTOs;
using TrustVault.Core.Enums;
using TrustVault.Core.Interfaces;
using TrustVault.Infrastructure.Data;

namespace TrustVault.Api.Controllers;

[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/[controller]")]
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
        var totalDocuments = await _dbContext.Documents.CountAsync(d => !d.IsDeleted);
        var totalUsers = await _dbContext.Users.CountAsync();
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

        return Ok(new
        {
            totalDocuments,
            totalUsers,
            totalAuditLogs,
            totalRefusedAttempts = refusedAttempts,
            recentRefusedAttempts = recentRefused
        });
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _dbContext.Users
            .OrderBy(u => u.Role)
            .ThenBy(u => u.Email)
            .Select(u => new UserDto(u.Id, u.Username, u.Email, u.Role.ToString(), u.Department))
            .ToListAsync();

        return Ok(users);
    }
}

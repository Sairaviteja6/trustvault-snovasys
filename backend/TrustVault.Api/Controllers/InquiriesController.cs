using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrustVault.Core.Entities;
using TrustVault.Core.Enums;
using TrustVault.Core.Interfaces;
using TrustVault.Infrastructure.Data;

namespace TrustVault.Api.Controllers;

[ApiController]
[Route("api/v1/inquiries")]
public class InquiriesController : ControllerBase
{
    private readonly TrustVaultDbContext _context;
    private readonly IEmailService _emailService;
    private readonly IAuditService _auditService;
    private readonly ILogger<InquiriesController> _logger;

    public InquiriesController(
        TrustVaultDbContext context,
        IEmailService emailService,
        IAuditService auditService,
        ILogger<InquiriesController> logger)
    {
        _context = context;
        _emailService = emailService;
        _auditService = auditService;
        _logger = logger;
    }

    public record CreateInquiryRequest(
        string FullName,
        string Email,
        string Organization,
        string? Department,
        string RequestedRole, // "Owner" or "Admin"
        string UseCase,
        string TeamSize,
        string? Message
    );

    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> SubmitInquiry([FromBody] CreateInquiryRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Organization))
        {
            return BadRequest(new { message = "Full Name, Email, and Organization are required." });
        }

        var refId = "INQ-" + Random.Shared.Next(10000, 99999);
        var role = request.RequestedRole?.ToLowerInvariant() == "admin" ? "Admin" : "Owner";

        var inquiry = new ClientInquiry
        {
            Id = refId,
            FullName = request.FullName.Trim(),
            Email = request.Email.Trim().ToLowerInvariant(),
            Organization = request.Organization.Trim(),
            Department = request.Department?.Trim(),
            RequestedRole = role,
            UseCase = request.UseCase?.Trim() ?? "General Enterprise Vault",
            TeamSize = request.TeamSize?.Trim() ?? "10-50 Users",
            Message = request.Message?.Trim(),
            CreatedAt = DateTime.UtcNow,
            Status = "Pending"
        };

        _context.ClientInquiries.Add(inquiry);
        await _context.SaveChangesAsync();

        // Dispatch instant confirmation email to applicant
        try
        {
            await _emailService.SendInquiryReceiptAsync(
                inquiry.Email,
                inquiry.FullName,
                inquiry.Organization,
                inquiry.Id,
                inquiry.RequestedRole);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not send inquiry receipt email to {Email}", inquiry.Email);
        }

        return Ok(inquiry);
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetInquiries()
    {
        var list = await _context.ClientInquiries
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        return Ok(list);
    }

    public record ApproveInquiryRequest(string? CustomPassword, string? AssignedRole);

    [HttpPost("{id}/approve")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ApproveInquiry(string id, [FromBody] ApproveInquiryRequest? request)
    {
        var inq = await _context.ClientInquiries.FindAsync(id);
        if (inq == null)
        {
            return NotFound(new { message = $"Inquiry with ID {id} not found." });
        }

        if (inq.Status == "Approved")
        {
            return BadRequest(new { message = "Inquiry has already been approved and provisioned." });
        }

        var targetRoleStr = request?.AssignedRole ?? inq.RequestedRole;
        var roleEnum = targetRoleStr == "Admin" ? UserRole.Admin : UserRole.Owner;
        var tempPassword = string.IsNullOrWhiteSpace(request?.CustomPassword) ? "Vault@2026!" : request.CustomPassword;

        // Check if user already exists
        var existing = await _context.Users.FirstOrDefaultAsync(u => u.Email == inq.Email);
        User user;

        if (existing != null)
        {
            user = existing;
            user.Role = roleEnum;
            user.IsActive = true;
            user.Department = inq.Department ?? inq.Organization;
        }
        else
        {
            var usernamePrefix = inq.Email.Split('@')[0].Replace(".", "_");
            var username = usernamePrefix;
            int counter = 1;
            while (await _context.Users.AnyAsync(u => u.Username == username))
            {
                username = $"{usernamePrefix}_{counter++}";
            }

            user = new User
            {
                Id = Guid.NewGuid(),
                Username = username,
                Email = inq.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(tempPassword),
                Role = roleEnum,
                IsMasterAdmin = false,
                Department = inq.Department ?? inq.Organization,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Users.Add(user);
        }

        inq.Status = "Approved";
        inq.ProvisionedUserId = user.Id;
        inq.ProvisionedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Dispatch credentials email
        var loginUrl = $"{Request.Scheme}://{Request.Host}/login";
        try
        {
            await _emailService.SendProvisionedCredentialsAsync(
                user.Email,
                inq.FullName,
                user.Username,
                tempPassword,
                user.Role.ToString(),
                loginUrl);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not send credentials email to {Email}", user.Email);
        }

        // Audit Log
        var callerId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "SYSTEM";
        var callerEmail = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ?? "admin@trustvault.com";
        await _auditService.LogAsync(
            AuditAction.UserRegistered,
            AuditStatus.Allowed,
            Guid.TryParse(callerId, out var g) ? g : null,
            callerEmail,
            "Admin",
            null,
            null,
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1",
            Request.Headers["User-Agent"].ToString(),
            $"Approved client inquiry {inq.Id} and provisioned {user.Role} account for {user.Email}");

        return Ok(new
        {
            message = $"Account provisioned successfully for {user.Email}.",
            userId = user.Id,
            username = user.Username,
            email = user.Email,
            role = user.Role.ToString(),
            temporaryPassword = tempPassword,
            inquiryStatus = inq.Status
        });
    }
}

using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrustVault.Api.DTOs;
using TrustVault.Api.Services;
using TrustVault.Core.Entities;
using TrustVault.Core.Enums;
using TrustVault.Core.Interfaces;
using TrustVault.Infrastructure.Data;

namespace TrustVault.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/[controller]")]
public class DocumentsController : ControllerBase
{
    private readonly TrustVaultDbContext _dbContext;
    private readonly IFileStorageService _storageService;
    private readonly IFileValidatorService _validatorService;
    private readonly DocumentAuthorizationService _authorizationService;
    private readonly IAuditService _auditService;

    public DocumentsController(
        TrustVaultDbContext dbContext,
        IFileStorageService storageService,
        IFileValidatorService validatorService,
        DocumentAuthorizationService authorizationService,
        IAuditService auditService)
    {
        _dbContext = dbContext;
        _storageService = storageService;
        _validatorService = validatorService;
        _authorizationService = authorizationService;
        _auditService = auditService;
    }

    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Upload(
        [FromForm] string title,
        [FromForm] string? description,
        [FromForm] string? category,
        IFormFile file)
    {
        var (userId, userRole, userEmail) = GetCurrentUser();

        // Enforce role: Document Owner only
        if (userRole != UserRole.Owner)
        {
            await _auditService.LogAsync(
                AuditAction.AccessRefused,
                AuditStatus.Refused,
                userId,
                userEmail,
                userRole.ToString(),
                null,
                title,
                GetIpAddress(),
                GetUserAgent(),
                $"Refused Upload: Role {userRole} is not authorized to upload documents.");

            return Forbid();
        }

        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No file provided." });
        }

        // 1. Validate magic bytes, extension, and size
        using var stream = file.OpenReadStream();
        var (isValid, errorMessage, sanitizedFileName) = _validatorService.Validate(stream, file.FileName, file.ContentType, file.Length);

        if (!isValid)
        {
            await _auditService.LogAsync(
                AuditAction.DocumentUpload,
                AuditStatus.Refused,
                userId,
                userEmail,
                userRole.ToString(),
                null,
                title,
                GetIpAddress(),
                GetUserAgent(),
                $"Upload rejected: {errorMessage}");

            return BadRequest(new { message = errorMessage });
        }

        // 2. Encrypt and save to storage outside web root
        stream.Position = 0;
        var (storageFileName, iv, tag, sha256) = await _storageService.SaveEncryptedAsync(stream);

        // 3. Persist document record
        var document = new Document
        {
            Title = string.IsNullOrWhiteSpace(title) ? sanitizedFileName : title.Trim(),
            Description = description?.Trim() ?? string.Empty,
            Category = string.IsNullOrWhiteSpace(category) ? "General" : category.Trim(),
            OriginalFileName = sanitizedFileName,
            StorageFileName = storageFileName,
            ContentType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType,
            FileSizeBytes = file.Length,
            FileHashSha256 = sha256,
            EncryptionIv = iv,
            EncryptionTag = tag,
            OwnerId = userId,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Documents.Add(document);
        await _dbContext.SaveChangesAsync();

        // 4. Log to tamper-evident audit trail
        await _auditService.LogAsync(
            AuditAction.DocumentUpload,
            AuditStatus.Allowed,
            userId,
            userEmail,
            userRole.ToString(),
            document.Id,
            document.Title,
            GetIpAddress(),
            GetUserAgent(),
            $"Document uploaded ({sanitizedFileName}, {file.Length} bytes, SHA-256: {sha256[..12]}...)");

        return CreatedAtAction(nameof(GetById), new { id = document.Id }, MapToResponse(document, userId, new List<string> { "Read", "Download", "Edit", "Delete" }, userEmail));
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var (userId, userRole, _) = GetCurrentUser();

        // Non-negotiable: Server filters by permissions
        var query = _dbContext.Documents
            .Include(d => d.Owner)
            .Include(d => d.Grants)
            .Where(d => !d.IsDeleted);

        if (userRole == UserRole.Owner)
        {
            // Owner sees their owned documents + any documents explicitly granted to them
            query = query.Where(d => d.OwnerId == userId || d.Grants.Any(g => g.UserId == userId && g.RevokedAtUtc == null));
        }
        else if (userRole == UserRole.Viewer)
        {
            // Viewer sees strictly documents with active grants
            query = query.Where(d => d.Grants.Any(g => g.UserId == userId && g.RevokedAtUtc == null));
        }
        else if (userRole == UserRole.Admin)
        {
            // Least privilege: Admins see only documents they were explicitly granted as a user
            query = query.Where(d => d.Grants.Any(g => g.UserId == userId && g.RevokedAtUtc == null));
        }

        var docs = await query.OrderByDescending(d => d.CreatedAt).ToListAsync();

        var response = docs.Select(d =>
        {
            List<string> permittedActions;
            if (d.OwnerId == userId)
            {
                permittedActions = new List<string> { "Read", "Download", "Edit", "Delete" };
            }
            else
            {
                permittedActions = d.Grants
                    .Where(g => g.UserId == userId && g.RevokedAtUtc == null)
                    .Select(g => g.PermissionType.ToString())
                    .Distinct()
                    .ToList();
            }

            return MapToResponse(d, userId, permittedActions, d.Owner?.Email ?? "Unknown");
        });

        return Ok(response);
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search(
        [FromQuery] string? query,
        [FromQuery] string? category,
        [FromQuery] string? ownerEmail,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        var (userId, userRole, _) = GetCurrentUser();

        var baseQuery = _dbContext.Documents
            .Include(d => d.Owner)
            .Include(d => d.Grants)
            .Where(d => !d.IsDeleted);

        if (userRole == UserRole.Owner)
        {
            baseQuery = baseQuery.Where(d => d.OwnerId == userId || d.Grants.Any(g => g.UserId == userId && g.RevokedAtUtc == null));
        }
        else
        {
            baseQuery = baseQuery.Where(d => d.Grants.Any(g => g.UserId == userId && g.RevokedAtUtc == null));
        }

        if (!string.IsNullOrWhiteSpace(query))
        {
            var search = query.Trim().ToLower();
            baseQuery = baseQuery.Where(d => d.Title.ToLower().Contains(search) || d.Description.ToLower().Contains(search) || d.OriginalFileName.ToLower().Contains(search));
        }

        if (!string.IsNullOrWhiteSpace(category))
        {
            baseQuery = baseQuery.Where(d => d.Category == category.Trim());
        }

        if (!string.IsNullOrWhiteSpace(ownerEmail))
        {
            var emailSearch = ownerEmail.Trim().ToLower();
            baseQuery = baseQuery.Where(d => d.Owner != null && d.Owner.Email.ToLower().Contains(emailSearch));
        }

        if (fromDate.HasValue)
        {
            baseQuery = baseQuery.Where(d => d.CreatedAt >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            baseQuery = baseQuery.Where(d => d.CreatedAt <= toDate.Value);
        }

        var results = await baseQuery.OrderByDescending(d => d.CreatedAt).ToListAsync();

        var response = results.Select(d =>
        {
            List<string> permittedActions;
            if (d.OwnerId == userId)
            {
                permittedActions = new List<string> { "Read", "Download", "Edit", "Delete" };
            }
            else
            {
                permittedActions = d.Grants
                    .Where(g => g.UserId == userId && g.RevokedAtUtc == null)
                    .Select(g => g.PermissionType.ToString())
                    .Distinct()
                    .ToList();
            }

            return MapToResponse(d, userId, permittedActions, d.Owner?.Email ?? "Unknown");
        });

        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var (userId, userRole, userEmail) = GetCurrentUser();

        var authResult = await _authorizationService.EvaluateAccessAsync(
            id, userId, userRole, userEmail, PermissionType.Read, GetIpAddress(), GetUserAgent(), "ReadMetadata");

        if (!authResult.IsAuthorized || authResult.Document == null)
        {
            return NotFound(new { message = "Document not found." });
        }

        var doc = authResult.Document;
        var owner = await _dbContext.Users.FindAsync(doc.OwnerId);

        await _auditService.LogAsync(
            AuditAction.DocumentRead,
            AuditStatus.Allowed,
            userId,
            userEmail,
            userRole.ToString(),
            doc.Id,
            doc.Title,
            GetIpAddress(),
            GetUserAgent(),
            "Document metadata viewed");

        var actions = authResult.ActivePermissions.Select(p => p.ToString()).ToList();
        return Ok(MapToResponse(doc, userId, actions, owner?.Email ?? "Unknown"));
    }

    [HttpGet("{id}/download")]
    public async Task<IActionResult> Download(Guid id)
    {
        var (userId, userRole, userEmail) = GetCurrentUser();

        // Enforce discrete DOWNLOAD permission
        var authResult = await _authorizationService.EvaluateAccessAsync(
            id, userId, userRole, userEmail, PermissionType.Download, GetIpAddress(), GetUserAgent(), "DownloadContent");

        if (!authResult.IsAuthorized || authResult.Document == null)
        {
            return NotFound(new { message = "Document not found." });
        }

        var doc = authResult.Document;
        var decryptedStream = await _storageService.GetDecryptedStreamAsync(doc.StorageFileName, doc.EncryptionIv, doc.EncryptionTag);

        await _auditService.LogAsync(
            AuditAction.DocumentDownload,
            AuditStatus.Allowed,
            userId,
            userEmail,
            userRole.ToString(),
            doc.Id,
            doc.Title,
            GetIpAddress(),
            GetUserAgent(),
            $"Document downloaded ({doc.OriginalFileName})");

        var contentType = string.IsNullOrWhiteSpace(doc.ContentType) ? "application/octet-stream" : doc.ContentType;
        return File(decryptedStream, contentType, doc.OriginalFileName);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateDocumentRequest request)
    {
        var (userId, userRole, userEmail) = GetCurrentUser();

        // Enforce discrete EDIT permission
        var authResult = await _authorizationService.EvaluateAccessAsync(
            id, userId, userRole, userEmail, PermissionType.Edit, GetIpAddress(), GetUserAgent(), "EditDocument");

        if (!authResult.IsAuthorized || authResult.Document == null)
        {
            return NotFound(new { message = "Document not found." });
        }

        var doc = authResult.Document;
        doc.Title = request.Title.Trim();
        doc.Description = request.Description?.Trim() ?? string.Empty;
        doc.Category = request.Category?.Trim() ?? doc.Category;
        doc.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        await _auditService.LogAsync(
            AuditAction.DocumentEdit,
            AuditStatus.Allowed,
            userId,
            userEmail,
            userRole.ToString(),
            doc.Id,
            doc.Title,
            GetIpAddress(),
            GetUserAgent(),
            "Document metadata updated");

        return Ok(new { message = "Document updated successfully." });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var (userId, userRole, userEmail) = GetCurrentUser();

        var authResult = await _authorizationService.EvaluateAccessAsync(
            id, userId, userRole, userEmail, PermissionType.Delete, GetIpAddress(), GetUserAgent(), "DeleteDocument");

        if (!authResult.IsAuthorized || authResult.Document == null)
        {
            return NotFound(new { message = "Document not found." });
        }

        var doc = authResult.Document;
        doc.IsDeleted = true;
        doc.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();

        await _auditService.LogAsync(
            AuditAction.DocumentDelete,
            AuditStatus.Allowed,
            userId,
            userEmail,
            userRole.ToString(),
            doc.Id,
            doc.Title,
            GetIpAddress(),
            GetUserAgent(),
            "Document marked as deleted.");

        return Ok(new { message = "Document deleted successfully." });
    }

    private static DocumentResponse MapToResponse(Document d, Guid currentUserId, List<string> permissions, string ownerEmail)
    {
        return new DocumentResponse(
            d.Id,
            d.Title,
            d.Description,
            d.Category,
            d.OriginalFileName,
            d.ContentType,
            d.FileSizeBytes,
            d.FileHashSha256,
            d.OwnerId,
            ownerEmail,
            d.CreatedAt,
            permissions);
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

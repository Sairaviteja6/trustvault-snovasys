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
[Route("api/[controller]")]
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

        // Enforce role: Admin or Viewer cannot upload documents if Owner role is distinct
        if (userRole != UserRole.Owner && userRole != UserRole.Admin)
        {
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
            ContentType = file.ContentType,
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

        return CreatedAtAction(nameof(GetById), new { id = document.Id }, MapToResponse(document, userId, "Owner", userEmail));
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var (userId, userRole, userEmail) = GetCurrentUser();

        // Admin: by design does not list private documents unless explicitly granted
        // Owner: lists their owned documents + any granted to them
        // Viewer: lists only explicitly granted documents
        var query = _dbContext.Documents
            .Include(d => d.Owner)
            .Include(d => d.Permissions)
            .Where(d => !d.IsDeleted);

        if (userRole == UserRole.Owner)
        {
            query = query.Where(d => d.OwnerId == userId || d.Permissions.Any(p => p.UserId == userId));
        }
        else if (userRole == UserRole.Viewer)
        {
            query = query.Where(d => d.Permissions.Any(p => p.UserId == userId));
        }
        else if (userRole == UserRole.Admin)
        {
            // Least privilege: Admins see only documents they were personally granted
            query = query.Where(d => d.OwnerId == userId || d.Permissions.Any(p => p.UserId == userId));
        }

        var docs = await query.OrderByDescending(d => d.CreatedAt).ToListAsync();

        var response = docs.Select(d =>
        {
            var userPerm = d.OwnerId == userId 
                ? "Owner" 
                : d.Permissions.FirstOrDefault(p => p.UserId == userId)?.Level.ToString() ?? "None";
            return MapToResponse(d, userId, userPerm, d.Owner?.Email ?? "Unknown");
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

        // Base query with access control invariant
        var baseQuery = _dbContext.Documents
            .Include(d => d.Owner)
            .Include(d => d.Permissions)
            .Where(d => !d.IsDeleted);

        if (userRole == UserRole.Owner)
        {
            baseQuery = baseQuery.Where(d => d.OwnerId == userId || d.Permissions.Any(p => p.UserId == userId));
        }
        else
        {
            baseQuery = baseQuery.Where(d => d.Permissions.Any(p => p.UserId == userId));
        }

        // Apply filters
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
            var userPerm = d.OwnerId == userId 
                ? "Owner" 
                : d.Permissions.FirstOrDefault(p => p.UserId == userId)?.Level.ToString() ?? "None";
            return MapToResponse(d, userId, userPerm, d.Owner?.Email ?? "Unknown");
        });

        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var (userId, userRole, userEmail) = GetCurrentUser();

        // Server decides every time via DocumentAuthorizationService
        var authResult = await _authorizationService.EvaluateAccessAsync(
            id, userId, userRole, userEmail, PermissionLevel.Read, GetIpAddress(), GetUserAgent(), "ReadMetadata");

        if (!authResult.IsAuthorized || authResult.Document == null)
        {
            // Invariant: Return 404 to avoid leaking document existence
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

        return Ok(MapToResponse(doc, userId, authResult.GrantedLevel?.ToString() ?? "Read", owner?.Email ?? "Unknown"));
    }

    [HttpGet("{id}/download")]
    public async Task<IActionResult> Download(Guid id)
    {
        var (userId, userRole, userEmail) = GetCurrentUser();

        // Server decides every time
        var authResult = await _authorizationService.EvaluateAccessAsync(
            id, userId, userRole, userEmail, PermissionLevel.Read, GetIpAddress(), GetUserAgent(), "DownloadContent");

        if (!authResult.IsAuthorized || authResult.Document == null)
        {
            return NotFound(new { message = "Document not found." });
        }

        var doc = authResult.Document;

        // Decrypt in memory and stream
        var decryptedStream = await _storageService.GetDecryptedStreamAsync(doc.StorageFileName, doc.EncryptionIv, doc.EncryptionTag);

        // Record successful download to audit trail
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
    public async Task<IActionResult> Update(Guid id, [FromBody] UploadDocumentRequest request)
    {
        var (userId, userRole, userEmail) = GetCurrentUser();

        var authResult = await _authorizationService.EvaluateAccessAsync(
            id, userId, userRole, userEmail, PermissionLevel.Edit, GetIpAddress(), GetUserAgent(), "EditDocument");

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

        var doc = await _dbContext.Documents.FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);
        if (doc == null || doc.OwnerId != userId)
        {
            // Only Owner can delete document
            await _auditService.LogAsync(
                AuditAction.AccessRefused,
                AuditStatus.Refused,
                userId,
                userEmail,
                userRole.ToString(),
                id,
                doc?.Title,
                GetIpAddress(),
                GetUserAgent(),
                "Refused DeleteDocument: Only the document owner can delete.");

            return NotFound(new { message = "Document not found." });
        }

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
            "Document marked as deleted by owner.");

        return Ok(new { message = "Document deleted successfully." });
    }

    private static DocumentResponse MapToResponse(Document d, Guid currentUserId, string permission, string ownerEmail)
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
            permission);
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

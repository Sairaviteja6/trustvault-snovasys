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

        // 3b. Create Initial Version Snapshot (Version 1)
        var initialSnapshot = new DocumentSnapshot
        {
            DocumentId = document.Id,
            VersionNumber = 1,
            StorageFileName = storageFileName,
            EncryptionIv = iv,
            EncryptionTag = tag,
            FileSizeBytes = file.Length,
            FileHashSha256 = sha256,
            EditedByUserId = userId,
            EditedByUserEmail = userEmail,
            EditedByRole = userRole.ToString(),
            ChangeSummary = "Initial Document Upload",
            CreatedAt = DateTime.UtcNow
        };
        _dbContext.DocumentSnapshots.Add(initialSnapshot);
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
            $"Document uploaded ({sanitizedFileName}, {file.Length} bytes)");

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

    [HttpGet("{id}/content")]
    public async Task<IActionResult> GetContent(Guid id)
    {
        var (userId, userRole, userEmail) = GetCurrentUser();

        // Enforce discrete READ or EDIT permission
        var authResult = await _authorizationService.EvaluateAccessAsync(
            id, userId, userRole, userEmail, PermissionType.Read, GetIpAddress(), GetUserAgent(), "ReadContent");

        if (!authResult.IsAuthorized)
        {
            authResult = await _authorizationService.EvaluateAccessAsync(
                id, userId, userRole, userEmail, PermissionType.Edit, GetIpAddress(), GetUserAgent(), "ReadContentForEdit");
        }

        if (!authResult.IsAuthorized || authResult.Document == null)
        {
            return NotFound(new { message = "Document not found." });
        }

        var doc = authResult.Document;
        var decryptedStream = await _storageService.GetDecryptedStreamAsync(doc.StorageFileName, doc.EncryptionIv, doc.EncryptionTag);

        using var memoryStream = new MemoryStream();
        await decryptedStream.CopyToAsync(memoryStream);
        var bytes = memoryStream.ToArray();

        var isPdf = doc.ContentType.Contains("pdf", StringComparison.OrdinalIgnoreCase) || 
                    doc.OriginalFileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase);

        var isImage = doc.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase) ||
                      doc.OriginalFileName.EndsWith(".png", StringComparison.OrdinalIgnoreCase) ||
                      doc.OriginalFileName.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) ||
                      doc.OriginalFileName.EndsWith(".jpeg", StringComparison.OrdinalIgnoreCase) ||
                      doc.OriginalFileName.EndsWith(".webp", StringComparison.OrdinalIgnoreCase) ||
                      doc.OriginalFileName.EndsWith(".svg", StringComparison.OrdinalIgnoreCase);

        var plainText = ExtractPlainText(bytes, doc.OriginalFileName, doc.ContentType);
        var isText = !string.IsNullOrWhiteSpace(plainText);
        string textContent = plainText;
        string? base64Data = Convert.ToBase64String(bytes);

        var currentVersion = await _dbContext.DocumentSnapshots
            .Where(s => s.DocumentId == doc.Id)
            .MaxAsync(s => (int?)s.VersionNumber) ?? 1;

        var actions = authResult.ActivePermissions.Select(p => p.ToString()).ToList();

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
            "Document content viewed in secure inspection panel");

        return Ok(new DocumentContentResponse(
            doc.Id,
            doc.Title,
            doc.ContentType,
            textContent,
            !isText,
            base64Data,
            currentVersion,
            actions));
    }

    [HttpPut("{id}/content")]
    public async Task<IActionResult> EditContent(Guid id, [FromBody] EditDocumentContentRequest request)
    {
        var (userId, userRole, userEmail) = GetCurrentUser();

        // Enforce discrete EDIT permission
        var authResult = await _authorizationService.EvaluateAccessAsync(
            id, userId, userRole, userEmail, PermissionType.Edit, GetIpAddress(), GetUserAgent(), "EditContent");

        if (!authResult.IsAuthorized || authResult.Document == null)
        {
            return NotFound(new { message = "Document not found." });
        }

        var doc = authResult.Document;

        // Encrypt new text content
        var newBytes = System.Text.Encoding.UTF8.GetBytes(request.Content ?? string.Empty);
        using var rawStream = new MemoryStream(newBytes);
        var (newStorageFileName, newIv, newTag, newSha256) = await _storageService.SaveEncryptedAsync(rawStream);

        // Determine next version
        var currentMaxVersion = await _dbContext.DocumentSnapshots
            .Where(s => s.DocumentId == doc.Id)
            .MaxAsync(s => (int?)s.VersionNumber) ?? 1;
        var nextVersion = currentMaxVersion + 1;

        var summary = string.IsNullOrWhiteSpace(request.ChangeSummary) ? "Content edited" : request.ChangeSummary.Trim();

        var snapshot = new DocumentSnapshot
        {
            DocumentId = doc.Id,
            VersionNumber = nextVersion,
            StorageFileName = newStorageFileName,
            EncryptionIv = newIv,
            EncryptionTag = newTag,
            FileSizeBytes = newBytes.Length,
            FileHashSha256 = newSha256,
            EditedByUserId = userId,
            EditedByUserEmail = userEmail,
            EditedByRole = userRole.ToString(),
            ChangeSummary = summary,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.DocumentSnapshots.Add(snapshot);

        // Update active document reference
        doc.StorageFileName = newStorageFileName;
        doc.EncryptionIv = newIv;
        doc.EncryptionTag = newTag;
        doc.FileSizeBytes = newBytes.Length;
        doc.FileHashSha256 = newSha256;
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
            $"Document edited by {userEmail} — Snapshot Version {nextVersion} created ({summary})");

        return Ok(new { message = $"Document updated. Version {nextVersion} snapshot recorded.", version = nextVersion });
    }

    [HttpGet("{id}/snapshots")]
    public async Task<IActionResult> GetSnapshots(Guid id)
    {
        var (userId, userRole, userEmail) = GetCurrentUser();

        // Enforce discrete READ permission to see snapshot history
        var authResult = await _authorizationService.EvaluateAccessAsync(
            id, userId, userRole, userEmail, PermissionType.Read, GetIpAddress(), GetUserAgent(), "ViewSnapshots");

        if (!authResult.IsAuthorized || authResult.Document == null)
        {
            return NotFound(new { message = "Document not found." });
        }

        var snapshots = await _dbContext.DocumentSnapshots
            .Where(s => s.DocumentId == id)
            .OrderByDescending(s => s.VersionNumber)
            .Select(s => new DocumentSnapshotDto(
                s.Id,
                s.VersionNumber,
                s.FileSizeBytes,
                s.EditedByUserEmail,
                s.EditedByRole,
                s.ChangeSummary,
                s.CreatedAt))
            .ToListAsync();

        return Ok(snapshots);
    }

    [HttpPost("{id}/revert/{versionNumber}")]
    public async Task<IActionResult> RevertToSnapshot(Guid id, int versionNumber)
    {
        var (userId, userRole, userEmail) = GetCurrentUser();

        // Only Document Owner can revert changes
        var document = await _dbContext.Documents.FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);
        if (document == null || document.OwnerId != userId)
        {
            return NotFound(new { message = "Document not found or you are not the owner." });
        }

        var targetSnapshot = await _dbContext.DocumentSnapshots
            .FirstOrDefaultAsync(s => s.DocumentId == id && s.VersionNumber == versionNumber);

        if (targetSnapshot == null)
        {
            return NotFound(new { message = $"Version {versionNumber} not found." });
        }

        var currentMaxVersion = await _dbContext.DocumentSnapshots
            .Where(s => s.DocumentId == id)
            .MaxAsync(s => (int?)s.VersionNumber) ?? 1;
        var nextVersion = currentMaxVersion + 1;

        var revertSummary = $"Reverted to Version {versionNumber} (undo changes)";

        var snapshot = new DocumentSnapshot
        {
            DocumentId = document.Id,
            VersionNumber = nextVersion,
            StorageFileName = targetSnapshot.StorageFileName,
            EncryptionIv = targetSnapshot.EncryptionIv,
            EncryptionTag = targetSnapshot.EncryptionTag,
            FileSizeBytes = targetSnapshot.FileSizeBytes,
            FileHashSha256 = targetSnapshot.FileHashSha256,
            EditedByUserId = userId,
            EditedByUserEmail = userEmail,
            EditedByRole = "Owner",
            ChangeSummary = revertSummary,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.DocumentSnapshots.Add(snapshot);

        // Update active document reference to restored snapshot
        document.StorageFileName = targetSnapshot.StorageFileName;
        document.EncryptionIv = targetSnapshot.EncryptionIv;
        document.EncryptionTag = targetSnapshot.EncryptionTag;
        document.FileSizeBytes = targetSnapshot.FileSizeBytes;
        document.FileHashSha256 = targetSnapshot.FileHashSha256;
        document.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        await _auditService.LogAsync(
            AuditAction.DocumentEdit,
            AuditStatus.Allowed,
            userId,
            userEmail,
            "Owner",
            document.Id,
            document.Title,
            GetIpAddress(),
            GetUserAgent(),
            $"Document changes reverted: Owner restored document state to Version {versionNumber} (Snapshot #{nextVersion})");

        return Ok(new { message = $"Document successfully reverted to version {versionNumber} (recorded as Version {nextVersion})." });
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

    private static string ExtractPlainText(byte[] bytes, string fileName, string contentType)
    {
        if (bytes == null || bytes.Length == 0) return string.Empty;

        // 1. Check if the bytes are directly printable UTF-8 text (e.g. in-browser edits, .txt, .md, .csv, code)
        try
        {
            var isBinaryCheck = bytes.Take(Math.Min(bytes.Length, 512)).Any(b => b == 0);
            if (!isBinaryCheck)
            {
                var directText = System.Text.Encoding.UTF8.GetString(bytes);
                if (!string.IsNullOrWhiteSpace(directText))
                {
                    var printable = directText.Count(c => !char.IsControl(c) || c == '\r' || c == '\n' || c == '\t');
                    if (directText.Length > 0 && ((double)printable / directText.Length) > 0.85)
                    {
                        return directText;
                    }
                }
            }
        }
        catch { }

        // 2. Check if binary PDF document (starts with %PDF) - extract actual readable page text
        var isPdfMagic = bytes.Length >= 4 && bytes[0] == 0x25 && bytes[1] == 0x50 && bytes[2] == 0x44 && bytes[3] == 0x46;
        if (isPdfMagic || fileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) || contentType.Contains("pdf", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                using var pdfDoc = UglyToad.PdfPig.PdfDocument.Open(bytes);
                var sb = new System.Text.StringBuilder();
                foreach (var page in pdfDoc.GetPages())
                {
                    var pageText = page.Text;
                    if (!string.IsNullOrWhiteSpace(pageText))
                    {
                        sb.AppendLine($"--- Page {page.Number} ---");
                        sb.AppendLine(pageText.Trim());
                        sb.AppendLine();
                    }
                }
                var extracted = sb.ToString().Trim();
                if (!string.IsNullOrWhiteSpace(extracted))
                {
                    return extracted;
                }
            }
            catch
            {
                // Fallback gracefully without throwing
            }
            return string.Empty;
        }

        // 1. Check if Word Document (.docx)
        if (fileName.EndsWith(".docx", StringComparison.OrdinalIgnoreCase) || 
            contentType.Contains("wordprocessingml", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                using var zipStream = new MemoryStream(bytes);
                using var archive = new System.IO.Compression.ZipArchive(zipStream, System.IO.Compression.ZipArchiveMode.Read);
                var entry = archive.GetEntry("word/document.xml");
                if (entry != null)
                {
                    using var entryStream = entry.Open();
                    var xdoc = System.Xml.Linq.XDocument.Load(entryStream);
                    System.Xml.Linq.XNamespace w = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
                    var paragraphs = xdoc.Descendants(w + "p")
                        .Select(p => string.Concat(p.Descendants(w + "t").Select(t => t.Value)))
                        .Where(pText => !string.IsNullOrWhiteSpace(pText));
                    
                    var docxText = string.Join("\r\n\r\n", paragraphs);
                    if (!string.IsNullOrWhiteSpace(docxText))
                    {
                        return docxText;
                    }
                }
            }
            catch
            {
                // Fallback gracefully
            }
            return string.Empty;
        }

        // 2. Check if Excel (.xlsx)
        if (fileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase) || 
            contentType.Contains("spreadsheetml", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                using var zipStream = new MemoryStream(bytes);
                using var archive = new System.IO.Compression.ZipArchive(zipStream, System.IO.Compression.ZipArchiveMode.Read);
                var sharedStringsEntry = archive.GetEntry("xl/sharedStrings.xml");
                if (sharedStringsEntry != null)
                {
                    using var ssStream = sharedStringsEntry.Open();
                    var xdoc = System.Xml.Linq.XDocument.Load(ssStream);
                    System.Xml.Linq.XNamespace s = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
                    var strings = xdoc.Descendants(s + "t").Select(t => t.Value).Where(v => !string.IsNullOrWhiteSpace(v));
                    var xlsxText = string.Join("\r\n", strings);
                    if (!string.IsNullOrWhiteSpace(xlsxText))
                    {
                        return xlsxText;
                    }
                }
            }
            catch
            {
                // Fallback gracefully
            }
            return string.Empty;
        }

        // Filter out binary media before UTF-8 decoding
        if (contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase) ||
            fileName.EndsWith(".png", StringComparison.OrdinalIgnoreCase) ||
            fileName.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) ||
            fileName.EndsWith(".jpeg", StringComparison.OrdinalIgnoreCase) ||
            fileName.EndsWith(".webp", StringComparison.OrdinalIgnoreCase) ||
            fileName.EndsWith(".svg", StringComparison.OrdinalIgnoreCase) ||
            fileName.EndsWith(".zip", StringComparison.OrdinalIgnoreCase) ||
            fileName.EndsWith(".tar", StringComparison.OrdinalIgnoreCase) ||
            fileName.EndsWith(".gz", StringComparison.OrdinalIgnoreCase) ||
            fileName.EndsWith(".bin", StringComparison.OrdinalIgnoreCase) ||
            fileName.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
        {
            return string.Empty;
        }

        // 3. UTF-8 or printable text extraction (for .txt, .md, .csv, .json, .xml, .cs, .js, .py, etc.)
        try
        {
            // If bytes contain null characters, it's definitely binary data
            if (bytes.Take(Math.Min(bytes.Length, 1024)).Any(b => b == 0))
            {
                return string.Empty;
            }

            var text = System.Text.Encoding.UTF8.GetString(bytes);
            if (!string.IsNullOrWhiteSpace(text))
            {
                var clean = text.Replace("\0", string.Empty);
                var printableCount = clean.Count(c => !char.IsControl(c) || c == '\r' || c == '\n' || c == '\t');
                // Ensure at least 95% of characters are printable standard text
                if (clean.Length > 0 && ((double)printableCount / clean.Length) > 0.95)
                {
                    return clean;
                }
            }
        }
        catch
        {
            // Ignore
        }

        return string.Empty;
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

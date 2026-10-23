using TrustVault.Core.Enums;

namespace TrustVault.Api.DTOs;

public record RegisterRequest(string Username, string Email, string Password, UserRole Role, string? Department);
public record LoginRequest(string Email, string Password);
public record AuthResponse(string Token, string RefreshToken, DateTime Expiration, UserDto User);
public record RefreshTokenRequest(string RefreshToken);
public record UserDto(Guid Id, string Username, string Email, string Role, string? Department, bool IsActive, DateTime CreatedAt, bool IsMasterAdmin = false, bool MustChangePassword = false, string? Organization = null);
public record SetPasswordRequest(string Email, string CurrentPassword, string NewPassword);
public record UpdateUsernameRequest(string NewUsername);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

// Provisioning
public record CreateAdminRequest(string Username, string Email, string Password, string? Department);
public record CreateOwnerRequest(string Username, string Email, string Password, string? Department);
public record CreateViewerRequest(string Username, string Email, string Password, string? Department, List<string>? InitialTags);

public record UploadDocumentRequest(string Title, string Description, string Category);
public record UpdateDocumentRequest(string Title, string Description, string Category);

public record DocumentResponse(
    Guid Id,
    string Title,
    string Description,
    string Category,
    string OriginalFileName,
    string ContentType,
    long FileSizeBytes,
    string FileHashSha256,
    Guid OwnerId,
    string OwnerEmail,
    DateTime CreatedAt,
    List<string> PermittedActions);

public record GrantPermissionRequest(Guid UserId, List<PermissionType> Permissions);
public record GrantByTagRequest(string TagName, List<PermissionType> Permissions);
public record PermissionResponse(Guid GrantId, Guid UserId, string Username, string Email, string PermissionType, DateTime GrantedAtUtc);

public record AuditLogDto(
    long Id,
    DateTime Timestamp,
    Guid? UserId,
    string? UserEmail,
    string? UserRole,
    string Action,
    string Status,
    Guid? DocumentId,
    string? DocumentTitle,
    string IpAddress,
    string UserAgent,
    string? Details,
    string PreviousHash,
    string CurrentHash);

public record AssignTagRequest(Guid UserId, string TagName);
public record UserTagDto(Guid Id, Guid UserId, string Username, string Email, string TagName);

public record AdminMetricsResponse(
    int TotalActiveOwners,
    int TotalActiveViewers,
    int TotalDocuments,
    int TotalAuditLogs,
    int TotalRefusedAttempts,
    List<AuditLogDto> RecentRefusedAttempts);

public record EditDocumentContentRequest(string Content, string? ChangeSummary);
public record DocumentSnapshotDto(Guid Id, int VersionNumber, long FileSizeBytes, string EditedByUserEmail, string EditedByRole, string ChangeSummary, DateTime CreatedAt);
public record DocumentContentResponse(Guid Id, string Title, string ContentType, string TextContent, bool IsBinary, string? Base64Data, int CurrentVersion, List<string> PermittedActions);


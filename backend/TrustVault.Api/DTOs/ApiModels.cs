using TrustVault.Core.Enums;

namespace TrustVault.Api.DTOs;

public record RegisterRequest(string Username, string Email, string Password, UserRole Role, string? Department);
public record LoginRequest(string Email, string Password);
public record AuthResponse(string Token, string RefreshToken, DateTime Expiration, UserDto User);
public record RefreshTokenRequest(string RefreshToken);
public record UserDto(Guid Id, string Username, string Email, string Role, string? Department);

public record UploadDocumentRequest(string Title, string Description, string Category);
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
    string CurrentUserPermission);

public record GrantPermissionRequest(Guid UserId, PermissionLevel Level);
public record GrantByTagRequest(string TagName, PermissionLevel Level);
public record PermissionResponse(Guid PermissionId, Guid UserId, string Username, string Email, string Level, DateTime GrantedAt);

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

namespace TrustVault.Core.Enums;

public enum AuditAction
{
    UserRegistered = 1,
    UserLogin = 2,
    UserLogout = 3,
    DocumentUpload = 4,
    DocumentRead = 5,
    DocumentDownload = 6,
    DocumentEdit = 7,
    DocumentDelete = 8,
    PermissionGranted = 9,
    PermissionRevoked = 10,
    AccessRefused = 11
}

public enum AuditStatus
{
    Allowed = 1,
    Refused = 2
}

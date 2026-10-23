using TrustVault.Core.Enums;

namespace TrustVault.Core.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Viewer;
    public string? Department { get; set; }
    public string? Organization { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsMasterAdmin { get; set; } = false;
    public Guid? CreatedByAdminId { get; set; }
    public bool MustChangePassword { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Refresh token revocation tracking
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiryTime { get; set; }
    public bool IsRevoked { get; set; } = false;

    // Navigation
    public ICollection<Document> OwnedDocuments { get; set; } = new List<Document>();
    public ICollection<DocumentGrant> ReceivedGrants { get; set; } = new List<DocumentGrant>();
    public ICollection<DocumentGrant> GrantedGrants { get; set; } = new List<DocumentGrant>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
}

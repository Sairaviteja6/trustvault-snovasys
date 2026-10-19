using TrustVault.Core.Enums;

namespace TrustVault.Core.Entities;

public class AuditLog
{
    public long Id { get; set; } // Sequential Identity key (vital for strict chronological hash chaining)
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public Guid? UserId { get; set; }
    public string? UserEmail { get; set; }
    public string? UserRole { get; set; }

    public AuditAction Action { get; set; }
    public AuditStatus Status { get; set; } = AuditStatus.Allowed;

    public Guid? DocumentId { get; set; }
    public string? DocumentTitle { get; set; }

    public string IpAddress { get; set; } = "127.0.0.1";
    public string UserAgent { get; set; } = string.Empty;

    public string? Details { get; set; }

    // Cryptographic Hash Chain:
    // CurrentHash = SHA256(PreviousHash + Id + Timestamp + UserId + Action + Status + DocumentId + Details)
    public string PreviousHash { get; set; } = "0000000000000000000000000000000000000000000000000000000000000000"; // Genesis hash for 1st log
    public string CurrentHash { get; set; } = string.Empty;

    // Navigation
    public User? User { get; set; }
    public Document? Document { get; set; }
}

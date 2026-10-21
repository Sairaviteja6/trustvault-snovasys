namespace TrustVault.Core.Entities;

public class Document
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = "General"; // Salary, Contracts, Audit, Engineering, etc.
    
    // File metadata (original name preserved for display; storage file uses random GUID)
    public string OriginalFileName { get; set; } = string.Empty;
    public string StorageFileName { get; set; } = string.Empty; // Random GUID filename on encrypted storage
    public string ContentType { get; set; } = "application/octet-stream";
    public long FileSizeBytes { get; set; }
    public string FileHashSha256 { get; set; } = string.Empty; // SHA256 of original file for integrity verification
    
    // AES-256-GCM specific encryption metadata per file
    public byte[] EncryptionIv { get; set; } = Array.Empty<byte>();
    public byte[] EncryptionTag { get; set; } = Array.Empty<byte>();

    public Guid OwnerId { get; set; }
    public User? Owner { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public bool IsDeleted { get; set; } = false;

    // Navigation
    public ICollection<DocumentGrant> Grants { get; set; } = new List<DocumentGrant>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
    public ICollection<DocumentSnapshot> Snapshots { get; set; } = new List<DocumentSnapshot>();
}

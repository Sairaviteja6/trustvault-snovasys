namespace TrustVault.Core.Entities;

public class DocumentSnapshot
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DocumentId { get; set; }
    public Document? Document { get; set; }

    public int VersionNumber { get; set; }
    public string StorageFileName { get; set; } = string.Empty;
    public byte[] EncryptionIv { get; set; } = Array.Empty<byte>();
    public byte[] EncryptionTag { get; set; } = Array.Empty<byte>();
    public long FileSizeBytes { get; set; }
    public string FileHashSha256 { get; set; } = string.Empty;

    public Guid EditedByUserId { get; set; }
    public string EditedByUserEmail { get; set; } = string.Empty;
    public string EditedByRole { get; set; } = string.Empty;
    public string ChangeSummary { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

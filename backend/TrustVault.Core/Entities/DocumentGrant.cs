using TrustVault.Core.Enums;

namespace TrustVault.Core.Entities;

public class DocumentGrant
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid DocumentId { get; set; }
    public Document? Document { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public Guid GrantedByUserId { get; set; }
    public User? GrantedByUser { get; set; }

    public PermissionType PermissionType { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }

    public bool IsActive => RevokedAtUtc == null;
}

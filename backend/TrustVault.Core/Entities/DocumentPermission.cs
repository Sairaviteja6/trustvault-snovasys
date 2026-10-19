using TrustVault.Core.Enums;

namespace TrustVault.Core.Entities;

public class DocumentPermission
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid DocumentId { get; set; }
    public Document? Document { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public PermissionLevel Level { get; set; } = PermissionLevel.Read;

    public Guid GrantedByUserId { get; set; }
    public User? GrantedByUser { get; set; }

    public DateTime GrantedAt { get; set; } = DateTime.UtcNow;
}

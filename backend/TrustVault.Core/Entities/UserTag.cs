namespace TrustVault.Core.Entities;

public class UserTag
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // The owner who organized this user into a tag
    public Guid OwnerId { get; set; }
    public User? Owner { get; set; }

    // The target user assigned to this tag
    public Guid UserId { get; set; }
    public User? User { get; set; }

    // e.g. "Developer", "Finance", "Auditor", "External Partner"
    public string TagName { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

namespace TrustVault.Core.Entities;

public class ClientInquiry
{
    public string Id { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Organization { get; set; } = string.Empty;
    public string? Department { get; set; }
    public string RequestedRole { get; set; } = "Owner"; // "Owner" or "Admin"
    public string UseCase { get; set; } = string.Empty;
    public string TeamSize { get; set; } = string.Empty;
    public string? Message { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "Pending"; // "Pending", "Approved", "Contacted"
    public Guid? ProvisionedUserId { get; set; }
    public DateTime? ProvisionedAt { get; set; }
}

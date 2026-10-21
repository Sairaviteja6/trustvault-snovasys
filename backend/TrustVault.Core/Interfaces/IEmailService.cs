namespace TrustVault.Core.Interfaces;

public interface IEmailService
{
    Task<bool> SendInquiryReceiptAsync(string recipientEmail, string recipientName, string organization, string referenceId, string requestedRole);
    Task<bool> SendProvisionedCredentialsAsync(string recipientEmail, string recipientName, string username, string temporaryPassword, string role, string loginUrl);
}

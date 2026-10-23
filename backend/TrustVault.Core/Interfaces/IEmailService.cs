namespace TrustVault.Core.Interfaces;

public interface IEmailService
{
    Task<bool> SendInquiryReceiptAsync(string recipientEmail, string recipientName, string organization, string referenceId, string requestedRole);
    Task<bool> SendProvisionedCredentialsAsync(string recipientEmail, string recipientName, string username, string temporaryPassword, string role, string loginUrl);
    Task<bool> SendInquiryRejectedAsync(string recipientEmail, string recipientName, string organization, string referenceId, string reason);
    Task<bool> SendDocumentAccessGrantedAsync(string recipientEmail, string recipientName, string documentTitle, string grantedByOwnerName, string permissionType, string documentViewUrl);
}

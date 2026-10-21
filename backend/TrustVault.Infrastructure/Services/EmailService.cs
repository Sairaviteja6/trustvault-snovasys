using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using TrustVault.Core.Interfaces;

namespace TrustVault.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task<bool> SendInquiryReceiptAsync(string recipientEmail, string recipientName, string organization, string referenceId, string requestedRole)
    {
        var subject = $"TrustVault Platform — Inquiry Received [{referenceId}]";
        var body = $@"
<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1.0'>
  <title>TrustVault Inquiry Confirmation</title>
</head>
<body style='margin:0; padding:24px; background-color:#f1f5f9; font-family:-apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; color:#0f172a;'>
  <div style='max-width:600px; margin:0 auto; background-color:#ffffff; border:1px solid #e2e8f0; border-radius:12px; box-shadow:0 4px 16px rgba(0,0,0,0.06); overflow:hidden;'>
    <!-- Brand Header -->
    <div style='background-color:#0f172a; padding:24px 32px; border-bottom:3px solid #0284c7;'>
      <div style='font-size:22px; font-weight:800; color:#ffffff; letter-spacing:-0.5px;'>
        TRUST<span style='color:#38bdf8;'>VAULT</span>
      </div>
      <div style='font-size:12px; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin-top:4px;'>
        Cryptographic Zero-Trust Document Platform
      </div>
    </div>

    <!-- Content Body -->
    <div style='padding:32px;'>
      <h2 style='margin:0 0 16px 0; font-size:20px; font-weight:700; color:#0f172a;'>Enterprise Inquiry Registered</h2>
      <p style='margin:0 0 14px 0; font-size:15px; line-height:1.6; color:#334155;'>
        Dear <strong>{recipientName}</strong>,
      </p>
      <p style='margin:0 0 20px 0; font-size:15px; line-height:1.6; color:#334155;'>
        Thank you for your inquiry. Your onboarding request for <strong>{organization}</strong> has been logged into our zero-trust ledger and routed to the platform security officer for review.
      </p>

      <!-- Details Box -->
      <div style='background-color:#f8fafc; border:1px solid #cbd5e1; border-left:4px solid #0f172a; border-radius:8px; padding:18px 20px; margin:24px 0;'>
        <table style='width:100%; border-collapse:collapse; font-size:14px;'>
          <tr>
            <td style='padding:6px 0; color:#64748b; width:40%; font-weight:600;'>Reference ID:</td>
            <td style='padding:6px 0; color:#0f172a; font-weight:700; font-family:monospace; font-size:15px;'>{referenceId}</td>
          </tr>
          <tr>
            <td style='padding:6px 0; color:#64748b; font-weight:600;'>Organization:</td>
            <td style='padding:6px 0; color:#0f172a; font-weight:600;'>{organization}</td>
          </tr>
          <tr>
            <td style='padding:6px 0; color:#64748b; font-weight:600;'>Requested Role:</td>
            <td style='padding:6px 0; color:#0f172a;'>
              <span style='display:inline-block; background-color:#e2e8f0; color:#0f172a; font-weight:700; padding:2px 8px; border-radius:4px; font-size:12px;'>{requestedRole}</span>
            </td>
          </tr>
          <tr>
            <td style='padding:6px 0; color:#64748b; font-weight:600;'>Timestamp:</td>
            <td style='padding:6px 0; color:#475569;'>{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</td>
          </tr>
        </table>
      </div>

      <p style='margin:0 0 16px 0; font-size:14px; line-height:1.6; color:#475569;'>
        Once approved by our platform administrator, your provisioned security credentials will be dispatched to this email address along with instructions on accessing the confidential document workspace.
      </p>
    </div>

    <!-- Footer -->
    <div style='background-color:#f8fafc; border-top:1px solid #e2e8f0; padding:20px 32px; font-size:12px; line-height:1.6; color:#64748b;'>
      &copy; 2026 TrustVault Cryptographic Platform. All rights reserved.<br/>
      123 Secure Way, Suite 400, Tech District, CA 94105 &bull; support@trustvault.com
    </div>
  </div>
</body>
</html>";

        return await SendMailInternalAsync(recipientEmail, subject, body);
    }

    public async Task<bool> SendProvisionedCredentialsAsync(string recipientEmail, string recipientName, string username, string temporaryPassword, string role, string loginUrl)
    {
        var subject = $"TrustVault Access Granted — Your {role} Credentials";
        var body = $@"
<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1.0'>
  <title>TrustVault Access Credentials</title>
</head>
<body style='margin:0; padding:24px; background-color:#f1f5f9; font-family:-apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; color:#0f172a;'>
  <div style='max-width:600px; margin:0 auto; background-color:#ffffff; border:1px solid #e2e8f0; border-radius:12px; box-shadow:0 4px 16px rgba(0,0,0,0.06); overflow:hidden;'>
    <!-- Brand Header -->
    <div style='background-color:#0f172a; padding:24px 32px; border-bottom:3px solid #0284c7;'>
      <div style='font-size:22px; font-weight:800; color:#ffffff; letter-spacing:-0.5px;'>
        TRUST<span style='color:#38bdf8;'>VAULT</span>
      </div>
      <div style='font-size:12px; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin-top:4px;'>
        Cryptographic Zero-Trust Document Platform
      </div>
    </div>

    <!-- Content Body -->
    <div style='padding:32px;'>
      <h2 style='margin:0 0 16px 0; font-size:20px; font-weight:700; color:#0f172a;'>Access Granted — Your Credentials</h2>
      <p style='margin:0 0 14px 0; font-size:15px; line-height:1.6; color:#334155;'>
        Dear <strong>{recipientName}</strong>,
      </p>
      <p style='margin:0 0 20px 0; font-size:15px; line-height:1.6; color:#334155;'>
        Your request for <strong>{role}</strong> access on the TrustVault Platform has been approved by the Administrator. Your personal workspace credentials have been provisioned:
      </p>

      <!-- Credentials Card -->
      <div style='background-color:#f8fafc; border:1px solid #cbd5e1; border-left:4px solid #0284c7; border-radius:8px; padding:20px; margin:24px 0;'>
        <div style='font-size:12px; font-weight:700; text-transform:uppercase; color:#64748b; letter-spacing:0.5px; margin-bottom:12px;'>
          Confidential Login Details
        </div>
        <table style='width:100%; border-collapse:collapse; font-size:14px;'>
          <tr>
            <td style='padding:8px 0; color:#475569; width:38%; font-weight:600;'>Assigned Role:</td>
            <td style='padding:8px 0; color:#0f172a; font-weight:700;'>{role}</td>
          </tr>
          <tr>
            <td style='padding:8px 0; color:#475569; font-weight:600;'>Email / Identity:</td>
            <td style='padding:8px 0;'>
              <span style='font-family:monospace; font-size:14px; font-weight:700; color:#0f172a; background-color:#e2e8f0; padding:4px 8px; border-radius:4px;'>{recipientEmail}</span>
            </td>
          </tr>
          <tr>
            <td style='padding:8px 0; color:#475569; font-weight:600;'>Username:</td>
            <td style='padding:8px 0;'>
              <span style='font-family:monospace; font-size:14px; font-weight:700; color:#0f172a; background-color:#e2e8f0; padding:4px 8px; border-radius:4px;'>{username}</span>
            </td>
          </tr>
          <tr>
            <td style='padding:8px 0; color:#475569; font-weight:600;'>Password:</td>
            <td style='padding:8px 0;'>
              <span style='font-family:monospace; font-size:15px; font-weight:800; color:#0f172a; background-color:#fef08a; border:1px solid #ca8a04; padding:4px 10px; border-radius:4px;'>{temporaryPassword}</span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Action Button -->
      <div style='margin:28px 0; text-align:center;'>
        <a href='{loginUrl}' target='_blank' style='display:inline-block; background-color:#0f172a; color:#ffffff !important; text-decoration:none; padding:14px 32px; border-radius:8px; font-weight:700; font-size:15px; box-shadow:0 4px 12px rgba(15,23,42,0.25);'>
          Sign In to TrustVault &rarr;
        </a>
      </div>

      <p style='margin:24px 0 0 0; font-size:13px; line-height:1.6; color:#64748b;'>
        Please keep these credentials secure. Once logged in, you can view confidential documents, manage cryptographic snapshots, and inspect verified zero-trust logs.
      </p>
    </div>

    <!-- Footer -->
    <div style='background-color:#f8fafc; border-top:1px solid #e2e8f0; padding:20px 32px; font-size:12px; line-height:1.6; color:#64748b;'>
      &copy; 2026 TrustVault Cryptographic Platform. All rights reserved.<br/>
      123 Secure Way, Suite 400, Tech District, CA 94105 &bull; support@trustvault.com
    </div>
  </div>
</body>
</html>";

        return await SendMailInternalAsync(recipientEmail, subject, body);
    }


    private async Task<bool> SendMailInternalAsync(string toEmail, string subject, string htmlBody)
    {
        var smtpHost = _config["Smtp:Host"];
        var smtpPortStr = _config["Smtp:Port"];
        var smtpUser = _config["Smtp:Username"];
        var smtpPass = _config["Smtp:Password"];
        var fromEmail = _config["Smtp:From"] ?? "noreply@trustvault.com";

        // Record outgoing email to outbox directory for local inspection & auditing
        try
        {
            var outboxDir = Path.Combine(AppContext.BaseDirectory, "OutboxEmails");
            Directory.CreateDirectory(outboxDir);
            var safeFile = $"{DateTime.UtcNow:yyyyMMdd_HHmmss}_{Guid.NewGuid().ToString().Substring(0, 8)}.html";
            var filePath = Path.Combine(outboxDir, safeFile);
            var fileContent = $"<!-- TO: {toEmail} | SUBJECT: {subject} | DATE: {DateTime.UtcNow} -->\n" + htmlBody;
            await File.WriteAllTextAsync(filePath, fileContent);
            _logger.LogInformation("TrustVault Email recorded to Outbox: {FilePath} -> To: {ToEmail}", filePath, toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to write email to Outbox directory.");
        }

        // If SMTP server is configured, attempt network delivery
        if (!string.IsNullOrWhiteSpace(smtpHost) && int.TryParse(smtpPortStr, out var port))
        {
            try
            {
                using var client = new SmtpClient(smtpHost, port);
                client.EnableSsl = bool.TryParse(_config["Smtp:EnableSsl"], out var ssl) && ssl;
                client.DeliveryMethod = SmtpDeliveryMethod.Network;
                client.UseDefaultCredentials = false;
                if (!string.IsNullOrWhiteSpace(smtpUser) && !string.IsNullOrWhiteSpace(smtpPass))
                {
                    client.Credentials = new NetworkCredential(smtpUser, smtpPass);
                }

                using var message = new MailMessage(fromEmail, toEmail)
                {
                    Subject = subject,
                    Body = htmlBody,
                    IsBodyHtml = true
                };

                await client.SendMailAsync(message);
                _logger.LogInformation("Email successfully dispatched via SMTP to {ToEmail}: {Subject}", toEmail, subject);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to dispatch email via SMTP to {ToEmail}. Falling back to Outbox file.", toEmail);
                return false;
            }
        }

        _logger.LogInformation("SMTP Host not specified in appsettings.json. Outbox file written successfully for {ToEmail}.", toEmail);
        return true;
    }
}

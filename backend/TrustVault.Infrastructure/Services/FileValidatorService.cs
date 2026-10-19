using TrustVault.Core.Interfaces;

namespace TrustVault.Infrastructure.Services;

public class FileValidatorService : IFileValidatorService
{
    private const long MaxFileSize = 25 * 1024 * 1024; // 25 MB limit

    // Magic byte signatures for authorized enterprise file formats
    private static readonly Dictionary<string, List<byte[]>> FileSignatures = new(StringComparer.OrdinalIgnoreCase)
    {
        { ".pdf",  new List<byte[]> { new byte[] { 0x25, 0x50, 0x44, 0x46 } } }, // %PDF
        { ".png",  new List<byte[]> { new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A } } },
        { ".jpg",  new List<byte[]> { new byte[] { 0xFF, 0xD8, 0xFF } } },
        { ".jpeg", new List<byte[]> { new byte[] { 0xFF, 0xD8, 0xFF } } },
        { ".docx", new List<byte[]> { new byte[] { 0x50, 0x4B, 0x03, 0x04 } } }, // PK zip header
        { ".xlsx", new List<byte[]> { new byte[] { 0x50, 0x4B, 0x03, 0x04 } } }, // PK zip header
        { ".txt",  new List<byte[]>() }, // plain text
        { ".csv",  new List<byte[]>() }  // plain text CSV
    };

    private static readonly HashSet<string> BlockedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".exe", ".dll", ".bat", ".cmd", ".ps1", ".vbs", ".js", ".msi", ".com", ".scr", ".sh", ".py"
    };

    public (bool isValid, string? errorMessage, string sanitizedFileName) Validate(
        Stream fileStream,
        string fileName,
        string declaredContentType,
        long fileSizeBytes)
    {
        // 1. Sanitize file name (remove path traversal attacks ../ or ..\ and null bytes)
        var sanitized = Path.GetFileName(fileName);
        sanitized = string.Concat(sanitized.Split(Path.GetInvalidFileNameChars()));

        if (string.IsNullOrWhiteSpace(sanitized))
        {
            return (false, "Invalid file name.", string.Empty);
        }

        // 2. Check file size
        if (fileSizeBytes <= 0)
        {
            return (false, "File cannot be empty.", sanitized);
        }

        if (fileSizeBytes > MaxFileSize)
        {
            return (false, $"File size exceeds maximum allowed limit of {MaxFileSize / (1024 * 1024)}MB.", sanitized);
        }

        // 3. Check extension
        var extension = Path.GetExtension(sanitized).ToLowerInvariant();
        if (BlockedExtensions.Contains(extension))
        {
            return (false, $"Executable and script files ({extension}) are strictly prohibited.", sanitized);
        }

        if (!FileSignatures.ContainsKey(extension))
        {
            return (false, $"File extension '{extension}' is not supported.", sanitized);
        }

        // 4. Magic bytes inspection
        var allowedSignatures = FileSignatures[extension];
        if (allowedSignatures.Count > 0)
        {
            var headerBytes = new byte[8];
            var originalPosition = fileStream.CanSeek ? fileStream.Position : 0;

            if (fileStream.CanSeek)
            {
                fileStream.Position = 0;
            }

            var readCount = fileStream.Read(headerBytes, 0, headerBytes.Length);

            if (fileStream.CanSeek)
            {
                fileStream.Position = originalPosition;
            }

            var matched = allowedSignatures.Any(sig => 
                readCount >= sig.Length && headerBytes.Take(sig.Length).SequenceEqual(sig));

            if (!matched)
            {
                return (false, "File content header does not match declared extension.", sanitized);
            }
        }

        return (true, null, sanitized);
    }
}

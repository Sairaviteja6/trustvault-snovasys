namespace TrustVault.Core.Interfaces;

public interface IFileValidatorService
{
    (bool isValid, string? errorMessage, string sanitizedFileName) Validate(Stream fileStream, string fileName, string declaredContentType, long fileSizeBytes);
}

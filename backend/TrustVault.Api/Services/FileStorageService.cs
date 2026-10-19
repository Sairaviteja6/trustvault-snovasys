using TrustVault.Core.Interfaces;

namespace TrustVault.Api.Services;

public interface IFileStorageService
{
    Task<(string storageFileName, byte[] iv, byte[] tag, string sha256Hash)> SaveEncryptedAsync(Stream originalStream);
    Task<Stream> GetDecryptedStreamAsync(string storageFileName, byte[] iv, byte[] tag);
    Task DeleteAsync(string storageFileName);
}

public class LocalEncryptedFileStorageService : IFileStorageService
{
    private readonly string _storageDirectory;
    private readonly IEncryptionService _encryptionService;

    public LocalEncryptedFileStorageService(IConfiguration configuration, IEncryptionService encryptionService, IWebHostEnvironment environment)
    {
        _encryptionService = encryptionService;

        // Secure directory outside web root
        var configuredPath = configuration["Storage:EncryptedBlobDirectory"];
        _storageDirectory = !string.IsNullOrWhiteSpace(configuredPath)
            ? configuredPath
            : Path.Combine(environment.ContentRootPath, "..", "Storage", "encrypted_blobs");

        if (!Directory.Exists(_storageDirectory))
        {
            Directory.CreateDirectory(_storageDirectory);
        }
    }

    public async Task<(string storageFileName, byte[] iv, byte[] tag, string sha256Hash)> SaveEncryptedAsync(Stream originalStream)
    {
        var storageFileName = $"{Guid.NewGuid():N}.blob";
        var fullPath = Path.Combine(_storageDirectory, storageFileName);

        // Compute original file SHA256
        var sha256Hash = await _encryptionService.ComputeSha256Async(originalStream);

        using var fileStream = new FileStream(fullPath, FileMode.CreateNew, FileAccess.Write, FileShare.None);
        var (iv, tag) = await _encryptionService.EncryptAsync(originalStream, fileStream);

        return (storageFileName, iv, tag, sha256Hash);
    }

    public async Task<Stream> GetDecryptedStreamAsync(string storageFileName, byte[] iv, byte[] tag)
    {
        var fullPath = Path.Combine(_storageDirectory, storageFileName);
        if (!File.Exists(fullPath))
        {
            throw new FileNotFoundException("Encrypted blob file does not exist on storage.", storageFileName);
        }

        var decryptedMemory = new MemoryStream();
        using (var encryptedStream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read))
        {
            await _encryptionService.DecryptAsync(encryptedStream, decryptedMemory, iv, tag);
        }

        decryptedMemory.Position = 0;
        return decryptedMemory;
    }

    public Task DeleteAsync(string storageFileName)
    {
        var fullPath = Path.Combine(_storageDirectory, storageFileName);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }
        return Task.CompletedTask;
    }
}

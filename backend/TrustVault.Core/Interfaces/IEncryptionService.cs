namespace TrustVault.Core.Interfaces;

public interface IEncryptionService
{
    Task<(byte[] iv, byte[] tag)> EncryptAsync(Stream sourceStream, Stream destinationStream);
    Task DecryptAsync(Stream sourceStream, Stream destinationStream, byte[] iv, byte[] tag);
    Task<string> ComputeSha256Async(Stream stream);
}

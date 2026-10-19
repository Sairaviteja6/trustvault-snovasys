using System.Security.Cryptography;
using Microsoft.Extensions.Configuration;
using TrustVault.Core.Interfaces;

namespace TrustVault.Infrastructure.Services;

public class AesGcmEncryptionService : IEncryptionService
{
    private readonly byte[] _masterKey;
    private const int NonceSize = 12; // 96-bit standard nonce for AES-GCM
    private const int TagSize = 16;   // 128-bit authentication tag

    public AesGcmEncryptionService(IConfiguration configuration)
    {
        // 256-bit (32 byte) master key from configuration or environment
        var keyHex = configuration["Security:MasterEncryptionKeyHex"] 
                     ?? "0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF"; // Default fallback for dev only
        _masterKey = Convert.FromHexString(keyHex);

        if (_masterKey.Length != 32)
        {
            throw new ArgumentException("Master encryption key must be exactly 256 bits (32 bytes).");
        }
    }

    public async Task<(byte[] iv, byte[] tag)> EncryptAsync(Stream sourceStream, Stream destinationStream)
    {
        using var memoryStream = new MemoryStream();
        await sourceStream.CopyToAsync(memoryStream);
        var plaintext = memoryStream.ToArray();

        var nonce = new byte[NonceSize];
        RandomNumberGenerator.Fill(nonce);

        var tag = new byte[TagSize];
        var ciphertext = new byte[plaintext.Length];

        using (var aesGcm = new AesGcm(_masterKey, TagSize))
        {
            aesGcm.Encrypt(nonce, plaintext, ciphertext, tag);
        }

        await destinationStream.WriteAsync(ciphertext);
        return (nonce, tag);
    }

    public async Task DecryptAsync(Stream sourceStream, Stream destinationStream, byte[] iv, byte[] tag)
    {
        using var memoryStream = new MemoryStream();
        await sourceStream.CopyToAsync(memoryStream);
        var ciphertext = memoryStream.ToArray();

        var plaintext = new byte[ciphertext.Length];

        using (var aesGcm = new AesGcm(_masterKey, TagSize))
        {
            aesGcm.Decrypt(iv, ciphertext, tag, plaintext);
        }

        await destinationStream.WriteAsync(plaintext);
    }

    public async Task<string> ComputeSha256Async(Stream stream)
    {
        using var sha256 = SHA256.Create();
        if (stream.CanSeek)
        {
            stream.Position = 0;
        }
        var hashBytes = await sha256.ComputeHashAsync(stream);
        if (stream.CanSeek)
        {
            stream.Position = 0;
        }
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }
}

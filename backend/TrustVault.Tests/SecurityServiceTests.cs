using System.Security.Cryptography;
using System.Text;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using TrustVault.Infrastructure.Services;
using Xunit;

namespace TrustVault.Tests;

public class SecurityServiceTests
{
    private readonly AesGcmEncryptionService _encryptionService;
    private readonly FileValidatorService _fileValidator;

    public SecurityServiceTests()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "Security:MasterEncryptionKeyHex", "0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF" }
            })
            .Build();

        _encryptionService = new AesGcmEncryptionService(config);
        _fileValidator = new FileValidatorService();
    }

    [Fact]
    public async Task EncryptionService_EncryptAndDecrypt_ShouldRestoreExactPlaintext()
    {
        // Arrange
        var originalText = "Confidential Salary Data: CEO = $500,000, VP = $250,000";
        var originalBytes = Encoding.UTF8.GetBytes(originalText);
        using var sourceStream = new MemoryStream(originalBytes);
        using var encryptedStream = new MemoryStream();

        // Act - Encrypt
        var (iv, tag) = await _encryptionService.EncryptAsync(sourceStream, encryptedStream);

        // Ciphertext should not match plaintext
        var cipherBytes = encryptedStream.ToArray();
        cipherBytes.Should().NotEqual(originalBytes);

        // Act - Decrypt
        encryptedStream.Position = 0;
        using var decryptedStream = new MemoryStream();
        await _encryptionService.DecryptAsync(encryptedStream, decryptedStream, iv, tag);

        // Assert
        var decryptedText = Encoding.UTF8.GetString(decryptedStream.ToArray());
        decryptedText.Should().Be(originalText);
    }

    [Fact]
    public async Task EncryptionService_TamperedCiphertext_ShouldThrowCryptographicException()
    {
        // Arrange
        var originalBytes = Encoding.UTF8.GetBytes("Secret contract clause.");
        using var sourceStream = new MemoryStream(originalBytes);
        using var encryptedStream = new MemoryStream();

        var (iv, tag) = await _encryptionService.EncryptAsync(sourceStream, encryptedStream);
        var cipherBytes = encryptedStream.ToArray();

        // Flip a bit in the ciphertext
        cipherBytes[0] ^= 0x01;
        using var tamperedStream = new MemoryStream(cipherBytes);
        using var decryptedStream = new MemoryStream();

        // Act & Assert (AEAD integrity tag mismatch must throw)
        var act = async () => await _encryptionService.DecryptAsync(tamperedStream, decryptedStream, iv, tag);
        await act.Should().ThrowAsync<CryptographicException>();
    }

    [Fact]
    public void FileValidator_ValidPdfWithMagicBytes_ShouldSucceed()
    {
        // %PDF magic bytes
        var pdfBytes = new byte[] { 0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x35 };
        using var stream = new MemoryStream(pdfBytes);

        var (isValid, errorMessage, sanitized) = _fileValidator.Validate(stream, "contract.pdf", "application/pdf", pdfBytes.Length);

        isValid.Should().BeTrue();
        errorMessage.Should().BeNull();
        sanitized.Should().Be("contract.pdf");
    }

    [Fact]
    public void FileValidator_ExecutableMaskedAsPdf_ShouldBeRejected()
    {
        // MZ header (DOS/Windows executable header) but renamed to .pdf
        var exeBytes = new byte[] { 0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00 };
        using var stream = new MemoryStream(exeBytes);

        var (isValid, errorMessage, sanitized) = _fileValidator.Validate(stream, "trojan.pdf", "application/pdf", exeBytes.Length);

        isValid.Should().BeFalse();
        errorMessage.Should().Contain("File content header does not match declared extension");
    }

    [Fact]
    public void FileValidator_PathTraversalInFileName_ShouldBeSanitized()
    {
        var textBytes = Encoding.UTF8.GetBytes("Simple text file.");
        using var stream = new MemoryStream(textBytes);

        var (isValid, errorMessage, sanitized) = _fileValidator.Validate(stream, "../../etc/passwd.txt", "text/plain", textBytes.Length);

        isValid.Should().BeTrue();
        sanitized.Should().Be("passwd.txt");
    }
}

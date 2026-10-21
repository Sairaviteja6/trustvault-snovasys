using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TrustVault.Api.DTOs;
using TrustVault.Core.Enums;
using TrustVault.Core.Interfaces;
using TrustVault.Infrastructure.Data;
using Xunit;

namespace TrustVault.Tests;

public class AccessControlTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public AccessControlTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<TrustVaultDbContext>));
                if (descriptor != null)
                {
                    services.Remove(descriptor);
                }

                var dbName = "TrustVaultAccessControlTestDb";
                services.AddDbContext<TrustVaultDbContext>(options =>
                {
                    options.UseInMemoryDatabase(dbName);
                });

                var sp = services.BuildServiceProvider();
                using var scope = sp.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<TrustVaultDbContext>();
                var audit = scope.ServiceProvider.GetRequiredService<IAuditService>();
                var enc = scope.ServiceProvider.GetRequiredService<IEncryptionService>();
                db.Database.EnsureCreated();
                var testStorage = Path.Combine(Path.GetTempPath(), "TrustVaultAccessControlTestStorage");
                DbSeeder.SeedAsync(db, audit, enc, testStorage).GetAwaiter().GetResult();

                // Seed test personas needed for test suite execution
                var testOwner = new TrustVault.Core.Entities.User
                {
                    Username = "document_owner",
                    Email = "owner@trustvault.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Owner@12345!"),
                    Role = UserRole.Owner,
                    Department = "Corporate Legal & HR",
                    CreatedAt = DateTime.UtcNow
                };
                var alice = new TrustVault.Core.Entities.User
                {
                    Username = "alice_viewer",
                    Email = "alice@trustvault.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Viewer@12345!"),
                    Role = UserRole.Viewer,
                    Department = "Finance",
                    CreatedAt = DateTime.UtcNow
                };
                var bob = new TrustVault.Core.Entities.User
                {
                    Username = "bob_viewer",
                    Email = "bob@trustvault.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Viewer@12345!"),
                    Role = UserRole.Viewer,
                    Department = "Engineering",
                    CreatedAt = DateTime.UtcNow
                };
                db.Users.AddRange(testOwner, alice, bob);
                db.SaveChanges();
            });
        });
    }

    private async Task<(HttpClient client, string token, Guid userId)> CreateAuthenticatedClientAsync(string email, string password)
    {
        var client = _factory.CreateClient();
        var loginResponse = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, password));
        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var auth = await loginResponse.Content.ReadFromJsonAsync<AuthResponse>();
        auth.Should().NotBeNull();

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
        return (client, auth.Token, auth.User.Id);
    }

    [Fact]
    public async Task THREAT01_UserB_CannotDownload_UserA_PrivateDocument_Returns404()
    {
        var (ownerClient, _, _) = await CreateAuthenticatedClientAsync("owner@trustvault.com", "Owner@12345!");
        var (bobClient, _, _) = await CreateAuthenticatedClientAsync("bob@trustvault.com", "Viewer@12345!");

        var content = new MultipartFormDataContent();
        var fileBytes = new byte[] { 0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34 }; // %PDF
        var byteContent = new ByteArrayContent(fileBytes);
        byteContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        content.Add(byteContent, "file", "SecretSalaryMatrix.pdf");
        content.Add(new StringContent("Executive Salaries"), "title");
        content.Add(new StringContent("Salary"), "category");

        var uploadRes = await ownerClient.PostAsync("/api/v1/documents/upload", content);
        uploadRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdDoc = await uploadRes.Content.ReadFromJsonAsync<DocumentResponse>();
        createdDoc.Should().NotBeNull();

        // Act - Bob attempts download without permission
        var downloadRes = await bobClient.GetAsync($"/api/v1/documents/{createdDoc!.Id}/download");

        // Assert - Server returns 404
        downloadRes.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task THREAT06_Admin_CannotDownload_PrivateUserDocument_Returns404()
    {
        var (ownerClient, _, _) = await CreateAuthenticatedClientAsync("owner@trustvault.com", "Owner@12345!");
        var (adminClient, _, _) = await CreateAuthenticatedClientAsync("admin@trustvault.com", "Admin@12345!");

        var content = new MultipartFormDataContent();
        var fileBytes = new byte[] { 0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34 };
        var byteContent = new ByteArrayContent(fileBytes);
        byteContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        content.Add(byteContent, "file", "PrivateContract.pdf");
        content.Add(new StringContent("Acme Private Agreement"), "title");

        var uploadRes = await ownerClient.PostAsync("/api/v1/documents/upload", content);
        var createdDoc = await uploadRes.Content.ReadFromJsonAsync<DocumentResponse>();

        var downloadRes = await adminClient.GetAsync($"/api/v1/documents/{createdDoc!.Id}/download");
        downloadRes.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task THREAT03_RevokedAccess_TakesEffect_Immediately()
    {
        var (ownerClient, _, _) = await CreateAuthenticatedClientAsync("owner@trustvault.com", "Owner@12345!");
        var (bobClient, _, bobId) = await CreateAuthenticatedClientAsync("bob@trustvault.com", "Viewer@12345!");

        // 1. Owner uploads
        var content = new MultipartFormDataContent();
        var fileBytes = new byte[] { 0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34 };
        var byteContent = new ByteArrayContent(fileBytes);
        byteContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        content.Add(byteContent, "file", "ProjectDesign.pdf");
        content.Add(new StringContent("Project Design"), "title");
        var uploadRes = await ownerClient.PostAsync("/api/v1/documents/upload", content);
        var createdDoc = await uploadRes.Content.ReadFromJsonAsync<DocumentResponse>();

        // 2. Owner grants Bob READ and DOWNLOAD
        var grantRes = await ownerClient.PostAsJsonAsync(
            $"/api/v1/documents/{createdDoc!.Id}/permissions/grant",
            new GrantPermissionRequest(bobId, new List<PermissionType> { PermissionType.Read, PermissionType.Download }));
        grantRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // 3. Bob downloads successfully
        var initialDownload = await bobClient.GetAsync($"/api/v1/documents/{createdDoc.Id}/download");
        initialDownload.StatusCode.Should().Be(HttpStatusCode.OK);

        // 4. Owner revokes Bob
        var revokeRes = await ownerClient.DeleteAsync($"/api/v1/documents/{createdDoc.Id}/permissions/revoke/{bobId}");
        revokeRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // 5. Bob tries downloading immediately after revocation
        var postRevocationDownload = await bobClient.GetAsync($"/api/v1/documents/{createdDoc.Id}/download");

        // Assert - Immediate 404 Cutoff
        postRevocationDownload.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DiscretePermissions_ViewerWithReadOnly_CannotDownload()
    {
        var (ownerClient, _, _) = await CreateAuthenticatedClientAsync("owner@trustvault.com", "Owner@12345!");
        var (bobClient, _, bobId) = await CreateAuthenticatedClientAsync("bob@trustvault.com", "Viewer@12345!");

        var content = new MultipartFormDataContent();
        var fileBytes = new byte[] { 0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34 };
        var byteContent = new ByteArrayContent(fileBytes);
        byteContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        content.Add(byteContent, "file", "ReadStrict.pdf");
        content.Add(new StringContent("Read Only Specification"), "title");
        var uploadRes = await ownerClient.PostAsync("/api/v1/documents/upload", content);
        var createdDoc = await uploadRes.Content.ReadFromJsonAsync<DocumentResponse>();

        // Grant Bob READ only (NO Download)
        await ownerClient.PostAsJsonAsync(
            $"/api/v1/documents/{createdDoc!.Id}/permissions/grant",
            new GrantPermissionRequest(bobId, new List<PermissionType> { PermissionType.Read }));

        // Reading metadata succeeds
        var readRes = await bobClient.GetAsync($"/api/v1/documents/{createdDoc.Id}");
        readRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // Downloading fails because DOWNLOAD permission was not granted
        var downloadRes = await bobClient.GetAsync($"/api/v1/documents/{createdDoc.Id}/download");
        downloadRes.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task AnonymousRequest_WithoutToken_Returns401Unauthorized()
    {
        var anonymousClient = _factory.CreateClient();
        var res = await anonymousClient.GetAsync("/api/v1/documents");
        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task THREAT09_FailedAccessAttempts_AreRecordedInAuditTrail()
    {
        var (adminClient, _, _) = await CreateAuthenticatedClientAsync("admin@trustvault.com", "Admin@12345!");
        var (bobClient, _, _) = await CreateAuthenticatedClientAsync("bob@trustvault.com", "Viewer@12345!");

        var randomDocId = Guid.NewGuid();
        var downloadRes = await bobClient.GetAsync($"/api/v1/documents/{randomDocId}/download");
        downloadRes.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var auditRes = await adminClient.GetAsync("/api/v1/admin/audit-logs?status=Refused");
        auditRes.StatusCode.Should().Be(HttpStatusCode.OK);

        var responseContent = await auditRes.Content.ReadAsStringAsync();
        responseContent.Should().Contain("Refused");
        responseContent.Should().Contain(randomDocId.ToString());
    }

    [Fact]
    public async Task ChecklistItem08_OwnerB_CannotAccess_OwnerA_PrivateDocument_Or_ModifyGrants()
    {
        // Arrange - Owner A uploads private document
        var (ownerAClient, _, _) = await CreateAuthenticatedClientAsync("owner@trustvault.com", "Owner@12345!");

        // Register a second distinct Owner B
        var anonymousClient = _factory.CreateClient();
        var registerRes = await anonymousClient.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest("admin@trustvault.com", "Admin@12345!"));
        var adminAuth = await registerRes.Content.ReadFromJsonAsync<AuthResponse>();
        var adminClient = _factory.CreateClient();
        adminClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminAuth!.Token);

        var createOwnerB = await adminClient.PostAsJsonAsync("/api/v1/admin/users/owners", new CreateOwnerRequest("owner_b", "owner_b@trustvault.com", "OwnerB@12345!", "Sales"));
        createOwnerB.StatusCode.Should().Be(HttpStatusCode.Created);

        var (ownerBClient, _, ownerBId) = await CreateAuthenticatedClientAsync("owner_b@trustvault.com", "OwnerB@12345!");

        // Owner A uploads document
        var content = new MultipartFormDataContent();
        var fileBytes = new byte[] { 0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34 };
        var byteContent = new ByteArrayContent(fileBytes);
        byteContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        content.Add(byteContent, "file", "OwnerA_Secret.pdf");
        content.Add(new StringContent("Owner A Secret"), "title");
        var uploadRes = await ownerAClient.PostAsync("/api/v1/documents/upload", content);
        var createdDoc = await uploadRes.Content.ReadFromJsonAsync<DocumentResponse>();

        // Act 1: Owner B attempts to download Owner A's document
        var downloadRes = await ownerBClient.GetAsync($"/api/v1/documents/{createdDoc!.Id}/download");
        downloadRes.StatusCode.Should().Be(HttpStatusCode.NotFound); // Cross-owner isolation

        // Act 2: Owner B attempts to modify grants on Owner A's document
        var grantRes = await ownerBClient.PostAsJsonAsync(
            $"/api/v1/documents/{createdDoc.Id}/permissions/grant",
            new GrantPermissionRequest(ownerBId, new List<PermissionType> { PermissionType.Read }));
        grantRes.StatusCode.Should().Be(HttpStatusCode.NotFound); // Cannot modify another owner's grants
    }

    [Fact]
    public async Task ChecklistItem03_DeactivatedUser_TokenRejectedImmediately()
    {
        // Arrange - Alice logs in and gets an active JWT
        var (aliceClient, token, aliceId) = await CreateAuthenticatedClientAsync("alice@trustvault.com", "Viewer@12345!");
        
        // Alice can access documents before deactivation
        var initialRes = await aliceClient.GetAsync("/api/v1/documents");
        initialRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // Admin deactivates Alice's account in database
        var (adminClient, _, _) = await CreateAuthenticatedClientAsync("admin@trustvault.com", "Admin@12345!");
        var toggleRes = await adminClient.PatchAsync($"/api/v1/admin/users/{aliceId}/toggle-status", null);
        toggleRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // Act - Alice tries to make a request using her existing JWT
        var postDeactivationRes = await aliceClient.GetAsync("/api/v1/documents");

        // Assert - Inactive user is rejected on protected request immediately (401 Unauthorized)
        postDeactivationRes.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}

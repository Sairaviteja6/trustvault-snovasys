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
                DbSeeder.SeedAsync(db, audit, enc).GetAwaiter().GetResult();
            });
        });
    }

    private async Task<(HttpClient client, string token, Guid userId)> CreateAuthenticatedClientAsync(string email, string password)
    {
        var client = _factory.CreateClient();
        var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, password));
        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var auth = await loginResponse.Content.ReadFromJsonAsync<AuthResponse>();
        auth.Should().NotBeNull();

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
        return (client, auth.Token, auth.User.Id);
    }

    [Fact]
    public async Task THREAT01_UserB_CannotDownload_UserA_PrivateDocument_Returns404()
    {
        // Arrange - Owner client and Viewer client (Bob has NO access to doc1)
        var (ownerClient, _, _) = await CreateAuthenticatedClientAsync("owner@trustvault.com", "Owner@12345!");
        var (bobClient, _, _) = await CreateAuthenticatedClientAsync("bob@trustvault.com", "Viewer@12345!");

        // Upload a confidential document by Owner
        var content = new MultipartFormDataContent();
        var fileBytes = new byte[] { 0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34 }; // %PDF
        content.Add(new ByteArrayContent(fileBytes), "file", "SecretSalaryMatrix.pdf");
        content.Add(new StringContent("Executive Salaries"), "title");
        content.Add(new StringContent("Salary"), "category");

        var uploadRes = await ownerClient.PostAsync("/api/documents/upload", content);
        uploadRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdDoc = await uploadRes.Content.ReadFromJsonAsync<DocumentResponse>();
        createdDoc.Should().NotBeNull();

        // Act - Bob attempts to download the document without permission
        var downloadRes = await bobClient.GetAsync($"/api/documents/{createdDoc!.Id}/download");

        // Assert - Invariant: Server returns 404 (does NOT leak existence via 403, does NOT stream file)
        downloadRes.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task THREAT06_Admin_CannotDownload_PrivateUserDocument_Returns404()
    {
        // Arrange - Owner uploads private document; Admin attempts download
        var (ownerClient, _, _) = await CreateAuthenticatedClientAsync("owner@trustvault.com", "Owner@12345!");
        var (adminClient, _, _) = await CreateAuthenticatedClientAsync("admin@trustvault.com", "Admin@12345!");

        var content = new MultipartFormDataContent();
        var fileBytes = new byte[] { 0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34 };
        content.Add(new ByteArrayContent(fileBytes), "file", "PrivateContract.pdf");
        content.Add(new StringContent("Acme Private Agreement"), "title");

        var uploadRes = await ownerClient.PostAsync("/api/documents/upload", content);
        var createdDoc = await uploadRes.Content.ReadFromJsonAsync<DocumentResponse>();

        // Act - Admin attempts to download Owner's confidential document
        var downloadRes = await adminClient.GetAsync($"/api/documents/{createdDoc!.Id}/download");

        // Assert - Admin role does NOT bypass authorization; returns 404
        downloadRes.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task THREAT03_RevokedAccess_TakesEffect_Immediately()
    {
        // Arrange
        var (ownerClient, _, _) = await CreateAuthenticatedClientAsync("owner@trustvault.com", "Owner@12345!");
        var (bobClient, _, bobId) = await CreateAuthenticatedClientAsync("bob@trustvault.com", "Viewer@12345!");

        // 1. Owner uploads document
        var content = new MultipartFormDataContent();
        var fileBytes = new byte[] { 0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34 };
        content.Add(new ByteArrayContent(fileBytes), "file", "ProjectDesign.pdf");
        content.Add(new StringContent("Project Design"), "title");
        var uploadRes = await ownerClient.PostAsync("/api/documents/upload", content);
        var createdDoc = await uploadRes.Content.ReadFromJsonAsync<DocumentResponse>();

        // 2. Owner grants Bob READ access
        var grantRes = await ownerClient.PostAsJsonAsync(
            $"/api/documents/{createdDoc!.Id}/permissions/grant",
            new GrantPermissionRequest(bobId, PermissionLevel.Read));
        grantRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // 3. Bob downloads successfully
        var initialDownload = await bobClient.GetAsync($"/api/documents/{createdDoc.Id}/download");
        initialDownload.StatusCode.Should().Be(HttpStatusCode.OK);

        // 4. Owner revokes Bob's access
        var revokeRes = await ownerClient.DeleteAsync($"/api/documents/{createdDoc.Id}/permissions/revoke/{bobId}");
        revokeRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // 5. Bob tries downloading immediately after revocation
        var postRevocationDownload = await bobClient.GetAsync($"/api/documents/{createdDoc.Id}/download");

        // Assert - Access is cut off immediately on the very next request
        postRevocationDownload.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task AnonymousRequest_WithoutToken_Returns401Unauthorized()
    {
        var anonymousClient = _factory.CreateClient();
        var res = await anonymousClient.GetAsync("/api/documents");
        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task THREAT09_FailedAccessAttempts_AreRecordedInAuditTrail()
    {
        // Arrange
        var (adminClient, _, _) = await CreateAuthenticatedClientAsync("admin@trustvault.com", "Admin@12345!");
        var (bobClient, _, _) = await CreateAuthenticatedClientAsync("bob@trustvault.com", "Viewer@12345!");

        // Bob attempts to download a random non-existent or forbidden document
        var randomDocId = Guid.NewGuid();
        var downloadRes = await bobClient.GetAsync($"/api/documents/{randomDocId}/download");
        downloadRes.StatusCode.Should().Be(HttpStatusCode.NotFound);

        // Act - Admin checks audit logs
        var auditRes = await adminClient.GetAsync("/api/admin/audit-logs?status=Refused");
        auditRes.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await auditRes.Content.ReadAsStringAsync();
        content.Should().Contain("Refused");
        content.Should().Contain(randomDocId.ToString());
    }
}

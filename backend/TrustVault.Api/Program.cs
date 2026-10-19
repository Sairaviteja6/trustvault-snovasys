using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TrustVault.Api.Services;
using TrustVault.Core.Interfaces;
using TrustVault.Infrastructure.Data;
using TrustVault.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Database Configuration (SQL Server with In-Memory fallback for CI/tests)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<TrustVaultDbContext>(options =>
{
    if (!string.IsNullOrWhiteSpace(connectionString) && !builder.Environment.IsEnvironment("Testing"))
    {
        options.UseSqlServer(connectionString, sqlOptions =>
        {
            sqlOptions.EnableRetryOnFailure(3);
        });
    }
    else
    {
        options.UseInMemoryDatabase("TrustVaultLocalDevDb");
    }
});

// 2. Core Security Services
builder.Services.AddSingleton<IEncryptionService, AesGcmEncryptionService>();
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddSingleton<IFileValidatorService, FileValidatorService>();
builder.Services.AddScoped<IFileStorageService, LocalEncryptedFileStorageService>();
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<DocumentAuthorizationService>();

// 3. JWT Authentication Setup
var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "SuperSecretTrustVaultProductionGradeKey2026!#$StrictCryptoEnforcement";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "TrustVault.Api";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "TrustVault.Client";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false; // set true in strict SSL production
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero // Zero tolerance for token expiry
    };
});

builder.Services.AddAuthorization();

// 4. CORS Setup for Frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("TrustVaultCorsPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:4200", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddControllers();

var app = builder.Build();

// 5. Automatic Migration & Seeding
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var db = services.GetRequiredService<TrustVaultDbContext>();
        if (db.Database.IsRelational())
        {
            await db.Database.EnsureCreatedAsync();
        }
        else
        {
            await db.Database.EnsureCreatedAsync();
        }

        var auditService = services.GetRequiredService<IAuditService>();
        var encryptionService = services.GetRequiredService<IEncryptionService>();
        await DbSeeder.SeedAsync(db, auditService, encryptionService);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred during database initialization or seeding.");
    }
}

// 6. Security Headers Middleware
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
    await next();
});

app.UseCors("TrustVaultCorsPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

// Required for WebApplicationFactory in integration tests
public partial class Program { }

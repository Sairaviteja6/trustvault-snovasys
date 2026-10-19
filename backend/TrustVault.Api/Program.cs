using System.Net;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.RateLimiting;
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

// 3. Rate Limiter Configuration (Item 1 on Verification Checklist)
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Strict fixed window limiter for login endpoint
    options.AddPolicy("LoginRateLimit", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
});

// 4. JWT Authentication Setup (Item 2 & 3 on Verification Checklist)
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

    // Checklist Item 3: Validate that user account has not been deactivated or revoked in database
    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = async context =>
        {
            var db = context.HttpContext.RequestServices.GetRequiredService<TrustVaultDbContext>();
            var userIdClaim = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
            if (Guid.TryParse(userIdClaim, out var userId))
            {
                var user = await db.Users.FindAsync(userId);
                if (user == null || !user.IsActive || user.IsRevoked)
                {
                    context.Fail("User account is deactivated or session has been revoked.");
                }
            }
            else
            {
                context.Fail("Invalid user token payload.");
            }
        }
    };
});

builder.Services.AddAuthorization();

// 5. CORS Setup for Frontend (Item 4 on Verification Checklist)
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

// 6. Swagger / OpenAPI Documentation with JWT Support
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "TrustVault Secure Document API",
        Version = "v1",
        Description = "Zero-trust document sharing platform with cryptographic audit trail and discrete permissions."
    });

    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter JWT Bearer token."
    });

    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// 7. Global Exception Handling - Checklist Item 5: Unhandled errors return sanitized responses
app.UseExceptionHandler(exceptionApp =>
{
    exceptionApp.Run(async context =>
    {
        context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
        context.Response.ContentType = "application/json";

        var exceptionHandlerPathFeature = context.Features.Get<IExceptionHandlerPathFeature>();
        var ex = exceptionHandlerPathFeature?.Error;

        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Unhandled server exception intercepted.");

        // Sanitized JSON response - NEVER leak stack trace, SQL query, or file paths
        var responsePayload = new
        {
            status = 500,
            error = "An internal server error occurred.",
            correlationId = context.TraceIdentifier
        };

        await context.Response.WriteAsJsonAsync(responsePayload);
    });
});

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "TrustVault API v1");
    c.RoutePrefix = "swagger";
});

// 8. Automatic Migration & Seeding
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var db = services.GetRequiredService<TrustVaultDbContext>();
        if (app.Environment.IsDevelopment())
        {
            await db.Database.EnsureDeletedAsync();
            await db.Database.EnsureCreatedAsync();
        }
        else
        {
            await db.Database.EnsureCreatedAsync();
        }

        var auditService = services.GetRequiredService<IAuditService>();
        var encryptionService = services.GetRequiredService<IEncryptionService>();
        var env = services.GetRequiredService<IWebHostEnvironment>();
        var storageDir = Path.Combine(env.ContentRootPath, "..", "Storage", "encrypted_blobs");
        await DbSeeder.SeedAsync(db, auditService, encryptionService, storageDir);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred during database initialization or seeding.");
    }
}

// 9. Security Headers Middleware (Checklist Item 4)
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
    context.Response.Headers.Append("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';");
    await next();
});

app.UseCors("TrustVaultCorsPolicy");
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

// Required for WebApplicationFactory in integration tests
public partial class Program { }

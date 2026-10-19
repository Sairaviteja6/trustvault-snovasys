using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrustVault.Api.DTOs;
using TrustVault.Api.Services;
using TrustVault.Core.Entities;
using TrustVault.Core.Enums;
using TrustVault.Core.Interfaces;
using TrustVault.Infrastructure.Data;

namespace TrustVault.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly TrustVaultDbContext _dbContext;
    private readonly TokenService _tokenService;
    private readonly IAuditService _auditService;

    public AuthController(TrustVaultDbContext dbContext, TokenService tokenService, IAuditService auditService)
    {
        _dbContext = dbContext;
        _tokenService = tokenService;
        _auditService = auditService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Email and Password are required." });
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var exists = await _dbContext.Users.AnyAsync(u => u.Email == normalizedEmail || u.Username == request.Username);
        if (exists)
        {
            return Conflict(new { message = "User with this email or username already exists." });
        }

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        var user = new User
        {
            Username = request.Username.Trim(),
            Email = normalizedEmail,
            PasswordHash = passwordHash,
            Role = request.Role,
            Department = request.Department
        };

        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        await _auditService.LogAsync(
            AuditAction.UserRegistered,
            AuditStatus.Allowed,
            user.Id,
            user.Email,
            user.Role.ToString(),
            null,
            null,
            GetIpAddress(),
            GetUserAgent(),
            $"User registered with role {user.Role}");

        return CreatedAtAction(nameof(GetMe), new { id = user.Id }, new UserDto(user.Id, user.Username, user.Email, user.Role.ToString(), user.Department));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        if (user == null || !user.IsActive || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            await _auditService.LogAsync(
                AuditAction.UserLogin,
                AuditStatus.Refused,
                user?.Id,
                normalizedEmail,
                user?.Role.ToString(),
                null,
                null,
                GetIpAddress(),
                GetUserAgent(),
                "Failed authentication attempt.");

            return Unauthorized(new { message = "Invalid email or password." });
        }

        var (accessToken, expiration) = _tokenService.GenerateAccessToken(user);
        var refreshToken = _tokenService.GenerateRefreshToken();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
        user.IsRevoked = false;
        await _dbContext.SaveChangesAsync();

        await _auditService.LogAsync(
            AuditAction.UserLogin,
            AuditStatus.Allowed,
            user.Id,
            user.Email,
            user.Role.ToString(),
            null,
            null,
            GetIpAddress(),
            GetUserAgent(),
            "User successfully logged in.");

        var response = new AuthResponse(
            accessToken,
            refreshToken,
            expiration,
            new UserDto(user.Id, user.Username, user.Email, user.Role.ToString(), user.Department));

        return Ok(response);
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.RefreshToken == request.RefreshToken);

        if (user == null || user.IsRevoked || user.RefreshTokenExpiryTime <= DateTime.UtcNow)
        {
            return Unauthorized(new { message = "Invalid or expired refresh token." });
        }

        var (newAccessToken, expiration) = _tokenService.GenerateAccessToken(user);
        var newRefreshToken = _tokenService.GenerateRefreshToken();

        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
        await _dbContext.SaveChangesAsync();

        return Ok(new AuthResponse(
            newAccessToken,
            newRefreshToken,
            expiration,
            new UserDto(user.Id, user.Username, user.Email, user.Role.ToString(), user.Department)));
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var userId = GetCurrentUserId();
        var user = await _dbContext.Users.FindAsync(userId);
        if (user != null)
        {
            user.RefreshToken = null;
            user.IsRevoked = true;
            await _dbContext.SaveChangesAsync();

            await _auditService.LogAsync(
                AuditAction.UserLogout,
                AuditStatus.Allowed,
                user.Id,
                user.Email,
                user.Role.ToString(),
                null,
                null,
                GetIpAddress(),
                GetUserAgent(),
                "User logged out, session revoked.");
        }

        return Ok(new { message = "Logged out successfully." });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var userId = GetCurrentUserId();
        var user = await _dbContext.Users.FindAsync(userId);
        if (user == null)
        {
            return NotFound();
        }

        return Ok(new UserDto(user.Id, user.Username, user.Email, user.Role.ToString(), user.Department));
    }

    private Guid GetCurrentUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(claim, out var id) ? id : Guid.Empty;
    }

    private string GetIpAddress() =>
        HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

    private string GetUserAgent() =>
        Request.Headers.UserAgent.ToString();
}

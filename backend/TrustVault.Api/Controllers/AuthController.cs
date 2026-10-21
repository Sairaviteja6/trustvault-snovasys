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
[Route("api/v1/[controller]")]
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

    [HttpPost("login")]
    [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("LoginRateLimit")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Email and Password are required." });
        }

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
            "User successfully authenticated.");

        var response = new AuthResponse(
            accessToken,
            refreshToken,
            expiration,
            new UserDto(user.Id, user.Username, user.Email, user.Role.ToString(), user.Department, user.IsActive, user.CreatedAt, user.IsMasterAdmin));

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
            new UserDto(user.Id, user.Username, user.Email, user.Role.ToString(), user.Department, user.IsActive, user.CreatedAt, user.IsMasterAdmin)));
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
                "User logged out, session terminated.");
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

        return Ok(new UserDto(user.Id, user.Username, user.Email, user.Role.ToString(), user.Department, user.IsActive, user.CreatedAt, user.IsMasterAdmin));
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

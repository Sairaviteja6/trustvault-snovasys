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

        var identifier = request.Email.Trim().ToLowerInvariant();
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => 
            u.Email.ToLower() == identifier || 
            u.Username.ToLower() == identifier);

        if (user == null || !user.IsActive || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            await _auditService.LogAsync(
                AuditAction.UserLogin,
                AuditStatus.Refused,
                user?.Id,
                identifier,
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
            new UserDto(user.Id, user.Username, user.Email, user.Role.ToString(), user.Department, user.IsActive, user.CreatedAt, user.IsMasterAdmin, user.MustChangePassword));

        return Ok(response);
    }

    [HttpPost("set-password")]
    public async Task<IActionResult> SetPassword([FromBody] SetPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.CurrentPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return BadRequest(new { message = "Email, current password, and new password are required." });
        }

        if (request.NewPassword.Length < 8)
        {
            return BadRequest(new { message = "New password must be at least 8 characters long." });
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        if (user == null || !user.IsActive || !BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid email or temporary password." });
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.MustChangePassword = false;

        var (accessToken, expiration) = _tokenService.GenerateAccessToken(user);
        var refreshToken = _tokenService.GenerateRefreshToken();
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
        user.IsRevoked = false;
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
            "User established permanent custom security credentials.");

        var response = new AuthResponse(
            accessToken,
            refreshToken,
            expiration,
            new UserDto(user.Id, user.Username, user.Email, user.Role.ToString(), user.Department, user.IsActive, user.CreatedAt, user.IsMasterAdmin, false));

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
            new UserDto(user.Id, user.Username, user.Email, user.Role.ToString(), user.Department, user.IsActive, user.CreatedAt, user.IsMasterAdmin, user.MustChangePassword)));
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

        return Ok(new UserDto(user.Id, user.Username, user.Email, user.Role.ToString(), user.Department, user.IsActive, user.CreatedAt, user.IsMasterAdmin, user.MustChangePassword));
    }

    [Authorize]
    [HttpPatch("profile/username")]
    public async Task<IActionResult> UpdateUsername([FromBody] UpdateUsernameRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.NewUsername))
        {
            return BadRequest(new { message = "Username cannot be empty." });
        }

        var trimmed = request.NewUsername.Trim();
        if (trimmed.Length < 3 || trimmed.Length > 50)
        {
            return BadRequest(new { message = "Username must be between 3 and 50 characters." });
        }

        var userId = GetCurrentUserId();
        var user = await _dbContext.Users.FindAsync(userId);
        if (user == null) return NotFound();

        var normalizedNew = trimmed.ToLowerInvariant();
        var exists = await _dbContext.Users.AnyAsync(u => u.Id != userId && u.Username.ToLower() == normalizedNew);
        if (exists)
        {
            return Conflict(new { message = "Username is already taken by another user." });
        }

        var oldName = user.Username;
        user.Username = trimmed;
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
            $"User updated display username from '{oldName}' to '{user.Username}'.");

        return Ok(new UserDto(user.Id, user.Username, user.Email, user.Role.ToString(), user.Department, user.IsActive, user.CreatedAt, user.IsMasterAdmin, user.MustChangePassword));
    }

    [Authorize]
    [HttpPost("profile/change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.CurrentPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return BadRequest(new { message = "Current password and new password are required." });
        }

        if (request.NewPassword.Length < 8)
        {
            return BadRequest(new { message = "New password must be at least 8 characters long." });
        }

        var userId = GetCurrentUserId();
        var user = await _dbContext.Users.FindAsync(userId);
        if (user == null) return NotFound();

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
        {
            await _auditService.LogAsync(
                AuditAction.UserLogin,
                AuditStatus.Refused,
                user.Id,
                user.Email,
                user.Role.ToString(),
                null,
                null,
                GetIpAddress(),
                GetUserAgent(),
                "Failed attempt to change password (incorrect current password).");

            return BadRequest(new { message = "Incorrect current password." });
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.MustChangePassword = false;
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
            "User successfully updated their account password.");

        return Ok(new { message = "Password updated successfully." });
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

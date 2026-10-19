using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrustVault.Api.DTOs;
using TrustVault.Core.Entities;
using TrustVault.Core.Enums;
using TrustVault.Infrastructure.Data;

namespace TrustVault.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class TagsController : ControllerBase
{
    private readonly TrustVaultDbContext _dbContext;

    public TagsController(TrustVaultDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetMyTags()
    {
        var ownerId = GetCurrentUserId();

        var tags = await _dbContext.UserTags
            .Include(t => t.User)
            .Where(t => t.OwnerId == ownerId)
            .OrderBy(t => t.TagName)
            .Select(t => new UserTagDto(
                t.Id,
                t.UserId,
                t.User != null ? t.User.Username : "Unknown",
                t.User != null ? t.User.Email : "Unknown",
                t.TagName))
            .ToListAsync();

        return Ok(tags);
    }

    [HttpPost]
    public async Task<IActionResult> AssignTag([FromBody] AssignTagRequest request)
    {
        var ownerId = GetCurrentUserId();
        var normalizedTag = request.TagName.Trim();

        var user = await _dbContext.Users.FindAsync(request.UserId);
        if (user == null)
        {
            return NotFound(new { message = "User not found." });
        }

        var exists = await _dbContext.UserTags.AnyAsync(t => 
            t.OwnerId == ownerId && t.UserId == request.UserId && t.TagName.ToLower() == normalizedTag.ToLower());

        if (exists)
        {
            return Conflict(new { message = $"User is already tagged with '{normalizedTag}'." });
        }

        var tag = new UserTag
        {
            OwnerId = ownerId,
            UserId = request.UserId,
            TagName = normalizedTag
        };

        _dbContext.UserTags.Add(tag);
        await _dbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetMyTags), new { id = tag.Id }, new UserTagDto(tag.Id, user.Id, user.Username, user.Email, tag.TagName));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTag(Guid id)
    {
        var ownerId = GetCurrentUserId();
        var tag = await _dbContext.UserTags.FirstOrDefaultAsync(t => t.Id == id && t.OwnerId == ownerId);
        if (tag == null)
        {
            return NotFound(new { message = "Tag not found." });
        }

        _dbContext.UserTags.Remove(tag);
        await _dbContext.SaveChangesAsync();

        return Ok(new { message = "Tag removed successfully." });
    }

    private Guid GetCurrentUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(claim, out var id) ? id : Guid.Empty;
    }
}

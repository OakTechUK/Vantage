using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Vantage.Application.Abstractions;
using Vantage.Domain.Entities;
using Vantage.Infrastructure.Persistence;
using Vantage.Infrastructure.Identity;

namespace Vantage.Infrastructure.Identity;

public sealed class JwtOptions
{
    public string Issuer { get; set; } = "Vantage";
    public string Audience { get; set; } = "Vantage.Web";
    public string SigningKey { get; set; } = "dev-only-signing-key-change-me-please-32chars";
    public int ExpiryHours { get; set; } = 12;
}

public sealed class JwtTokenService(IOptions<JwtOptions> options, IClock clock)
{
    public (string Token, DateTimeOffset ExpiresAt) Create(Officer officer, Tenant tenant)
    {
        var opts = options.Value;
        var now = clock.UtcNow;
        var expires = now.AddHours(opts.ExpiryHours);
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(opts.SigningKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, officer.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, officer.Email ?? string.Empty),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim("name", officer.DisplayName),
            new Claim("role", officer.Role.ToString()),
            new Claim("tenant_id", tenant.Id.ToString()),
            new Claim("tenant_code", tenant.Code),
            new Claim("tenant_name", tenant.Name),
            new Claim("display_name", officer.DisplayName),
            new Claim("rank", officer.Rank),
            new Claim("collar_number", officer.CollarNumber)
        };

        var token = new JwtSecurityToken(opts.Issuer, opts.Audience, claims, now.UtcDateTime, expires.UtcDateTime, credentials);
        return (new JwtSecurityTokenHandler().WriteToken(token), expires);
    }
}

public sealed class AuthenticationService(
    UserManager<Officer> users,
    ITenantRepository tenants,
    JwtTokenService tokens,
    VantageDbContext db,
    IClock clock) : IAuthenticationService
{
    public async Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var tenant = await tenants.GetByCodeAsync(request.TenantCode, ct);
        if (tenant is null || !tenant.IsActive) return null;

        var normalizedEmail = request.Email.Trim().ToUpperInvariant();
        var officer = await users.Users.FirstOrDefaultAsync(
            o => o.TenantId == tenant.Id && o.NormalizedEmail == normalizedEmail && o.IsActive, ct);
        if (officer is null) return null;
        if (!await users.CheckPasswordAsync(officer, request.Password)) return null;

        var profile = ToProfile(officer, tenant);
        var (token, expires) = tokens.Create(officer, tenant);

        db.AuditEntries.Add(new AuditEntry
        {
            TenantId = tenant.Id,
            ActorOfficerId = officer.Id,
            Action = "auth.login",
            EntityType = nameof(Officer),
            EntityId = officer.Id,
            Details = $"{{\"email\":\"{officer.Email}\"}}",
            CreatedAt = clock.UtcNow
        });
        await db.SaveChangesAsync(ct);

        return new LoginResponse(token, expires, profile);
    }

    public async Task<OfficerProfileDto?> GetProfileAsync(Guid officerId, CancellationToken ct = default)
    {
        var officer = await users.Users.AsNoTracking().FirstOrDefaultAsync(o => o.Id == officerId && o.IsActive, ct);
        if (officer is null) return null;
        var tenant = await tenants.GetByIdAsync(officer.TenantId, ct);
        return tenant is null ? null : ToProfile(officer, tenant);
    }

    public async Task<IReadOnlyList<TenantLookupDto>> ListTenantsAsync(CancellationToken ct = default)
        => (await tenants.ListAsync(ct)).Select(t => new TenantLookupDto(t.Id, t.Code, t.Name)).ToList();

    private static OfficerProfileDto ToProfile(Officer officer, Tenant tenant)
        => new(
            officer.Id,
            officer.Email ?? string.Empty,
            officer.DisplayName,
            officer.Rank,
            officer.CollarNumber,
            officer.Role,
            tenant.Id,
            tenant.Code,
            tenant.Name);
}

public sealed class OfficerDirectory(VantageDbContext db, ICurrentUser currentUser) : IOfficerDirectory
{
    public async Task<IReadOnlyList<OfficerSummaryDto>> ListAsync(CancellationToken ct = default)
    {
        if (currentUser.TenantId is not { } tenantId) return [];
        return await db.Users.AsNoTracking()
            .Where(o => o.TenantId == tenantId && o.IsActive)
            .OrderBy(o => o.DisplayName)
            .Select(o => new OfficerSummaryDto(o.Id, o.DisplayName, o.Rank, o.CollarNumber, o.Role))
            .ToListAsync(ct);
    }

    public async Task<OfficerSummaryDto?> GetAsync(Guid officerId, CancellationToken ct = default)
    {
        if (currentUser.TenantId is not { } tenantId) return null;
        return await db.Users.AsNoTracking()
            .Where(o => o.TenantId == tenantId && o.Id == officerId)
            .Select(o => new OfficerSummaryDto(o.Id, o.DisplayName, o.Rank, o.CollarNumber, o.Role))
            .FirstOrDefaultAsync(ct);
    }
}

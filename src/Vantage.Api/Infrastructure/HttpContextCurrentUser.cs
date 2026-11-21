using System.Security.Claims;
using Vantage.Application.Abstractions;
using Vantage.Domain.Enums;

namespace Vantage.Api.Infrastructure;

public sealed class HttpContextCurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    private ClaimsPrincipal? Principal => accessor.HttpContext?.User;

    public Guid? OfficerId => ParseGuid("sub");
    public Guid? TenantId => ParseGuid("tenant_id");
    public string? DisplayName => Principal?.FindFirstValue("display_name") ?? Principal?.FindFirstValue("name");
    public OfficerRole? Role => Enum.TryParse<OfficerRole>(Principal?.FindFirstValue("role"), out var role) ? role : null;
    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated ?? false;
    public string? IpAddress => accessor.HttpContext?.Connection.RemoteIpAddress?.ToString();

    private Guid? ParseGuid(string claimType)
        => Guid.TryParse(Principal?.FindFirstValue(claimType), out var value) ? value : null;
}

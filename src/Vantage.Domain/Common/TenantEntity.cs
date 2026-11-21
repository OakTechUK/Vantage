namespace Vantage.Domain.Common;

public interface ITenantOwned
{
    Guid TenantId { get; set; }
}

/// <summary>
/// Base type for every record that belongs to a single police force (tenant).
/// Tenant filtering is enforced by the persistence layer, not by callers.
/// </summary>
public abstract class TenantEntity : ITenantOwned
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }
}

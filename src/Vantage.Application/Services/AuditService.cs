using System.Text.Json;
using Vantage.Application.Abstractions;
using Vantage.Domain.Entities;

namespace Vantage.Application.Services;

public sealed class AuditService(
    IEpisodeRepository episodes,
    IUnitOfWork unitOfWork,
    ICurrentUser currentUser,
    IClock clock) : IAuditService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task RecordAsync(string action, string entityType, Guid? entityId, object? details = null, CancellationToken ct = default)
    {
        var entry = new AuditEntry
        {
            TenantId = currentUser.TenantId ?? Guid.Empty,
            ActorOfficerId = currentUser.OfficerId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Details = details is null ? null : JsonSerializer.Serialize(details, JsonOptions),
            IpAddress = currentUser.IpAddress,
            CreatedAt = clock.UtcNow
        };

        await episodes.AddAuditEntryAsync(entry, ct);
        await unitOfWork.SaveChangesAsync(ct);
    }
}

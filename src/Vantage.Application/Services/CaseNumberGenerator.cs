using Vantage.Application.Abstractions;
using Vantage.Domain.Entities;

namespace Vantage.Application.Services;

public sealed class CaseNumberGenerator(
    IEpisodeRepository episodes,
    IUnitOfWork unitOfWork,
    IClock clock) : ICaseNumberGenerator
{
    public Task<string> NextAsync(Guid tenantId, string tenantCode, CancellationToken ct = default)
        => unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            var year = clock.UtcNow.Year;
            var counter = await episodes.GetCounterAsync(tenantId, year, token);
            if (counter is null)
            {
                counter = new CaseNumberCounter
                {
                    TenantId = tenantId,
                    Year = year,
                    LastNumber = 1
                };
                await episodes.AddCounterAsync(counter, token);
            }
            else
            {
                counter.LastNumber++;
                counter.UpdatedAt = clock.UtcNow;
            }

            await unitOfWork.SaveChangesAsync(token);
            return $"{tenantCode.ToUpperInvariant()}-{year % 100:00}-{counter.LastNumber:0000}";
        }, ct);
}

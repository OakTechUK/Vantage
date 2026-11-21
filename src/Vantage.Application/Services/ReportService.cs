using Vantage.Application.Abstractions;
using Vantage.Application.Common;
using Vantage.Application.Dtos;

namespace Vantage.Application.Services;

public sealed class ReportService(IReportQueries queries, IMissingPersonsBureauExporter mpbExporter)
{
    public async Task<ReportsOverviewDto> GetOverviewAsync(ReportQuery query, CancellationToken ct = default)
    {
        var statsTask = queries.GetStatsAsync(query, ct);
        var repeatTask = queries.GetRepeatPersonsAsync(query, ct);
        var locationsTask = queries.GetLocationHotspotsAsync(query, ct);
        await Task.WhenAll(statsTask, repeatTask, locationsTask);
        return new ReportsOverviewDto(await statsTask, await repeatTask, await locationsTask);
    }

    public Task<ReportStatsDto> GetStatsAsync(ReportQuery query, CancellationToken ct = default)
        => queries.GetStatsAsync(query, ct);

    public Task<IReadOnlyList<RepeatPersonDto>> GetRepeatPersonsAsync(ReportQuery query, CancellationToken ct = default)
        => queries.GetRepeatPersonsAsync(query, ct);

    public Task<IReadOnlyList<LocationHotspotDto>> GetLocationHotspotsAsync(ReportQuery query, CancellationToken ct = default)
        => queries.GetLocationHotspotsAsync(query, ct);

    public Task<MpbExport> BuildMpbReturnAsync(int year, int quarter, CancellationToken ct = default)
    {
        if (quarter is < 1 or > 4)
            throw new ValidationFailureException("Quarter must be between 1 and 4.");
        if (year is < 2000 or > 2200)
            throw new ValidationFailureException("A valid return year is required.");
        return mpbExporter.BuildQuarterlyReturnAsync(year, quarter, ct);
    }
}

using Vantage.Application.Abstractions;
using Vantage.Application.Services;

namespace Vantage.Api.Endpoints;

public static class ReportEndpoints
{
    public static IEndpointRouteBuilder MapReportEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/reports").WithTags("Reports").RequireAuthorization();

        group.MapGet("/dashboard", async (IReportQueries queries, CancellationToken ct) =>
            Results.Ok(await queries.GetDashboardAsync(ct)));

        group.MapGet("/overview", async (
            DateTimeOffset? from, DateTimeOffset? to, string? location,
            int? minEpisodes, int? take, ReportService reports, CancellationToken ct) =>
        {
            var query = new ReportQuery(from, to, location, minEpisodes ?? 2, take ?? 50);
            return Results.Ok(await reports.GetOverviewAsync(query, ct));
        });

        group.MapGet("/stats", async (
            DateTimeOffset? from, DateTimeOffset? to, string? location, ReportService reports, CancellationToken ct) =>
            Results.Ok(await reports.GetStatsAsync(new ReportQuery(from, to, location), ct)));

        group.MapGet("/mpb-return", async (int? year, int? quarter, ReportService reports, CancellationToken ct) =>
        {
            var nowYear = DateTimeOffset.UtcNow.Year;
            var nowQuarter = (DateTimeOffset.UtcNow.Month - 1) / 3 + 1;
            var export = await reports.BuildMpbReturnAsync(year ?? nowYear, quarter ?? nowQuarter, ct);
            return Results.File(export.Content, export.ContentType, export.FileName);
        });

        return app;
    }
}

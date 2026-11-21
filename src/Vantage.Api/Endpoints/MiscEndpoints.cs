using Vantage.Application.Abstractions;
using Vantage.Application.Dtos;
using Vantage.Application.Services;
using Vantage.Domain.Enums;

namespace Vantage.Api.Endpoints;

public static class MiscEndpoints
{
    public static IEndpointRouteBuilder MapMiscEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/ifind", async (
            bool? forChild, RiskLevel? risk, IfindCategory? category, IfindService ifind, CancellationToken ct) =>
            Results.Ok(await ifind.GetCatalogueAsync(forChild, risk, category, ct)))
            .WithTags("iFIND").RequireAuthorization();

        var cawns = app.MapGroup("/api/cawns").WithTags("Child abduction warning notices").RequireAuthorization();
        cawns.MapGet("", async (
            CawnStatus? status, string? search, int? page, int? pageSize, CawnService service, CancellationToken ct) =>
            Results.Ok(await service.SearchAsync(status, search, page ?? 1, pageSize ?? 25, ct)));
        cawns.MapPost("", async (CreateCawnRequest request, CawnService service, CancellationToken ct) =>
        {
            var created = await service.CreateAsync(request, ct);
            return Results.Created($"/api/cawns/{created.Id}", created);
        });
        cawns.MapPost("/{id:guid}/revoke", async (Guid id, RevokeCawnRequest request, CawnService service, CancellationToken ct) =>
            Results.Ok(await service.RevokeAsync(id, request, ct)));

        app.MapGet("/api/officers", async (IOfficerDirectory officers, CancellationToken ct) =>
            Results.Ok(new OfficerListDto(await officers.ListAsync(ct))))
            .WithTags("Officers").RequireAuthorization();

        app.MapGet("/api/audit/{entityId:guid}", async (Guid entityId, IEpisodeRepository episodes, CancellationToken ct) =>
            Results.Ok(await episodes.GetAuditAsync(entityId, ct)))
            .WithTags("Audit").RequireAuthorization();

        return app;
    }
}

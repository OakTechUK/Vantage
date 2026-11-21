using Vantage.Application.Abstractions;
using Vantage.Application.Dtos;
using Vantage.Application.Services;
using Vantage.Domain.Enums;

namespace Vantage.Api.Endpoints;

public sealed record DuplicateCheckRequest(string Title, string? LocationText);
public sealed record UpdateTaskStatusRequest(CaseTaskStatus Status, string? Outcome);

public static class CaseEndpoints
{
    public static IEndpointRouteBuilder MapCaseEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/cases").WithTags("Enquiries").RequireAuthorization();
        var taskGroup = app.MapGroup("/api/tasks").WithTags("Tasks").RequireAuthorization();

        group.MapGet("", async (
            string? search, EpisodeStatus? status, RiskLevel? risk, ReviewStatus? review,
            bool? isChild, bool? repeatOnly, int? page, int? pageSize,
            CaseService cases, CancellationToken ct) =>
        {
            var result = await cases.SearchAsync(new CaseQuery(
                search, status, risk, review, isChild, repeatOnly, page ?? 1, pageSize ?? 25), ct);
            return Results.Ok(result);
        });

        group.MapPost("", async (CreateCaseRequest request, CaseService cases, CancellationToken ct) =>
        {
            var created = await cases.CreateAsync(request, ct);
            return Results.Created($"/api/cases/{created.Id}", created);
        });

        group.MapGet("/{id:guid}", async (Guid id, CaseService cases, CancellationToken ct) =>
            Results.Ok(await cases.GetAsync(id, ct)));

        group.MapPut("/{id:guid}", async (Guid id, UpdateCaseRequest request, CaseService cases, CancellationToken ct) =>
            Results.Ok(await cases.UpdateAsync(id, request, ct)));

        group.MapPost("/{id:guid}/reviews", async (Guid id, AddReviewRequest request, CaseService cases, CancellationToken ct) =>
            Results.Ok(await cases.AddReviewAsync(id, request, ct))).RequireAuthorization("Supervisor");

        group.MapPost("/{id:guid}/locate", async (Guid id, LocateCaseRequest request, CaseService cases, CancellationToken ct) =>
            Results.Ok(await cases.LocateAsync(id, request, ct)));

        group.MapPost("/{id:guid}/close", async (Guid id, CloseCaseRequest request, CaseService cases, CancellationToken ct) =>
            Results.Ok(await cases.CloseAsync(id, request, ct)));

        group.MapPost("/{id:guid}/notify-local-authority", async (Guid id, CaseService cases, CancellationToken ct) =>
            Results.Ok(await cases.NotifyLocalAuthorityAsync(id, ct)));

        group.MapGet("/{id:guid}/tasks", async (Guid id, CaseTaskStatus? status, CaseService cases, CancellationToken ct) =>
        {
            var detail = await cases.GetAsync(id, ct);
            return Results.Ok(status is null ? detail.Tasks : detail.Tasks.Where(t => t.Status == status).ToList());
        });

        group.MapPost("/{id:guid}/tasks/duplicate-check", async (Guid id, DuplicateCheckRequest request, TaskService tasks, CancellationToken ct) =>
            Results.Ok(await tasks.CheckDuplicatesAsync(id, request.Title, request.LocationText, ct)));

        group.MapPost("/{id:guid}/tasks", async (Guid id, CreateTaskRequest request, TaskService tasks, CancellationToken ct) =>
            Results.Created($"/api/cases/{id}", await tasks.CreateAsync(id, request, ct)));

        taskGroup.MapPatch("/{taskId:guid}/status", async (Guid taskId, UpdateTaskStatusRequest request, TaskService tasks, CancellationToken ct) =>
            Results.Ok(await tasks.UpdateStatusAsync(taskId, request.Status, request.Outcome, ct)));

        group.MapPost("/{id:guid}/ifind", async (Guid id, AddIfindEntryRequest request, IfindService ifind, CancellationToken ct) =>
            Results.Created($"/api/cases/{id}", await ifind.AddAsync(id, request, ct)));

        group.MapPatch("/{id:guid}/ifind/{entryId:guid}", async (Guid id, Guid entryId, UpdateIfindEntryRequest request, IfindService ifind, CancellationToken ct) =>
            Results.Ok(await ifind.UpdateAsync(entryId, request, ct)));

        return app;
    }
}

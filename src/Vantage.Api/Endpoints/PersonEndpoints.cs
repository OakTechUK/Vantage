using Vantage.Application.Abstractions;
using Vantage.Application.Dtos;
using Vantage.Application.Services;

namespace Vantage.Api.Endpoints;

public static class PersonEndpoints
{
    public static IEndpointRouteBuilder MapPersonEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/persons").WithTags("People").RequireAuthorization();

        group.MapGet("", async (string? search, int? page, int? pageSize, PersonService persons, CancellationToken ct) =>
            Results.Ok(await persons.SearchAsync(new PersonQuery(search, page ?? 1, pageSize ?? 20), ct)));

        group.MapPost("", async (CreatePersonRequest request, PersonService persons, CancellationToken ct) =>
        {
            var person = await persons.CreateAsync(request, ct);
            return Results.Created($"/api/persons/{person.Id}", person);
        });

        group.MapGet("/{id:guid}", async (Guid id, PersonService persons, CancellationToken ct) =>
            Results.Ok(await persons.GetAsync(id, ct)));

        group.MapPut("/{id:guid}", async (Guid id, UpdatePersonRequest request, PersonService persons, CancellationToken ct) =>
            Results.Ok(await persons.UpdateAsync(id, request, ct)));

        group.MapGet("/{id:guid}/intelligence-report", async (Guid id, PersonService persons, CancellationToken ct) =>
            Results.Ok(await persons.GetIntelligenceReportAsync(id, ct)));

        group.MapPost("/{id:guid}/associates", async (Guid id, AddAssociateRequest request, PersonService persons, CancellationToken ct) =>
            Results.Created($"/api/persons/{id}", await persons.AddAssociateAsync(id, request, ct)));

        group.MapPost("/{id:guid}/places", async (Guid id, AddPlaceRequest request, PersonService persons, CancellationToken ct) =>
            Results.Created($"/api/persons/{id}", await persons.AddPlaceAsync(id, request, ct)));

        group.MapPost("/{id:guid}/notes", async (Guid id, AddNoteRequest request, PersonService persons, CancellationToken ct) =>
            Results.Created($"/api/persons/{id}", await persons.AddNoteAsync(id, request, ct)));

        group.MapPost("/{id:guid}/images", async (Guid id, HttpRequest request, PersonService persons, CancellationToken ct) =>
        {
            if (!request.HasFormContentType)
                return Results.BadRequest(new { detail = "Upload the image as multipart/form-data." });

            var form = await request.ReadFormAsync(ct);
            var file = form.Files.GetFile("file");
            if (file is null || file.Length == 0)
                return Results.BadRequest(new { detail = "A file field named 'file' is required." });

            var caption = form["caption"].FirstOrDefault();
            var isPrimary = bool.TryParse(form["isPrimary"], out var primary) && primary;
            Guid? episodeId = Guid.TryParse(form["episodeId"], out var parsedEpisode) ? parsedEpisode : null;

            await using var stream = file.OpenReadStream();
            var image = await persons.AddImageAsync(id, episodeId, file.FileName, file.ContentType,
                file.Length, stream, caption, isPrimary, ct);
            return Results.Created($"/api/persons/{id}/images/{image.Id}", image);
        }).DisableAntiforgery();

        group.MapGet("/{id:guid}/images/{imageId:guid}/content", async (Guid id, Guid imageId, PersonService persons, CancellationToken ct) =>
        {
            var (image, content) = await persons.OpenImageAsync(id, imageId, ct);
            return Results.File(content, image.ContentType);
        });

        group.MapPost("/{id:guid}/episodes", async (Guid id, CreateCaseRequest request, CaseService cases, CancellationToken ct) =>
        {
            var created = await cases.CreateAsync(request with { PersonId = id, Person = null }, ct);
            return Results.Created($"/api/cases/{created.Id}", created);
        });

        return app;
    }
}

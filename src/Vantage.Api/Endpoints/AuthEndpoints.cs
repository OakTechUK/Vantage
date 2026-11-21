using Vantage.Application.Abstractions;

namespace Vantage.Api.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Authentication");

        group.MapPost("/login", async (LoginRequest request, IAuthenticationService auth, CancellationToken ct) =>
        {
            var result = await auth.LoginAsync(request, ct);
            return result is null
                ? Results.Json(new { detail = "Invalid force code, email or password." }, statusCode: StatusCodes.Status401Unauthorized)
                : Results.Ok(result);
        }).AllowAnonymous();

        group.MapGet("/tenants", async (IAuthenticationService auth, CancellationToken ct) =>
            Results.Ok(await auth.ListTenantsAsync(ct))).AllowAnonymous();

        group.MapGet("/me", async (ICurrentUser currentUser, IAuthenticationService auth, CancellationToken ct) =>
        {
            if (currentUser.OfficerId is not { } officerId) return Results.Unauthorized();
            var profile = await auth.GetProfileAsync(officerId, ct);
            return profile is null ? Results.Unauthorized() : Results.Ok(profile);
        }).RequireAuthorization();

        return app;
    }
}

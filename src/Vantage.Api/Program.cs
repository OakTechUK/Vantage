using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Vantage.Api.Endpoints;
using Vantage.Api.Infrastructure;
using Vantage.Application.Abstractions;
using Vantage.Infrastructure;
using Vantage.Infrastructure.Identity;
using Vantage.Infrastructure.Seeding;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, HttpContextCurrentUser>();
builder.Services.AddVantageInfrastructure(builder.Configuration);

builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = "name",
            RoleClaimType = "role"
        };
    });
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Supervisor", policy =>
        policy.RequireClaim("role", "Supervisor", "Administrator"));
});

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                     ?? ["http://localhost:3000"];
builder.Services.AddCors(options => options.AddPolicy("web", policy =>
    policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseCors("web");
app.UseAuthentication();

// Defence in depth: an authenticated principal must carry a valid tenant. Without it the
// persistence-layer tenant filter would be disabled, so refuse the request outright.
app.Use(async (context, next) =>
{
    if (context.User.Identity?.IsAuthenticated == true &&
        !Guid.TryParse(context.User.FindFirstValue("tenant_id"), out _))
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        await context.Response.WriteAsJsonAsync(new
        {
            title = "Forbidden",
            status = 403,
            detail = "The access token is missing a valid tenant claim."
        });
        return;
    }

    await next();
});

app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "Vantage.Api" }));
app.MapAuthEndpoints();
app.MapPersonEndpoints();
app.MapCaseEndpoints();
app.MapReportEndpoints();
app.MapMiscEndpoints();

if (app.Configuration.GetValue("SeedDemoData", app.Environment.IsDevelopment()))
{
    using var scope = app.Services.CreateScope();
    var seeder = scope.ServiceProvider.GetRequiredService<DemoDataSeeder>();
    await seeder.InitializeAsync();
}

await app.RunAsync();

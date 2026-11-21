using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Vantage.Application;
using Vantage.Application.Abstractions;
using Vantage.Infrastructure.Identity;
using Vantage.Infrastructure.Integrations;
using Vantage.Infrastructure.Persistence;
using Vantage.Infrastructure.Persistence.Repositories;
using Vantage.Infrastructure.Reporting;
using Vantage.Infrastructure.Seeding;
using Vantage.Infrastructure.Storage;

namespace Vantage.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddVantageInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<JwtOptions>(configuration.GetSection("Jwt"));
        services.Configure<StorageOptions>(configuration.GetSection("Storage"));
        services.AddSingleton<IClock, SystemClock>();

        var connectionString = configuration.GetConnectionString("Default") ?? "Data Source=vantage.db";
        services.AddDbContext<VantageDbContext>(options => options
            .UseSqlite(connectionString, sqlite => sqlite.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery)));

        services.AddIdentityCore<Officer>(options =>
            {
                options.Password.RequiredLength = 10;
                options.Password.RequireNonAlphanumeric = true;
                options.Password.RequireUppercase = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireDigit = true;
                options.User.RequireUniqueEmail = false;
            })
            .AddEntityFrameworkStores<VantageDbContext>();

        services.AddScoped<ITenantRepository, TenantRepository>();
        services.AddScoped<IMissingPersonRepository, MissingPersonRepository>();
        services.AddScoped<IEpisodeRepository, EpisodeRepository>();
        services.AddScoped<IIfindRepository, IfindRepository>();
        services.AddScoped<ICawnRepository, CawnRepository>();
        services.AddScoped<IReportQueries, ReportQueries>();
        services.AddScoped<IUnitOfWork, EfUnitOfWork>();
        services.AddScoped<IFileStorage, LocalFileStorage>();
        services.AddScoped<IAuthenticationService, AuthenticationService>();
        services.AddScoped<JwtTokenService>();
        services.AddScoped<IOfficerDirectory, OfficerDirectory>();
        services.AddScoped<IMissingPersonsBureauExporter, MissingPersonsBureauExporter>();
        services.AddScoped<ILocalAuthorityNotifier, StubLocalAuthorityNotifier>();
        services.AddScoped<DemoDataSeeder>();

        services.AddVantageApplication();
        return services;
    }
}

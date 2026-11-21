using Microsoft.Extensions.DependencyInjection;
using Vantage.Application.Abstractions;
using Vantage.Application.Services;

namespace Vantage.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddVantageApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuditService, AuditService>();
        services.AddScoped<ICaseNumberGenerator, CaseNumberGenerator>();
        services.AddScoped<PersonService>();
        services.AddScoped<CaseService>();
        services.AddScoped<TaskService>();
        services.AddScoped<IfindService>();
        services.AddScoped<CawnService>();
        services.AddScoped<ReportService>();
        services.AddSingleton(new DuplicateDetectionOptions());
        return services;
    }
}

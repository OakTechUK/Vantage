namespace Vantage.Domain.Entities;

/// <summary>
/// A police force (or other agency) using the platform. Tenants are the unit of
/// configuration, isolation and reporting.
/// </summary>
public class Tenant
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Short unique code used at login, e.g. "WPC".</summary>
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    /// <summary>Force code used on the UK Missing Persons Bureau quarterly return.</summary>
    public string MpbForceCode { get; set; } = string.Empty;

    public string? LocalAuthorityName { get; set; }
    public string? PrimaryContactEmail { get; set; }

    // Review intervals (hours) by risk. Configured per force.
    public int ReviewCriticalHours { get; set; } = 8;
    public int ReviewHighHours { get; set; } = 24;
    public int ReviewMediumHours { get; set; } = 72;
    public int ReviewLowHours { get; set; } = 168;

    /// <summary>Automatically notify the local authority when a child is reported missing.</summary>
    public bool NotifyLocalAuthorityForChildren { get; set; } = true;

    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }

    public TimeSpan ReviewIntervalFor(Domain.Enums.RiskLevel risk) => risk switch
    {
        Domain.Enums.RiskLevel.Critical => TimeSpan.FromHours(ReviewCriticalHours),
        Domain.Enums.RiskLevel.High => TimeSpan.FromHours(ReviewHighHours),
        Domain.Enums.RiskLevel.Medium => TimeSpan.FromHours(ReviewMediumHours),
        _ => TimeSpan.FromHours(ReviewLowHours)
    };
}

using Vantage.Domain.Enums;

namespace Vantage.Application.Dtos;

public sealed record CountByRiskDto(RiskLevel Risk, int Count);
public sealed record CountByStatusDto(EpisodeStatus Status, int Count);
public sealed record OutcomeCountDto(OutcomeType Outcome, int Count);
public sealed record MonthlyCountDto(string Month, int Reported, int Located);

public sealed record LocationHotspotDto(string Location, int CaseCount, int RepeatCount, int ChildCount);

public sealed record RepeatPersonDto(
    Guid PersonId,
    string FullName,
    int? Age,
    int EpisodeCount,
    DateTimeOffset LastReportedAt,
    string? LatestLocation,
    RiskLevel LatestRisk);

public sealed record DashboardStatsDto(
    int ActiveCases,
    int HighRiskCases,
    int OverdueReviews,
    int DueSoonReviews,
    int ChildrenMissing,
    int RepeatMissingPersons,
    int OpenTasks,
    int ReportedLast30Days);

public sealed record DashboardDto(
    DashboardStatsDto Stats,
    IReadOnlyList<CaseSummaryDto> ReviewQueue,
    IReadOnlyList<CaseSummaryDto> RecentCases,
    IReadOnlyList<CountByRiskDto> RiskBreakdown,
    IReadOnlyList<CountByStatusDto> StatusBreakdown,
    IReadOnlyList<LocationHotspotDto> TopLocations,
    IReadOnlyList<RepeatPersonDto> RepeatPersons,
    DateTimeOffset GeneratedAt);

public sealed record ReportStatsDto(
    int TotalCases,
    int ActiveCases,
    int ClosedCases,
    int LocatedCases,
    int ChildCases,
    int RepeatPersons,
    int RepeatCases,
    IReadOnlyList<CountByRiskDto> RiskBreakdown,
    IReadOnlyList<CountByStatusDto> StatusBreakdown,
    IReadOnlyList<OutcomeCountDto> Outcomes,
    IReadOnlyList<MonthlyCountDto> MonthlyTrend,
    DateTimeOffset GeneratedAt);

public sealed record ReportsOverviewDto(
    ReportStatsDto Stats,
    IReadOnlyList<RepeatPersonDto> RepeatPersons,
    IReadOnlyList<LocationHotspotDto> Locations);

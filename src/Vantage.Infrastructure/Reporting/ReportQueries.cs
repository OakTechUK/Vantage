using Microsoft.EntityFrameworkCore;
using Vantage.Application.Abstractions;
using Vantage.Application.Dtos;
using Vantage.Application.Services;
using Vantage.Domain.Entities;
using Vantage.Domain.Enums;
using Vantage.Infrastructure.Persistence;

namespace Vantage.Infrastructure.Reporting;

public sealed class ReportQueries(VantageDbContext db, IClock clock) : IReportQueries
{
    public async Task<DashboardDto> GetDashboardAsync(CancellationToken ct = default)
    {
        var now = clock.UtcNow;
        var dueSoonLimit = now.AddHours(24);
        var open = db.Episodes.Where(e => e.Status == EpisodeStatus.Reported || e.Status == EpisodeStatus.Active);

        var stats = new DashboardStatsDto(
            ActiveCases: await open.CountAsync(ct),
            HighRiskCases: await open.CountAsync(e => e.RiskLevel == RiskLevel.High || e.RiskLevel == RiskLevel.Critical, ct),
            OverdueReviews: await open.CountAsync(e => e.NextReviewDueAt != null && e.NextReviewDueAt <= now, ct),
            DueSoonReviews: await open.CountAsync(e => e.NextReviewDueAt != null && e.NextReviewDueAt > now && e.NextReviewDueAt <= dueSoonLimit, ct),
            ChildrenMissing: await open.CountAsync(e => e.IsChildAtReport, ct),
            RepeatMissingPersons: await db.MissingPersons.CountAsync(p => p.IsRepeatMissing, ct),
            OpenTasks: await db.Tasks.CountAsync(t => (t.Status == CaseTaskStatus.Open || t.Status == CaseTaskStatus.InProgress) &&
                                                     db.Episodes.Any(e => e.Id == t.EpisodeId &&
                                                                          (e.Status == EpisodeStatus.Reported || e.Status == EpisodeStatus.Active)), ct),
            ReportedLast30Days: await db.Episodes.CountAsync(e => e.ReportedAt >= now.AddDays(-30), ct));

        var reviewQueue = await WithSummaryIncludes(open
                .Where(e => e.NextReviewDueAt != null &&
                            (e.Status == EpisodeStatus.Reported || e.Status == EpisodeStatus.Active)))
            .OrderBy(e => e.NextReviewDueAt)
            .Take(12)
            .ToListAsync(ct);

        var recent = await WithSummaryIncludes(db.Episodes.AsNoTracking())
            .OrderByDescending(e => e.ReportedAt)
            .Take(8)
            .ToListAsync(ct);

        var riskBreakdown = await open
            .GroupBy(e => e.RiskLevel)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToListAsync(ct);
        var statusBreakdown = await db.Episodes
            .GroupBy(e => e.Status)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToListAsync(ct);
        var locations = await open
            .Where(e => e.LastSeenLocation != null && e.LastSeenLocation != "")
            .GroupBy(e => e.LastSeenLocation!)
            .Select(g => new
            {
                Location = g.Key,
                CaseCount = g.Count(),
                RepeatCount = g.Count(e => e.IsRepeatAtReport),
                ChildCount = g.Count(e => e.IsChildAtReport)
            })
            .OrderByDescending(x => x.CaseCount)
            .Take(8)
            .ToListAsync(ct);

        var repeatPeople = await db.MissingPersons.AsNoTracking()
            .Include(p => p.Episodes)
            .Where(p => p.IsRepeatMissing)
            .Take(200)
            .ToListAsync(ct);

        var repeatPersons = repeatPeople
            .Select(p =>
            {
                var latest = p.Episodes.OrderByDescending(e => e.ReportedAt).First();
                return new RepeatPersonDto(p.Id, p.FullName, p.AgeOn(now), p.Episodes.Count, latest.ReportedAt,
                    latest.LastSeenLocation, latest.RiskLevel);
            })
            .OrderByDescending(p => p.LastReportedAt)
            .Take(10)
            .ToList();

        return new DashboardDto(
            stats,
            reviewQueue.Where(e => e.MissingPerson is not null).Select(e => e.ToSummary(e.MissingPerson!, now)).ToList(),
            recent.Where(e => e.MissingPerson is not null).Select(e => e.ToSummary(e.MissingPerson!, now)).ToList(),
            riskBreakdown.Select(x => new CountByRiskDto(x.Key, x.Count)).OrderBy(x => x.Risk).ToList(),
            statusBreakdown.Select(x => new CountByStatusDto(x.Key, x.Count)).OrderBy(x => x.Status).ToList(),
            locations.Select(x => new LocationHotspotDto(x.Location, x.CaseCount, x.RepeatCount, x.ChildCount)).ToList(),
            repeatPersons,
            now);
    }

    public async Task<ReportStatsDto> GetStatsAsync(ReportQuery query, CancellationToken ct = default)
    {
        var now = clock.UtcNow;
        var start = query.From ?? new DateTimeOffset(1900, 1, 1, 0, 0, 0, TimeSpan.Zero);
        var end = query.To ?? new DateTimeOffset(2200, 1, 1, 0, 0, 0, TimeSpan.Zero);
        var episodes = Filter(db.Episodes.AsNoTracking(), query, start, end);

        var statuses = await episodes.GroupBy(e => e.Status).Select(g => new { g.Key, Count = g.Count() }).ToListAsync(ct);
        var risks = await episodes.GroupBy(e => e.RiskLevel).Select(g => new { g.Key, Count = g.Count() }).ToListAsync(ct);
        var outcomes = await episodes.Where(e => e.Outcome != null)
            .GroupBy(e => e.Outcome!.Value).Select(g => new { g.Key, Count = g.Count() }).ToListAsync(ct);

        var total = statuses.Sum(s => s.Count);
        var active = statuses.Where(s => s.Key is EpisodeStatus.Reported or EpisodeStatus.Active).Sum(s => s.Count);
        var closed = statuses.Where(s => s.Key == EpisodeStatus.Closed).Sum(s => s.Count);
        var located = statuses.Where(s => s.Key == EpisodeStatus.Located).Sum(s => s.Count);
        var children = await episodes.CountAsync(e => e.IsChildAtReport, ct);
        var repeatCases = await episodes.CountAsync(e => e.IsRepeatAtReport, ct);
        var repeatPersons = await episodes.Where(e => e.IsRepeatAtReport).Select(e => e.MissingPersonId).Distinct().CountAsync(ct);

        var trendStart = new DateTimeOffset(now.Year, now.Month, 1, 0, 0, 0, TimeSpan.Zero).AddMonths(-5);
        var trendRows = await db.Episodes.AsNoTracking()
            .Where(e => e.ReportedAt >= trendStart || (e.LocatedAt != null && e.LocatedAt >= trendStart))
            .Select(e => new { e.ReportedAt, e.LocatedAt })
            .ToListAsync(ct);
        var monthly = new List<MonthlyCountDto>();
        for (var i = 0; i < 6; i++)
        {
            var month = trendStart.AddMonths(i);
            var next = month.AddMonths(1);
            monthly.Add(new MonthlyCountDto(
                month.ToString("MMM yyyy"),
                trendRows.Count(r => r.ReportedAt >= month && r.ReportedAt < next),
                trendRows.Count(r => r.LocatedAt >= month && r.LocatedAt < next)));
        }

        return new ReportStatsDto(
            total,
            active,
            closed,
            located,
            children,
            repeatPersons,
            repeatCases,
            risks.Select(x => new CountByRiskDto(x.Key, x.Count)).OrderBy(x => x.Risk).ToList(),
            statuses.Select(x => new CountByStatusDto(x.Key, x.Count)).OrderBy(x => x.Status).ToList(),
            outcomes.Select(x => new OutcomeCountDto(x.Key, x.Count)).ToList(),
            monthly,
            now);
    }

    public async Task<IReadOnlyList<RepeatPersonDto>> GetRepeatPersonsAsync(ReportQuery query, CancellationToken ct = default)
    {
        var now = clock.UtcNow;
        var start = query.From ?? new DateTimeOffset(1900, 1, 1, 0, 0, 0, TimeSpan.Zero);
        var end = query.To ?? new DateTimeOffset(2200, 1, 1, 0, 0, 0, TimeSpan.Zero);
        var min = Math.Max(2, query.MinEpisodes);

        var q = db.MissingPersons.AsNoTracking()
            .Include(p => p.Episodes)
            .Where(p => p.Episodes.Count(e => e.ReportedAt >= start && e.ReportedAt <= end) >= min);

        if (!string.IsNullOrWhiteSpace(query.Location))
        {
            var term = query.Location.Trim().ToLowerInvariant();
            q = q.Where(p => p.Episodes.Any(e => e.ReportedAt >= start && e.ReportedAt <= end &&
                                                  e.LastSeenLocation != null && e.LastSeenLocation.ToLower().Contains(term)));
        }

        var people = await q.ToListAsync(ct);
        return people
            .Select(p =>
            {
                var relevant = p.Episodes.Where(e => e.ReportedAt >= start && e.ReportedAt <= end)
                    .OrderByDescending(e => e.ReportedAt).ToList();
                var latest = relevant.FirstOrDefault() ?? p.Episodes.OrderByDescending(e => e.ReportedAt).First();
                return new RepeatPersonDto(p.Id, p.FullName, p.AgeOn(now), relevant.Count, latest.ReportedAt,
                    latest.LastSeenLocation, latest.RiskLevel);
            })
            .OrderByDescending(p => p.EpisodeCount)
            .ThenByDescending(p => p.LastReportedAt)
            .Take(query.Take)
            .ToList();
    }

    public async Task<IReadOnlyList<LocationHotspotDto>> GetLocationHotspotsAsync(ReportQuery query, CancellationToken ct = default)
    {
        var start = query.From ?? new DateTimeOffset(1900, 1, 1, 0, 0, 0, TimeSpan.Zero);
        var end = query.To ?? new DateTimeOffset(2200, 1, 1, 0, 0, 0, TimeSpan.Zero);
        var episodes = Filter(db.Episodes.AsNoTracking(), query, start, end)
            .Where(e => e.LastSeenLocation != null && e.LastSeenLocation != "");

        var rows = await episodes
            .GroupBy(e => e.LastSeenLocation!)
            .Select(g => new
            {
                Location = g.Key,
                CaseCount = g.Count(),
                RepeatCount = g.Count(e => e.IsRepeatAtReport),
                ChildCount = g.Count(e => e.IsChildAtReport)
            })
            .OrderByDescending(x => x.CaseCount)
            .Take(query.Take)
            .ToListAsync(ct);

        return rows.Select(x => new LocationHotspotDto(x.Location, x.CaseCount, x.RepeatCount, x.ChildCount)).ToList();
    }

    public async Task<IReadOnlyList<MpbReturnRow>> GetMpbRowsAsync(int year, int quarter, CancellationToken ct = default)
    {
        var tenantId = db.CurrentTenantId ?? throw new InvalidOperationException("A tenant context is required.");
        var tenant = await db.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId, ct)
            ?? throw new InvalidOperationException("Tenant not found.");

        var startMonth = (quarter - 1) * 3 + 1;
        var start = new DateTimeOffset(year, startMonth, 1, 0, 0, 0, TimeSpan.Zero);
        var end = start.AddMonths(3);

        var rows = await db.Episodes.AsNoTracking()
            .Include(e => e.MissingPerson)
            .Where(e => e.ReportedAt >= start && e.ReportedAt < end)
            .OrderBy(e => e.ReportedAt)
            .ToListAsync(ct);

        return rows.Select(e => new MpbReturnRow(
            tenant.MpbForceCode,
            e.CaseNumber,
            e.MissingPerson?.FullName ?? "Unknown",
            e.MissingPerson?.DateOfBirth,
            e.MissingPerson?.Sex ?? Sex.Unknown,
            e.Category,
            e.RiskLevel,
            e.ReportedAt,
            e.LocatedAt,
            e.Outcome,
            e.LastSeenLocation,
            e.LocalAuthorityNotified)).ToList();
    }

    private static IQueryable<MissingPersonEpisode> Filter(
        IQueryable<MissingPersonEpisode> q, ReportQuery query, DateTimeOffset start, DateTimeOffset end)
    {
        q = q.Where(e => e.ReportedAt >= start && e.ReportedAt <= end);
        if (!string.IsNullOrWhiteSpace(query.Location))
        {
            var term = query.Location.Trim().ToLowerInvariant();
            q = q.Where(e => e.LastSeenLocation != null && e.LastSeenLocation.ToLower().Contains(term));
        }
        return q;
    }

    private static IQueryable<MissingPersonEpisode> WithSummaryIncludes(
        IQueryable<MissingPersonEpisode> q)
        => q.Include(e => e.MissingPerson).ThenInclude(p => p.Images).Include(e => e.Tasks);
}

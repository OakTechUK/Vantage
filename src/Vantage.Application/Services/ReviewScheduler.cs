using Vantage.Domain.Entities;
using Vantage.Domain.Enums;

namespace Vantage.Application.Services;

public static class ReviewScheduler
{
    public static readonly TimeSpan DueSoonWindow = TimeSpan.FromHours(24);

    public static DateTimeOffset NextDue(RiskLevel risk, DateTimeOffset from, Tenant tenant)
        => from + tenant.ReviewIntervalFor(risk);

    public static ReviewStatus Status(DateTimeOffset? dueAt, DateTimeOffset now)
    {
        if (dueAt is null) return ReviewStatus.NotScheduled;
        if (dueAt <= now) return ReviewStatus.Overdue;
        if (dueAt - now <= DueSoonWindow) return ReviewStatus.DueSoon;
        return ReviewStatus.OnTrack;
    }

    public static ReviewStatus Status(MissingPersonEpisode episode, DateTimeOffset now)
        => episode.Status is EpisodeStatus.Closed or EpisodeStatus.Located
            ? ReviewStatus.NotScheduled
            : Status(episode.NextReviewDueAt, now);
}

using Vantage.Application.Services;
using Vantage.Domain.Entities;
using Vantage.Domain.Enums;

namespace Vantage.Tests;

public class ReviewSchedulerTests
{
    private static readonly Tenant Force = new()
    {
        ReviewCriticalHours = 8,
        ReviewHighHours = 24,
        ReviewMediumHours = 72,
        ReviewLowHours = 168
    };

    private static readonly DateTimeOffset Now = new(2026, 11, 21, 12, 0, 0, TimeSpan.Zero);

    [Theory]
    [InlineData(RiskLevel.Critical, 8)]
    [InlineData(RiskLevel.High, 24)]
    [InlineData(RiskLevel.Medium, 72)]
    [InlineData(RiskLevel.Low, 168)]
    public void NextDue_UsesForceConfiguredInterval(RiskLevel risk, int hours)
    {
        var due = ReviewScheduler.NextDue(risk, Now, Force);
        Assert.Equal(Now.AddHours(hours), due);
    }

    [Fact]
    public void Status_IsOverdueWhenDueInPast()
    {
        Assert.Equal(ReviewStatus.Overdue, ReviewScheduler.Status(Now.AddMinutes(-1), Now));
    }

    [Fact]
    public void Status_IsDueSoonWithinTwentyFourHours()
    {
        Assert.Equal(ReviewStatus.DueSoon, ReviewScheduler.Status(Now.AddHours(23), Now));
    }

    [Fact]
    public void Status_IsOnTrackBeyondTwentyFourHours()
    {
        Assert.Equal(ReviewStatus.OnTrack, ReviewScheduler.Status(Now.AddHours(25), Now));
    }

    [Fact]
    public void Status_IsNotScheduledForClosedEpisode()
    {
        var episode = new MissingPersonEpisode
        {
            Status = EpisodeStatus.Closed,
            NextReviewDueAt = Now.AddHours(-4)
        };

        Assert.Equal(ReviewStatus.NotScheduled, ReviewScheduler.Status(episode, Now));
    }
}

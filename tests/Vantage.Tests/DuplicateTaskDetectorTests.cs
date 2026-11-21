using Vantage.Application.Services;
using Vantage.Domain.Entities;
using Vantage.Domain.Enums;

namespace Vantage.Tests;

public class DuplicateTaskDetectorTests
{
    private static CaseTask Task(string title, string? location = null, CaseTaskStatus status = CaseTaskStatus.Open)
        => new()
        {
            Title = title,
            LocationText = location,
            Status = status
        };

    [Fact]
    public void FindsTaskWithTypo()
    {
        var existing = new[]
        {
            Task("Review CCTV at Riverside Retail Park", "Riverside Retail Park")
        };

        var matches = DuplicateTaskDetector.Find(
            "Review CCTV at Riverside Retail Prk", "Riverside Retail Park", existing);

        var match = Assert.Single(matches);
        Assert.Equal(existing[0].Id, match.TaskId);
        Assert.True(match.Similarity > 0.9);
    }

    [Fact]
    public void FindsTaskWhenWordOrderDiffers()
    {
        var existing = new[] { Task("Review CCTV at Riverside Retail Park") };

        var matches = DuplicateTaskDetector.Find(
            "Riverside Retail Park CCTV review", null, existing);

        Assert.Single(matches);
    }

    [Fact]
    public void DoesNotFlagDifferentTasks()
    {
        var existing = new[]
        {
            Task("Review CCTV at Riverside Retail Park"),
            Task("Speak to school safeguarding lead")
        };

        var matches = DuplicateTaskDetector.Find(
            "Check hospital A&E departments", null, existing);

        Assert.Empty(matches);
    }

    [Fact]
    public void IgnoresCompletedTasksWhenConfigured()
    {
        var existing = new[] { Task("Review CCTV at Riverside Retail Park", status: CaseTaskStatus.Completed) };

        var matches = DuplicateTaskDetector.Find(
            "Review CCTV at Riverside Retail Park", null, existing,
            new DuplicateDetectionOptions(IncludeCompleted: false));

        Assert.Empty(matches);
    }

    [Fact]
    public void ReturnsBestMatchesFirst()
    {
        var existing = new[]
        {
            Task("Review all CCTV near the station"),
            Task("Review CCTV at Riverside Retail Park")
        };

        var matches = DuplicateTaskDetector.Find(
            "Review CCTV at Riverside Retail Prk", null, existing);

        Assert.NotEmpty(matches);
        Assert.Equal("Review CCTV at Riverside Retail Park", matches[0].Title);
    }
}

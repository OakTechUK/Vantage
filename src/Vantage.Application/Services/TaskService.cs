using Vantage.Application.Abstractions;
using Vantage.Application.Common;
using Vantage.Application.Dtos;
using Vantage.Domain.Entities;
using Vantage.Domain.Enums;

namespace Vantage.Application.Services;

public sealed class TaskService(
    IEpisodeRepository episodes,
    IUnitOfWork unitOfWork,
    ICurrentUser currentUser,
    IClock clock,
    IAuditService audit,
    DuplicateDetectionOptions duplicateOptions)
{
    public async Task<IReadOnlyList<TaskDuplicateMatch>> CheckDuplicatesAsync(
        Guid episodeId, string title, string? location, CancellationToken ct = default)
    {
        _ = await episodes.GetByIdAsync(episodeId, ct) ?? throw new NotFoundException("Enquiry not found.");
        var candidates = await episodes.GetTasksAsync(episodeId, null, ct);
        return DuplicateTaskDetector.Find(title, location, candidates, duplicateOptions);
    }

    public async Task<TaskDto> CreateAsync(Guid episodeId, CreateTaskRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Length > 200)
            throw new ValidationFailureException("Task title is required and must be 200 characters or fewer.");

        var episode = await episodes.GetByIdAsync(episodeId, ct) ?? throw new NotFoundException("Enquiry not found.");
        if (episode.Status is EpisodeStatus.Closed)
            throw new ValidationFailureException("Tasks cannot be added to a closed enquiry.");

        var candidates = await episodes.GetTasksAsync(episodeId, null, ct);
        var duplicates = DuplicateTaskDetector.Find(request.Title, request.LocationText, candidates, duplicateOptions);
        if (duplicates.Count > 0 && !request.AllowDuplicate)
            throw new DuplicateTaskException("A very similar task already exists on this enquiry.", duplicates);

        var now = clock.UtcNow;
        var task = new CaseTask
        {
            TenantId = episode.TenantId,
            EpisodeId = episodeId,
            Title = request.Title.Trim(),
            Description = Clean(request.Description),
            Category = request.Category,
            Priority = request.Priority,
            Status = CaseTaskStatus.Open,
            AssignedToOfficerId = request.AssignedToOfficerId,
            DueAt = request.DueAt,
            PlaceOfInterestId = request.PlaceOfInterestId,
            AssociateId = request.AssociateId,
            LocationText = Clean(request.LocationText),
            CreatedByOfficerId = RequireOfficer(),
            CreatedAt = now
        };
        await episodes.AddTaskAsync(task, ct);
        await unitOfWork.SaveChangesAsync(ct);
        await audit.RecordAsync("task.created", nameof(CaseTask), task.Id,
            new { task.Title, episodeId, DuplicateOverride = request.AllowDuplicate && duplicates.Count > 0 }, ct);
        return task.ToDto();
    }

    public async Task<TaskDto> UpdateStatusAsync(Guid taskId, CaseTaskStatus status, string? outcome, CancellationToken ct = default)
    {
        var task = await episodes.GetTaskAsync(taskId, ct) ?? throw new NotFoundException("Task not found.");
        task.Status = status;
        task.Outcome = Clean(outcome);
        task.UpdatedAt = clock.UtcNow;
        if (status == CaseTaskStatus.Completed)
        {
            task.CompletedAt = clock.UtcNow;
            task.CompletedByOfficerId = RequireOfficer();
        }
        else
        {
            task.CompletedAt = null;
            task.CompletedByOfficerId = null;
        }

        await unitOfWork.SaveChangesAsync(ct);
        await audit.RecordAsync("task.status.changed", nameof(CaseTask), task.Id, new { Status = status }, ct);
        return task.ToDto();
    }

    private Guid RequireOfficer() => currentUser.OfficerId ?? throw new ForbiddenException("An authenticated officer is required.");
    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

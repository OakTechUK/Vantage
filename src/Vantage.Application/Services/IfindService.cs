using Vantage.Application.Abstractions;
using Vantage.Application.Common;
using Vantage.Application.Dtos;
using Vantage.Domain.Entities;
using Vantage.Domain.Enums;

namespace Vantage.Application.Services;

public sealed class IfindService(
    IIfindRepository ifind,
    IEpisodeRepository episodes,
    IUnitOfWork unitOfWork,
    ICurrentUser currentUser,
    IClock clock,
    IAuditService audit)
{
    public async Task<IReadOnlyList<IfindItemDto>> GetCatalogueAsync(
        bool? forChild, RiskLevel? risk, IfindCategory? category, CancellationToken ct = default)
    {
        var items = await ifind.GetCatalogueAsync(forChild, risk, category, ct);
        return items.Select(i => i.ToDto()).ToList();
    }

    public async Task<IfindEntryDto> AddAsync(Guid episodeId, AddIfindEntryRequest request, CancellationToken ct = default)
    {
        var episode = await episodes.GetByIdAsync(episodeId, ct) ?? throw new NotFoundException("Enquiry not found.");
        if (episode.Status is EpisodeStatus.Closed)
            throw new ValidationFailureException("Search considerations cannot be added to a closed enquiry.");

        string title;
        IfindCategory category;
        if (request.IfindItemId is { } itemId)
        {
            var item = await ifind.GetItemAsync(itemId, ct) ?? throw new NotFoundException("iFIND item not found.");
            var existing = await episodes.GetIfindEntriesAsync(episodeId, ct);
            if (existing.Any(e => e.IfindItemId == itemId))
                throw new ValidationFailureException("This search consideration is already on the enquiry.");
            title = item.Title;
            category = item.Category;
        }
        else
        {
            if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Length > 250)
                throw new ValidationFailureException("A title is required for a custom search consideration.");
            title = request.Title.Trim();
            category = request.Category ?? IfindCategory.Other;
        }

        var entry = new IfindChecklistEntry
        {
            TenantId = episode.TenantId,
            EpisodeId = episodeId,
            IfindItemId = request.IfindItemId,
            Title = title,
            Category = category,
            Status = IfindStatus.NotStarted,
            Notes = Clean(request.Notes),
            AddedByOfficerId = RequireOfficer(),
            CreatedAt = clock.UtcNow
        };
        await episodes.AddIfindEntryAsync(entry, ct);
        await unitOfWork.SaveChangesAsync(ct);
        await audit.RecordAsync("ifind.added", nameof(IfindChecklistEntry), entry.Id, new { title }, ct);
        return entry.ToDto();
    }

    public async Task<IfindEntryDto> UpdateAsync(Guid entryId, UpdateIfindEntryRequest request, CancellationToken ct = default)
    {
        var entry = await episodes.GetIfindEntryAsync(entryId, ct) ?? throw new NotFoundException("Search consideration not found.");
        entry.Status = request.Status;
        entry.Notes = Clean(request.Notes);
        entry.UpdatedAt = clock.UtcNow;
        if (request.Status == IfindStatus.Done)
        {
            entry.CompletedAt = clock.UtcNow;
            entry.CompletedByOfficerId = RequireOfficer();
        }
        else
        {
            entry.CompletedAt = null;
            entry.CompletedByOfficerId = null;
        }

        await unitOfWork.SaveChangesAsync(ct);
        await audit.RecordAsync("ifind.updated", nameof(IfindChecklistEntry), entry.Id, new { entry.Status }, ct);
        return entry.ToDto();
    }

    private Guid RequireOfficer() => currentUser.OfficerId ?? throw new ForbiddenException("An authenticated officer is required.");
    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

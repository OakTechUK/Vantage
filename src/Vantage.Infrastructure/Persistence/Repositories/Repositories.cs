using Microsoft.EntityFrameworkCore;
using Vantage.Application.Abstractions;
using Vantage.Application.Common;
using Vantage.Domain.Entities;
using Vantage.Domain.Enums;

namespace Vantage.Infrastructure.Persistence.Repositories;

public sealed class TenantRepository(VantageDbContext db) : ITenantRepository
{
    public Task<Tenant?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => db.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id, ct);

    public Task<Tenant?> GetByCodeAsync(string code, CancellationToken ct = default)
    {
        var normalized = code.Trim().ToUpperInvariant();
        return db.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Code.ToUpper() == normalized, ct);
    }

    public async Task<IReadOnlyList<Tenant>> ListAsync(CancellationToken ct = default)
        => await db.Tenants.AsNoTracking().Where(t => t.IsActive).OrderBy(t => t.Name).ToListAsync(ct);
}

public sealed class MissingPersonRepository(VantageDbContext db) : IMissingPersonRepository
{
    public Task<MissingPerson?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => db.MissingPersons.FirstOrDefaultAsync(p => p.Id == id, ct);

    public Task<MissingPerson?> GetWithGraphAsync(Guid id, CancellationToken ct = default)
        => db.MissingPersons
            .Include(p => p.Episodes).ThenInclude(e => e.Tasks)
            .Include(p => p.Associates)
            .Include(p => p.PlacesOfInterest)
            .Include(p => p.Notes)
            .Include(p => p.Images)
            .FirstOrDefaultAsync(p => p.Id == id, ct);

    public async Task<(IReadOnlyList<MissingPerson> Items, int Total)> SearchAsync(PersonQuery query, CancellationToken ct = default)
    {
        var q = db.MissingPersons.AsNoTracking()
            .Include(p => p.Episodes)
            .Include(p => p.Images)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLowerInvariant();
            q = q.Where(p =>
                p.FirstName.ToLower().Contains(term) ||
                p.LastName.ToLower().Contains(term) ||
                (p.MiddleNames != null && p.MiddleNames.ToLower().Contains(term)));
        }

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderBy(p => p.LastName).ThenBy(p => p.FirstName)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(ct);
        return (items, total);
    }

    public Task AddAsync(MissingPerson person, CancellationToken ct = default)
    {
        db.MissingPersons.Add(person);
        return Task.CompletedTask;
    }

    public Task AddAssociateAsync(PersonAssociate associate, CancellationToken ct = default)
    {
        db.Associates.Add(associate);
        return Task.CompletedTask;
    }

    public Task AddPlaceAsync(PlaceOfInterest place, CancellationToken ct = default)
    {
        db.PlacesOfInterest.Add(place);
        return Task.CompletedTask;
    }

    public Task AddNoteAsync(PersonNote note, CancellationToken ct = default)
    {
        db.Notes.Add(note);
        return Task.CompletedTask;
    }

    public Task AddImageAsync(PersonImage image, CancellationToken ct = default)
    {
        db.Images.Add(image);
        return Task.CompletedTask;
    }

    public Task<int> CountEpisodesAsync(Guid personId, CancellationToken ct = default)
        => db.Episodes.CountAsync(e => e.MissingPersonId == personId, ct);
}

public sealed class EpisodeRepository(VantageDbContext db, IClock clock) : IEpisodeRepository
{
    public Task<MissingPersonEpisode?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => db.Episodes.FirstOrDefaultAsync(e => e.Id == id, ct);

    public Task<MissingPersonEpisode?> GetWithPersonAsync(Guid id, CancellationToken ct = default)
        => db.Episodes
            .Include(e => e.MissingPerson)!.ThenInclude(p => p.Episodes).ThenInclude(x => x.Tasks)
            .Include(e => e.MissingPerson)!.ThenInclude(p => p.Associates)
            .Include(e => e.MissingPerson)!.ThenInclude(p => p.PlacesOfInterest)
            .Include(e => e.MissingPerson)!.ThenInclude(p => p.Notes)
            .Include(e => e.MissingPerson)!.ThenInclude(p => p.Images)
            .Include(e => e.Tasks)
            .Include(e => e.Reviews)
            .Include(e => e.IfindEntries)
            .Include(e => e.Notes)
            .FirstOrDefaultAsync(e => e.Id == id, ct);

    public async Task<(IReadOnlyList<MissingPersonEpisode> Items, int Total)> SearchAsync(CaseQuery query, CancellationToken ct = default)
    {
        var now = clock.UtcNow;
        var dueSoon = now.AddHours(24);
        var q = db.Episodes.AsNoTracking()
            .Include(e => e.MissingPerson).ThenInclude(p => p.Images)
            .Include(e => e.Tasks)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLowerInvariant();
            q = q.Where(e =>
                e.CaseNumber.ToLower().Contains(term) ||
                (e.MissingPerson != null && (e.MissingPerson.FirstName.ToLower().Contains(term) ||
                                             e.MissingPerson.LastName.ToLower().Contains(term))));
        }

        if (query.Status is { } status) q = q.Where(e => e.Status == status);
        if (query.Risk is { } risk) q = q.Where(e => e.RiskLevel == risk);
        if (query.IsChild is { } isChild) q = q.Where(e => e.IsChildAtReport == isChild);
        if (query.RepeatOnly is true) q = q.Where(e => e.IsRepeatAtReport);

        if (query.Review is { } review)
        {
            q = review switch
            {
                ReviewStatus.Overdue => q.Where(e => e.NextReviewDueAt != null && e.NextReviewDueAt <= now &&
                                                      (e.Status == EpisodeStatus.Reported || e.Status == EpisodeStatus.Active)),
                ReviewStatus.DueSoon => q.Where(e => e.NextReviewDueAt != null && e.NextReviewDueAt > now && e.NextReviewDueAt <= dueSoon &&
                                                     (e.Status == EpisodeStatus.Reported || e.Status == EpisodeStatus.Active)),
                ReviewStatus.OnTrack => q.Where(e => e.NextReviewDueAt != null && e.NextReviewDueAt > dueSoon &&
                                                     (e.Status == EpisodeStatus.Reported || e.Status == EpisodeStatus.Active)),
                ReviewStatus.NotScheduled => q.Where(e => e.NextReviewDueAt == null || e.Status == EpisodeStatus.Closed || e.Status == EpisodeStatus.Located),
                _ => q
            };
        }

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderByDescending(e => e.ReportedAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(ct);
        return (items, total);
    }

    public async Task<IReadOnlyList<MissingPersonEpisode>> GetForPersonAsync(Guid personId, CancellationToken ct = default)
        => await db.Episodes.AsNoTracking()
            .Include(e => e.Tasks)
            .Where(e => e.MissingPersonId == personId)
            .OrderByDescending(e => e.ReportedAt)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<MissingPersonEpisode>> GetOpenAsync(CancellationToken ct = default)
        => await db.Episodes.AsNoTracking()
            .Include(e => e.MissingPerson).ThenInclude(p => p.Images)
            .Include(e => e.Tasks)
            .Where(e => e.Status == EpisodeStatus.Reported || e.Status == EpisodeStatus.Active)
            .ToListAsync(ct);

    public Task AddAsync(MissingPersonEpisode episode, CancellationToken ct = default)
    {
        db.Episodes.Add(episode);
        return Task.CompletedTask;
    }

    public Task<CaseNumberCounter?> GetCounterAsync(Guid tenantId, int year, CancellationToken ct = default)
        => db.CaseNumberCounters.FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Year == year, ct);

    public Task AddCounterAsync(CaseNumberCounter counter, CancellationToken ct = default)
    {
        db.CaseNumberCounters.Add(counter);
        return Task.CompletedTask;
    }

    public async Task<IReadOnlyList<CaseTask>> GetTasksAsync(Guid episodeId, CaseTaskStatus? status = null, CancellationToken ct = default)
    {
        var q = db.Tasks.AsNoTracking().Where(t => t.EpisodeId == episodeId);
        if (status is { } s) q = q.Where(t => t.Status == s);
        return await q.OrderByDescending(t => t.Priority).ThenBy(t => t.DueAt).ToListAsync(ct);
    }

    public Task<CaseTask?> GetTaskAsync(Guid taskId, CancellationToken ct = default)
        => db.Tasks.FirstOrDefaultAsync(t => t.Id == taskId, ct);

    public Task AddTaskAsync(CaseTask task, CancellationToken ct = default)
    {
        db.Tasks.Add(task);
        return Task.CompletedTask;
    }

    public async Task<IReadOnlyList<CaseReview>> GetReviewsAsync(Guid episodeId, CancellationToken ct = default)
        => await db.Reviews.AsNoTracking().Where(r => r.EpisodeId == episodeId).OrderByDescending(r => r.ReviewedAt).ToListAsync(ct);

    public Task AddReviewAsync(CaseReview review, CancellationToken ct = default)
    {
        db.Reviews.Add(review);
        return Task.CompletedTask;
    }

    public async Task<IReadOnlyList<IfindChecklistEntry>> GetIfindEntriesAsync(Guid episodeId, CancellationToken ct = default)
        => await db.IfindChecklistEntries.AsNoTracking().Where(i => i.EpisodeId == episodeId).OrderBy(i => i.Category).ToListAsync(ct);

    public Task<IfindChecklistEntry?> GetIfindEntryAsync(Guid entryId, CancellationToken ct = default)
        => db.IfindChecklistEntries.FirstOrDefaultAsync(i => i.Id == entryId, ct);

    public Task AddIfindEntryAsync(IfindChecklistEntry entry, CancellationToken ct = default)
    {
        db.IfindChecklistEntries.Add(entry);
        return Task.CompletedTask;
    }

    public async Task<IReadOnlyList<AuditEntry>> GetAuditAsync(Guid entityId, CancellationToken ct = default)
        => await db.AuditEntries.AsNoTracking()
            .Where(a => a.EntityId == entityId)
            .OrderByDescending(a => a.CreatedAt)
            .Take(500)
            .ToListAsync(ct);

    public Task AddAuditEntryAsync(AuditEntry entry, CancellationToken ct = default)
    {
        db.AuditEntries.Add(entry);
        return Task.CompletedTask;
    }
}

public sealed class IfindRepository(VantageDbContext db) : IIfindRepository
{
    public async Task<IReadOnlyList<IfindItem>> GetCatalogueAsync(
        bool? forChild = null, RiskLevel? risk = null, IfindCategory? category = null, CancellationToken ct = default)
    {
        var q = db.IfindItems.AsNoTracking().AsQueryable();
        if (forChild is true) q = q.Where(i => i.AppliesToChildren);
        if (forChild is false) q = q.Where(i => i.AppliesToAdults);
        if (risk is { } r) q = q.Where(i => i.MinimumRisk <= r);
        if (category is { } c) q = q.Where(i => i.Category == c);
        return await q.OrderBy(i => i.Category).ThenBy(i => i.Title).ToListAsync(ct);
    }

    public Task<IfindItem?> GetItemAsync(Guid id, CancellationToken ct = default)
        => db.IfindItems.FirstOrDefaultAsync(i => i.Id == id, ct);
}

public sealed class CawnRepository(VantageDbContext db) : ICawnRepository
{
    public async Task<(IReadOnlyList<ChildAbductionWarningNotice> Items, int Total)> SearchAsync(
        CawnStatus? status, string? search, int page, int pageSize, CancellationToken ct = default)
    {
        var q = db.CawnNotices.AsNoTracking().Include(n => n.Child).AsQueryable();
        if (status is { } s) q = q.Where(n => n.Status == s);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            q = q.Where(n => n.SubjectName.ToLower().Contains(term) || n.Reference.ToLower().Contains(term));
        }

        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(n => n.IssuedAt)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return (items, total);
    }

    public Task<ChildAbductionWarningNotice?> GetAsync(Guid id, CancellationToken ct = default)
        => db.CawnNotices.Include(n => n.Child).FirstOrDefaultAsync(n => n.Id == id, ct);

    public Task AddAsync(ChildAbductionWarningNotice notice, CancellationToken ct = default)
    {
        db.CawnNotices.Add(notice);
        return Task.CompletedTask;
    }
}

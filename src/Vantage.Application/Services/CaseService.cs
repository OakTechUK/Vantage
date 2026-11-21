using Vantage.Application.Abstractions;
using Vantage.Application.Common;
using Vantage.Application.Dtos;
using Vantage.Domain.Entities;
using Vantage.Domain.Enums;

namespace Vantage.Application.Services;

public sealed class CaseService(
    IEpisodeRepository episodeRepository,
    IMissingPersonRepository personRepository,
    ITenantRepository tenants,
    ICaseNumberGenerator caseNumbers,
    IUnitOfWork unitOfWork,
    ICurrentUser currentUser,
    IClock clock,
    IAuditService audit,
    ILocalAuthorityNotifier localAuthority)
{
    public async Task<PagedResult<CaseSummaryDto>> SearchAsync(CaseQuery query, CancellationToken ct = default)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var (items, total) = await episodeRepository.SearchAsync(query with { Page = page, PageSize = pageSize }, ct);
        var now = clock.UtcNow;
        var summaries = items
            .Where(e => e.MissingPerson is not null)
            .Select(e => e.ToSummary(e.MissingPerson!, now))
            .ToList();
        return new PagedResult<CaseSummaryDto>(summaries, total, page, pageSize);
    }

    public async Task<CaseDetailDto> GetAsync(Guid id, CancellationToken ct = default)
    {
        var episode = await episodeRepository.GetWithPersonAsync(id, ct)
            ?? throw new NotFoundException("Enquiry not found.");
        var auditEntries = await episodeRepository.GetAuditAsync(id, ct);
        return MapDetail(episode, auditEntries);
    }

    public async Task<CaseDetailDto> CreateAsync(CreateCaseRequest request, CancellationToken ct = default)
    {
        if (request.PersonId is null && request.Person is null)
            throw new ValidationFailureException("Provide an existing person or details for a new person.");
        if (string.IsNullOrWhiteSpace(request.Circumstances) || request.Circumstances.Length > 8000)
            throw new ValidationFailureException("Circumstances are required and must be 8,000 characters or fewer.");
        if (request.LastSeenAt is { } lastSeen && lastSeen > clock.UtcNow.AddMinutes(10))
            throw new ValidationFailureException("Last seen time cannot be in the future.");

        var tenantId = RequireTenant();
        var officerId = RequireOfficer();
        var now = clock.UtcNow;
        var tenant = await tenants.GetByIdAsync(tenantId, ct)
            ?? throw new ForbiddenException("Tenant not found.");

        MissingPerson person;
        if (request.PersonId is { } personId)
        {
            person = await personRepository.GetByIdAsync(personId, ct)
                ?? throw new NotFoundException("Person not found.");
        }
        else
        {
            person = PersonFactory.Create(request.Person!, tenantId, officerId, now);
        }

        var previousEpisodes = await personRepository.CountEpisodesAsync(person.Id, ct);
        var caseNumber = await caseNumbers.NextAsync(tenantId, tenant.Code, ct);
        var isChild = person.AgeOn(now) is < 18;

        var episode = new MissingPersonEpisode
        {
            TenantId = tenantId,
            CaseNumber = caseNumber,
            MissingPersonId = person.Id,
            Status = EpisodeStatus.Reported,
            Category = request.Category,
            RiskLevel = request.RiskLevel,
            ReportedAt = now,
            ReportedByOfficerId = officerId,
            AssignedOfficerId = request.AssignedOfficerId,
            Circumstances = request.Circumstances.Trim(),
            LastSeenAt = request.LastSeenAt,
            LastSeenLocation = Clean(request.LastSeenLocation),
            LastSeenWearing = Clean(request.LastSeenWearing),
            LastSeenWith = Clean(request.LastSeenWith),
            IsChildAtReport = isChild,
            IsRepeatAtReport = previousEpisodes > 0,
            NextReviewDueAt = ReviewScheduler.NextDue(request.RiskLevel, now, tenant),
            CreatedAt = now
        };

        if (request.PersonId is null)
            await personRepository.AddAsync(person, ct);
        if (previousEpisodes > 0) person.IsRepeatMissing = true;

        await episodeRepository.AddAsync(episode, ct);
        await unitOfWork.SaveChangesAsync(ct);
        await audit.RecordAsync("case.created", nameof(MissingPersonEpisode), episode.Id,
            new { episode.CaseNumber, episode.RiskLevel, episode.Category, IsRepeat = episode.IsRepeatAtReport }, ct);

        if (isChild && tenant.NotifyLocalAuthorityForChildren)
        {
            try
            {
                var notification = await localAuthority.NotifyChildMissingAsync(
                    tenant.Id, tenant.Name, episode.CaseNumber, person.FullName, person.DateOfBirth, ct);
                if (notification.Notified)
                {
                    episode.LocalAuthorityNotified = true;
                    episode.LocalAuthorityNotifiedAt = notification.NotifiedAt ?? now;
                    await unitOfWork.SaveChangesAsync(ct);
                    await audit.RecordAsync("case.local-authority.notified", nameof(MissingPersonEpisode), episode.Id,
                        new { notification.Reference }, ct);
                }
            }
            catch (Exception ex)
            {
                await audit.RecordAsync("case.local-authority.notification-failed", nameof(MissingPersonEpisode), episode.Id,
                    new { Error = ex.Message }, ct);
            }
        }

        return await GetAsync(episode.Id, ct);
    }

    public async Task<CaseDetailDto> UpdateAsync(Guid id, UpdateCaseRequest request, CancellationToken ct = default)
    {
        var episode = await episodeRepository.GetByIdAsync(id, ct) ?? throw new NotFoundException("Enquiry not found.");
        if (episode.Status is EpisodeStatus.Closed)
            throw new ValidationFailureException("A closed enquiry cannot be edited.");
        if (string.IsNullOrWhiteSpace(request.Circumstances) || request.Circumstances.Length > 8000)
            throw new ValidationFailureException("Circumstances are required and must be 8,000 characters or fewer.");

        var riskChanged = episode.RiskLevel != request.RiskLevel;
        episode.Category = request.Category;
        episode.RiskLevel = request.RiskLevel;
        episode.Circumstances = request.Circumstances.Trim();
        episode.LastSeenAt = request.LastSeenAt;
        episode.LastSeenLocation = Clean(request.LastSeenLocation);
        episode.LastSeenWearing = Clean(request.LastSeenWearing);
        episode.LastSeenWith = Clean(request.LastSeenWith);
        episode.AssignedOfficerId = request.AssignedOfficerId;
        episode.UpdatedAt = clock.UtcNow;

        if (riskChanged)
        {
            var tenant = await tenants.GetByIdAsync(episode.TenantId, ct)
                ?? throw new ForbiddenException("Tenant not found.");
            episode.NextReviewDueAt = ReviewScheduler.NextDue(request.RiskLevel, clock.UtcNow, tenant);
        }

        await unitOfWork.SaveChangesAsync(ct);
        await audit.RecordAsync("case.updated", nameof(MissingPersonEpisode), episode.Id,
            new { episode.RiskLevel, RiskChanged = riskChanged, episode.AssignedOfficerId }, ct);
        return await GetAsync(id, ct);
    }

    public async Task<CaseDetailDto> AddReviewAsync(Guid id, AddReviewRequest request, CancellationToken ct = default)
    {
        var episode = await episodeRepository.GetByIdAsync(id, ct) ?? throw new NotFoundException("Enquiry not found.");
        if (episode.Status is EpisodeStatus.Closed or EpisodeStatus.Located)
            throw new ValidationFailureException("This enquiry is no longer open for review.");
        if (string.IsNullOrWhiteSpace(request.Notes))
            throw new ValidationFailureException("Review notes are required.");

        var now = clock.UtcNow;
        var tenant = await tenants.GetByIdAsync(episode.TenantId, ct) ?? throw new ForbiddenException("Tenant not found.");
        var due = request.NextReviewDueAt ?? ReviewScheduler.NextDue(request.RiskLevel, now, tenant);

        episode.RiskLevel = request.RiskLevel;
        episode.LastReviewedAt = now;
        episode.NextReviewDueAt = due;
        if (episode.Status is EpisodeStatus.Reported) episode.Status = EpisodeStatus.Active;

        var review = new CaseReview
        {
            TenantId = episode.TenantId,
            EpisodeId = episode.Id,
            ReviewedByOfficerId = RequireOfficer(),
            ReviewedAt = now,
            RiskLevelAtReview = request.RiskLevel,
            Notes = request.Notes.Trim(),
            NextReviewDueAt = due
        };
        await episodeRepository.AddReviewAsync(review, ct);
        await unitOfWork.SaveChangesAsync(ct);
        await audit.RecordAsync("case.reviewed", nameof(MissingPersonEpisode), episode.Id,
            new { episode.RiskLevel, NextReviewDueAt = due }, ct);
        return await GetAsync(id, ct);
    }

    public async Task<CaseDetailDto> LocateAsync(Guid id, LocateCaseRequest request, CancellationToken ct = default)
    {
        var episode = await episodeRepository.GetByIdAsync(id, ct) ?? throw new NotFoundException("Enquiry not found.");
        if (episode.Status is EpisodeStatus.Closed)
            throw new ValidationFailureException("This enquiry is already closed.");

        episode.Status = EpisodeStatus.Located;
        episode.LocatedAt = request.LocatedAt;
        episode.LocatedLocation = Clean(request.Location);
        episode.LocatedByOfficerId = RequireOfficer();
        episode.Outcome = request.Outcome;
        episode.NextReviewDueAt = null;
        episode.UpdatedAt = clock.UtcNow;
        await unitOfWork.SaveChangesAsync(ct);
        await audit.RecordAsync("case.located", nameof(MissingPersonEpisode), episode.Id,
            new { episode.LocatedAt, episode.Outcome }, ct);
        return await GetAsync(id, ct);
    }

    public async Task<CaseDetailDto> CloseAsync(Guid id, CloseCaseRequest request, CancellationToken ct = default)
    {
        var episode = await episodeRepository.GetByIdAsync(id, ct) ?? throw new NotFoundException("Enquiry not found.");
        if (episode.Status is EpisodeStatus.Closed)
            throw new ValidationFailureException("This enquiry is already closed.");

        var now = clock.UtcNow;
        episode.Status = EpisodeStatus.Closed;
        episode.Outcome = request.Outcome;
        episode.ClosedAt = now;
        episode.ClosureNotes = Clean(request.Notes);
        episode.NextReviewDueAt = null;
        episode.UpdatedAt = now;
        await unitOfWork.SaveChangesAsync(ct);
        await audit.RecordAsync("case.closed", nameof(MissingPersonEpisode), episode.Id,
            new { episode.Outcome, request.Notes }, ct);
        return await GetAsync(id, ct);
    }

    public async Task<CaseDetailDto> NotifyLocalAuthorityAsync(Guid id, CancellationToken ct = default)
    {
        var episode = await episodeRepository.GetWithPersonAsync(id, ct) ?? throw new NotFoundException("Enquiry not found.");
        if (!episode.IsChildAtReport)
            throw new ValidationFailureException("Local authority notification only applies to children.");
        if (episode.LocalAuthorityNotified)
            return MapDetail(episode, await episodeRepository.GetAuditAsync(id, ct));

        var person = episode.MissingPerson!;
        var tenant = await tenants.GetByIdAsync(episode.TenantId, ct) ?? throw new ForbiddenException("Tenant not found.");
        var result = await localAuthority.NotifyChildMissingAsync(
            episode.TenantId, tenant.Name, episode.CaseNumber, person.FullName, person.DateOfBirth, ct);

        episode.LocalAuthorityNotified = result.Notified;
        episode.LocalAuthorityNotifiedAt = result.Notified ? result.NotifiedAt ?? clock.UtcNow : null;
        await unitOfWork.SaveChangesAsync(ct);
        await audit.RecordAsync("case.local-authority.notified", nameof(MissingPersonEpisode), episode.Id,
            new { result.Reference }, ct);
        return await GetAsync(id, ct);
    }

    private CaseDetailDto MapDetail(MissingPersonEpisode episode, IReadOnlyList<AuditEntry> auditEntries)
    {
        var person = episode.MissingPerson ?? throw new NotFoundException("Person not found.");
        var now = clock.UtcNow;
        return new CaseDetailDto(
            episode.Id,
            episode.CaseNumber,
            person.ToDetail(now),
            episode.IsRepeatAtReport,
            episode.Status,
            episode.Category,
            episode.RiskLevel,
            episode.ReportedAt,
            episode.ReportedByOfficerId,
            episode.AssignedOfficerId,
            episode.Circumstances,
            episode.LastSeenAt,
            episode.LastSeenLocation,
            episode.LastSeenWearing,
            episode.LastSeenWith,
            episode.IsChildAtReport,
            episode.LocalAuthorityNotified,
            episode.LocalAuthorityNotifiedAt,
            episode.LastReviewedAt,
            episode.NextReviewDueAt,
            ReviewScheduler.Status(episode, now),
            episode.LocatedAt,
            episode.LocatedLocation,
            episode.Outcome,
            episode.ClosedAt,
            episode.ClosureNotes,
            episode.Tasks.OrderBy(t => t.Status).ThenByDescending(t => t.Priority).ThenBy(t => t.DueAt).Select(t => t.ToDto()).ToList(),
            episode.Reviews.OrderByDescending(r => r.ReviewedAt).Select(r => r.ToDto()).ToList(),
            episode.IfindEntries.OrderBy(i => i.Status).ThenBy(i => i.Category).Select(i => i.ToDto()).ToList(),
            episode.Notes.OrderByDescending(n => n.CreatedAt).Select(n => n.ToDto()).ToList(),
            auditEntries.OrderByDescending(a => a.CreatedAt).Select(a => a.ToDto()).ToList());
    }

    private Guid RequireTenant() => currentUser.TenantId ?? throw new ForbiddenException("A tenant context is required.");
    private Guid RequireOfficer() => currentUser.OfficerId ?? throw new ForbiddenException("An authenticated officer is required.");
    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

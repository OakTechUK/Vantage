using Vantage.Application.Dtos;
using Vantage.Domain.Entities;
using Vantage.Domain.Enums;

namespace Vantage.Application.Abstractions;

public sealed record PersonQuery(string? Search = null, int Page = 1, int PageSize = 20);

public sealed record CaseQuery(
    string? Search = null,
    EpisodeStatus? Status = null,
    RiskLevel? Risk = null,
    ReviewStatus? Review = null,
    bool? IsChild = null,
    bool? RepeatOnly = null,
    int Page = 1,
    int PageSize = 25);

public sealed record ReportQuery(
    DateTimeOffset? From = null,
    DateTimeOffset? To = null,
    string? Location = null,
    int MinEpisodes = 2,
    int Take = 50);

public interface ITenantRepository
{
    Task<Tenant?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Tenant?> GetByCodeAsync(string code, CancellationToken ct = default);
    Task<IReadOnlyList<Tenant>> ListAsync(CancellationToken ct = default);
}

public interface IMissingPersonRepository
{
    Task<MissingPerson?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<MissingPerson?> GetWithGraphAsync(Guid id, CancellationToken ct = default);
    Task<(IReadOnlyList<MissingPerson> Items, int Total)> SearchAsync(PersonQuery query, CancellationToken ct = default);
    Task AddAsync(MissingPerson person, CancellationToken ct = default);
    Task AddAssociateAsync(PersonAssociate associate, CancellationToken ct = default);
    Task AddPlaceAsync(PlaceOfInterest place, CancellationToken ct = default);
    Task AddNoteAsync(PersonNote note, CancellationToken ct = default);
    Task AddImageAsync(PersonImage image, CancellationToken ct = default);
    Task<int> CountEpisodesAsync(Guid personId, CancellationToken ct = default);
}

public interface IEpisodeRepository
{
    Task<MissingPersonEpisode?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<MissingPersonEpisode?> GetWithPersonAsync(Guid id, CancellationToken ct = default);
    Task<(IReadOnlyList<MissingPersonEpisode> Items, int Total)> SearchAsync(CaseQuery query, CancellationToken ct = default);
    Task<IReadOnlyList<MissingPersonEpisode>> GetForPersonAsync(Guid personId, CancellationToken ct = default);
    Task<IReadOnlyList<MissingPersonEpisode>> GetOpenAsync(CancellationToken ct = default);
    Task AddAsync(MissingPersonEpisode episode, CancellationToken ct = default);

    Task<CaseNumberCounter?> GetCounterAsync(Guid tenantId, int year, CancellationToken ct = default);
    Task AddCounterAsync(CaseNumberCounter counter, CancellationToken ct = default);

    Task<IReadOnlyList<CaseTask>> GetTasksAsync(Guid episodeId, CaseTaskStatus? status = null, CancellationToken ct = default);
    Task<CaseTask?> GetTaskAsync(Guid taskId, CancellationToken ct = default);
    Task AddTaskAsync(CaseTask task, CancellationToken ct = default);

    Task<IReadOnlyList<CaseReview>> GetReviewsAsync(Guid episodeId, CancellationToken ct = default);
    Task AddReviewAsync(CaseReview review, CancellationToken ct = default);

    Task<IReadOnlyList<IfindChecklistEntry>> GetIfindEntriesAsync(Guid episodeId, CancellationToken ct = default);
    Task<IfindChecklistEntry?> GetIfindEntryAsync(Guid entryId, CancellationToken ct = default);
    Task AddIfindEntryAsync(IfindChecklistEntry entry, CancellationToken ct = default);

    Task<IReadOnlyList<AuditEntry>> GetAuditAsync(Guid entityId, CancellationToken ct = default);
    Task AddAuditEntryAsync(AuditEntry entry, CancellationToken ct = default);
}

public interface IIfindRepository
{
    Task<IReadOnlyList<IfindItem>> GetCatalogueAsync(
        bool? forChild = null, RiskLevel? risk = null, IfindCategory? category = null, CancellationToken ct = default);
    Task<IfindItem?> GetItemAsync(Guid id, CancellationToken ct = default);
}

public interface ICawnRepository
{
    Task<(IReadOnlyList<ChildAbductionWarningNotice> Items, int Total)> SearchAsync(
        CawnStatus? status, string? search, int page, int pageSize, CancellationToken ct = default);
    Task<ChildAbductionWarningNotice?> GetAsync(Guid id, CancellationToken ct = default);
    Task AddAsync(ChildAbductionWarningNotice notice, CancellationToken ct = default);
}

/// <summary>
/// Read-side reporting queries. Kept behind an interface so a warehousing/reporting
/// database can serve dashboards and statutory returns independently of the write model.
/// </summary>
public interface IReportQueries
{
    Task<DashboardDto> GetDashboardAsync(CancellationToken ct = default);
    Task<ReportStatsDto> GetStatsAsync(ReportQuery query, CancellationToken ct = default);
    Task<IReadOnlyList<RepeatPersonDto>> GetRepeatPersonsAsync(ReportQuery query, CancellationToken ct = default);
    Task<IReadOnlyList<LocationHotspotDto>> GetLocationHotspotsAsync(ReportQuery query, CancellationToken ct = default);
    Task<IReadOnlyList<MpbReturnRow>> GetMpbRowsAsync(int year, int quarter, CancellationToken ct = default);
}

public sealed record MpbReturnRow(
    string ForceCode,
    string CaseNumber,
    string PersonName,
    DateOnly? DateOfBirth,
    Sex Sex,
    MissingCategory Category,
    RiskLevel Risk,
    DateTimeOffset ReportedAt,
    DateTimeOffset? LocatedAt,
    OutcomeType? Outcome,
    string? LastSeenLocation,
    bool LocalAuthorityNotified);

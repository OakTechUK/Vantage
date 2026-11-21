using Vantage.Domain.Enums;

namespace Vantage.Application.Dtos;

public sealed record CaseSummaryDto(
    Guid Id,
    string CaseNumber,
    Guid PersonId,
    string PersonName,
    int? PersonAge,
    Sex Sex,
    EpisodeStatus Status,
    MissingCategory Category,
    RiskLevel RiskLevel,
    ReviewStatus ReviewStatus,
    DateTimeOffset? NextReviewDueAt,
    DateTimeOffset ReportedAt,
    string? LastSeenLocation,
    bool IsRepeat,
    bool IsChild,
    Guid? PrimaryImageId,
    int OpenTaskCount);

public sealed record TaskDto(
    Guid Id,
    Guid EpisodeId,
    string Title,
    string? Description,
    TaskCategory Category,
    TaskPriority Priority,
    CaseTaskStatus Status,
    Guid? AssignedToOfficerId,
    DateTimeOffset? DueAt,
    DateTimeOffset? CompletedAt,
    Guid? CompletedByOfficerId,
    string? Outcome,
    Guid? PlaceOfInterestId,
    Guid? AssociateId,
    string? LocationText,
    Guid CreatedByOfficerId,
    DateTimeOffset CreatedAt);

public sealed record TaskDuplicateMatch(
    Guid TaskId,
    string Title,
    CaseTaskStatus Status,
    double Similarity,
    int Distance,
    string? LocationText);

public sealed record ReviewDto(
    Guid Id,
    Guid ReviewedByOfficerId,
    DateTimeOffset ReviewedAt,
    RiskLevel RiskLevelAtReview,
    string Notes,
    DateTimeOffset NextReviewDueAt);

public sealed record AuditDto(
    Guid Id,
    Guid? ActorOfficerId,
    string Action,
    string EntityType,
    Guid? EntityId,
    string? Details,
    DateTimeOffset OccurredAt);

public sealed record CaseDetailDto(
    Guid Id,
    string CaseNumber,
    PersonDetailDto Person,
    bool IsRepeatAtReport,
    EpisodeStatus Status,
    MissingCategory Category,
    RiskLevel RiskLevel,
    DateTimeOffset ReportedAt,
    Guid ReportedByOfficerId,
    Guid? AssignedOfficerId,
    string Circumstances,
    DateTimeOffset? LastSeenAt,
    string? LastSeenLocation,
    string? LastSeenWearing,
    string? LastSeenWith,
    bool IsChildAtReport,
    bool LocalAuthorityNotified,
    DateTimeOffset? LocalAuthorityNotifiedAt,
    DateTimeOffset? LastReviewedAt,
    DateTimeOffset? NextReviewDueAt,
    ReviewStatus ReviewStatus,
    DateTimeOffset? LocatedAt,
    string? LocatedLocation,
    OutcomeType? Outcome,
    DateTimeOffset? ClosedAt,
    string? ClosureNotes,
    IReadOnlyList<TaskDto> Tasks,
    IReadOnlyList<ReviewDto> Reviews,
    IReadOnlyList<IfindEntryDto> Ifind,
    IReadOnlyList<NoteDto> Notes,
    IReadOnlyList<AuditDto> Audit);

public sealed record CreateCaseRequest(
    Guid? PersonId,
    CreatePersonRequest? Person,
    MissingCategory Category,
    RiskLevel RiskLevel,
    string Circumstances,
    DateTimeOffset? LastSeenAt,
    string? LastSeenLocation,
    string? LastSeenWearing,
    string? LastSeenWith,
    Guid? AssignedOfficerId);

public sealed record UpdateCaseRequest(
    MissingCategory Category,
    RiskLevel RiskLevel,
    string Circumstances,
    DateTimeOffset? LastSeenAt,
    string? LastSeenLocation,
    string? LastSeenWearing,
    string? LastSeenWith,
    Guid? AssignedOfficerId);

public sealed record AddReviewRequest(
    RiskLevel RiskLevel,
    string Notes,
    DateTimeOffset? NextReviewDueAt);

public sealed record LocateCaseRequest(
    DateTimeOffset LocatedAt,
    string? Location,
    OutcomeType Outcome);

public sealed record CloseCaseRequest(
    OutcomeType Outcome,
    string? Notes);

public sealed record CreateTaskRequest(
    string Title,
    string? Description,
    TaskCategory Category,
    TaskPriority Priority,
    Guid? AssignedToOfficerId,
    DateTimeOffset? DueAt,
    Guid? PlaceOfInterestId,
    Guid? AssociateId,
    string? LocationText,
    bool AllowDuplicate = false);

public sealed record CompleteTaskRequest(string? Outcome);

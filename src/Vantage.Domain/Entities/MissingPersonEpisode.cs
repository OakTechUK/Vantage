using Vantage.Domain.Common;
using Vantage.Domain.Enums;

namespace Vantage.Domain.Entities;

/// <summary>
/// A single missing person enquiry, from initial report through investigation to closure.
/// </summary>
public class MissingPersonEpisode : TenantEntity
{
    public string CaseNumber { get; set; } = string.Empty;
    public Guid MissingPersonId { get; set; }
    public MissingPerson? MissingPerson { get; set; }

    public EpisodeStatus Status { get; set; } = EpisodeStatus.Reported;
    public MissingCategory Category { get; set; } = MissingCategory.Missing;
    public RiskLevel RiskLevel { get; set; } = RiskLevel.Medium;

    public DateTimeOffset ReportedAt { get; set; } = DateTimeOffset.UtcNow;
    public Guid ReportedByOfficerId { get; set; }
    public Guid? AssignedOfficerId { get; set; }

    public string Circumstances { get; set; } = string.Empty;
    public DateTimeOffset? LastSeenAt { get; set; }
    public string? LastSeenLocation { get; set; }
    public string? LastSeenWearing { get; set; }
    public string? LastSeenWith { get; set; }

    public bool IsChildAtReport { get; set; }
    public bool IsRepeatAtReport { get; set; }
    public bool LocalAuthorityNotified { get; set; }
    public DateTimeOffset? LocalAuthorityNotifiedAt { get; set; }

    public DateTimeOffset? LastReviewedAt { get; set; }
    public DateTimeOffset? NextReviewDueAt { get; set; }

    public DateTimeOffset? LocatedAt { get; set; }
    public string? LocatedLocation { get; set; }
    public Guid? LocatedByOfficerId { get; set; }
    public OutcomeType? Outcome { get; set; }
    public DateTimeOffset? ClosedAt { get; set; }
    public string? ClosureNotes { get; set; }

    public ICollection<CaseTask> Tasks { get; set; } = new List<CaseTask>();
    public ICollection<CaseReview> Reviews { get; set; } = new List<CaseReview>();
    public ICollection<IfindChecklistEntry> IfindEntries { get; set; } = new List<IfindChecklistEntry>();
    public ICollection<PersonNote> Notes { get; set; } = new List<PersonNote>();

    public bool IsOpen => Status is EpisodeStatus.Reported or EpisodeStatus.Active;
}

public class CaseTask : TenantEntity
{
    public Guid EpisodeId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TaskCategory Category { get; set; } = TaskCategory.Enquiry;
    public TaskPriority Priority { get; set; } = TaskPriority.Normal;
    public CaseTaskStatus Status { get; set; } = CaseTaskStatus.Open;

    public Guid? AssignedToOfficerId { get; set; }
    public DateTimeOffset? DueAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public Guid? CompletedByOfficerId { get; set; }
    public string? Outcome { get; set; }

    /// <summary>Optional links to a known place or person of interest on the file.</summary>
    public Guid? PlaceOfInterestId { get; set; }
    public Guid? AssociateId { get; set; }
    public string? LocationText { get; set; }

    public Guid CreatedByOfficerId { get; set; }
}

public class CaseReview : TenantEntity
{
    public Guid EpisodeId { get; set; }
    public Guid ReviewedByOfficerId { get; set; }
    public DateTimeOffset ReviewedAt { get; set; } = DateTimeOffset.UtcNow;
    public RiskLevel RiskLevelAtReview { get; set; }
    public string Notes { get; set; } = string.Empty;
    public DateTimeOffset NextReviewDueAt { get; set; }
}

public class CaseNumberCounter : TenantEntity
{
    public int Year { get; set; }
    public int LastNumber { get; set; }
}

public class AuditEntry : TenantEntity
{
    public Guid? ActorOfficerId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public Guid? EntityId { get; set; }
    public string? Details { get; set; }
    public string? IpAddress { get; set; }
}

public class IfindChecklistEntry : TenantEntity
{
    public Guid EpisodeId { get; set; }
    public Guid? IfindItemId { get; set; }
    public string Title { get; set; } = string.Empty;
    public IfindCategory Category { get; set; } = IfindCategory.Other;
    public IfindStatus Status { get; set; } = IfindStatus.NotStarted;
    public string? Notes { get; set; }
    public Guid AddedByOfficerId { get; set; }
    public Guid? CompletedByOfficerId { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
}

public class ChildAbductionWarningNotice : TenantEntity
{
    public string Reference { get; set; } = string.Empty;
    public Guid ChildPersonId { get; set; }
    public MissingPerson? Child { get; set; }
    public Guid? SubjectAssociateId { get; set; }
    public string SubjectName { get; set; } = string.Empty;
    public DateOnly? SubjectDateOfBirth { get; set; }
    public DateTimeOffset IssuedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ExpiresAt { get; set; }
    public CawnStatus Status { get; set; } = CawnStatus.Active;
    public string Reason { get; set; } = string.Empty;
    public Guid IssuedByOfficerId { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
    public string? RevocationReason { get; set; }
}

public class IfindItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public IfindCategory Category { get; set; }
    public bool AppliesToChildren { get; set; } = true;
    public bool AppliesToAdults { get; set; } = true;
    public RiskLevel MinimumRisk { get; set; } = RiskLevel.Low;
    public string? Guidance { get; set; }
}

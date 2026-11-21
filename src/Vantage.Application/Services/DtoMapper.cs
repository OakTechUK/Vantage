using Vantage.Application.Dtos;
using Vantage.Domain.Entities;
using Vantage.Domain.Enums;

namespace Vantage.Application.Services;

public static class DtoMapper
{
    public static PersonSummaryDto ToSummary(this MissingPerson person, DateTimeOffset now)
    {
        var latest = person.Episodes.OrderByDescending(e => e.ReportedAt).FirstOrDefault();
        var primary = PrimaryImage(person);
        return new PersonSummaryDto(
            person.Id,
            person.FullName,
            person.DateOfBirth,
            person.AgeOn(now),
            person.Sex,
            person.IsRepeatMissing,
            person.Episodes.Count,
            latest?.Status,
            latest?.RiskLevel,
            latest?.ReportedAt,
            primary?.Id);
    }

    public static PersonDetailDto ToDetail(this MissingPerson person, DateTimeOffset now)
        => new(
            person.Id,
            person.FirstName,
            person.MiddleNames,
            person.LastName,
            person.FullName,
            person.DateOfBirth,
            person.AgeOn(now),
            person.Sex,
            person.Ethnicity,
            person.Nationality,
            person.Languages,
            person.HeightCm,
            person.Build,
            person.HairColour,
            person.EyeColour,
            person.DistinguishingFeatures,
            person.Description,
            person.IsRepeatMissing,
            new VulnerabilityDto(
                person.IsLookedAfterChild,
                person.HasLearningDifficulty,
                person.HasMentalHealthConcerns,
                person.IsKnownSubstanceUser,
                person.IsAtRiskOfExploitation,
                person.VulnerabilitySummary),
            person.CreatedAt,
            person.Associates.OrderBy(a => a.Name).Select(ToDto).ToList(),
            person.PlacesOfInterest.OrderByDescending(p => p.SearchPriority).ThenBy(p => p.Label).Select(ToDto).ToList(),
            person.Notes.OrderByDescending(n => n.CreatedAt).Select(ToDto).ToList(),
            person.Images.OrderByDescending(i => i.IsPrimary).ThenBy(i => i.CreatedAt).Select(ToDto).ToList(),
            person.Episodes.OrderByDescending(e => e.ReportedAt).Select(e => e.ToSummary(person, now)).ToList());

    public static CaseSummaryDto ToSummary(this MissingPersonEpisode episode, MissingPerson person, DateTimeOffset now)
        => new(
            episode.Id,
            episode.CaseNumber,
            person.Id,
            person.FullName,
            person.AgeOn(now),
            person.Sex,
            episode.Status,
            episode.Category,
            episode.RiskLevel,
            ReviewScheduler.Status(episode, now),
            episode.NextReviewDueAt,
            episode.ReportedAt,
            episode.LastSeenLocation,
            episode.IsRepeatAtReport,
            episode.IsChildAtReport,
            PrimaryImage(person)?.Id,
            episode.Tasks.Count(t => t.Status is CaseTaskStatus.Open or CaseTaskStatus.InProgress));

    public static TaskDto ToDto(this CaseTask task)
        => new(
            task.Id,
            task.EpisodeId,
            task.Title,
            task.Description,
            task.Category,
            task.Priority,
            task.Status,
            task.AssignedToOfficerId,
            task.DueAt,
            task.CompletedAt,
            task.CompletedByOfficerId,
            task.Outcome,
            task.PlaceOfInterestId,
            task.AssociateId,
            task.LocationText,
            task.CreatedByOfficerId,
            task.CreatedAt);

    public static ReviewDto ToDto(this CaseReview review)
        => new(review.Id, review.ReviewedByOfficerId, review.ReviewedAt, review.RiskLevelAtReview, review.Notes, review.NextReviewDueAt);

    public static AssociateDto ToDto(this PersonAssociate associate)
        => new(
            associate.Id,
            associate.Name,
            associate.Relationship,
            associate.Phone,
            associate.Email,
            associate.Address,
            associate.Notes,
            associate.IsSignificantRisk,
            associate.CreatedAt);

    public static PlaceDto ToDto(this PlaceOfInterest place)
        => new(
            place.Id,
            place.Label,
            place.Category,
            place.Address,
            place.Latitude,
            place.Longitude,
            place.SearchPriority,
            place.Notes,
            place.CreatedAt);

    public static NoteDto ToDto(this PersonNote note)
        => new(note.Id, note.EpisodeId, note.Category, note.Title, note.Body, note.IsSensitive, note.CreatedByOfficerId, note.CreatedAt);

    public static ImageDto ToDto(this PersonImage image)
        => new(image.Id, image.EpisodeId, image.FileName, image.ContentType, image.SizeBytes, image.Caption, image.IsPrimary, image.CreatedAt);

    public static IfindEntryDto ToDto(this IfindChecklistEntry entry)
        => new(
            entry.Id,
            entry.IfindItemId,
            entry.Title,
            entry.Category,
            entry.Status,
            entry.Notes,
            entry.AddedByOfficerId,
            entry.CompletedByOfficerId,
            entry.CompletedAt,
            entry.CreatedAt);

    public static IfindItemDto ToDto(this IfindItem item)
        => new(
            item.Id,
            item.Code,
            item.Title,
            item.Description,
            item.Category,
            item.AppliesToChildren,
            item.AppliesToAdults,
            item.MinimumRisk,
            item.Guidance);

    public static AuditDto ToDto(this AuditEntry entry)
        => new(entry.Id, entry.ActorOfficerId, entry.Action, entry.EntityType, entry.EntityId, entry.Details, entry.CreatedAt);

    public static CawnDto ToDto(this ChildAbductionWarningNotice notice)
        => new(
            notice.Id,
            notice.Reference,
            notice.ChildPersonId,
            notice.Child?.FullName ?? "Unknown",
            notice.SubjectAssociateId,
            notice.SubjectName,
            notice.SubjectDateOfBirth,
            notice.IssuedAt,
            notice.ExpiresAt,
            notice.Status,
            notice.Reason,
            notice.IssuedByOfficerId,
            notice.RevokedAt,
            notice.RevocationReason);

    private static PersonImage? PrimaryImage(MissingPerson person)
        => person.Images.FirstOrDefault(i => i.IsPrimary) ?? person.Images.OrderBy(i => i.CreatedAt).FirstOrDefault();
}

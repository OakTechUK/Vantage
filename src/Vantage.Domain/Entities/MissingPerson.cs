using Vantage.Domain.Common;
using Vantage.Domain.Enums;

namespace Vantage.Domain.Entities;

/// <summary>
/// The enduring person record. A person may have many missing episodes over time;
/// repeat missing persons are therefore linked automatically without re-keying.
/// </summary>
public class MissingPerson : TenantEntity
{
    public string FirstName { get; set; } = string.Empty;
    public string? MiddleNames { get; set; }
    public string LastName { get; set; } = string.Empty;

    public DateOnly? DateOfBirth { get; set; }
    public Sex Sex { get; set; } = Sex.Unknown;
    public string? Ethnicity { get; set; }
    public string? Nationality { get; set; }
    public string? Languages { get; set; }

    public int? HeightCm { get; set; }
    public string? Build { get; set; }
    public string? HairColour { get; set; }
    public string? EyeColour { get; set; }
    public string? DistinguishingFeatures { get; set; }
    public string? Description { get; set; }

    // Vulnerability and intelligence flags used to build the individual intelligence report.
    public bool IsLookedAfterChild { get; set; }
    public bool HasLearningDifficulty { get; set; }
    public bool HasMentalHealthConcerns { get; set; }
    public bool IsKnownSubstanceUser { get; set; }
    public bool IsAtRiskOfExploitation { get; set; }
    public string? VulnerabilitySummary { get; set; }

    /// <summary>True once the person has more than one recorded missing episode.</summary>
    public bool IsRepeatMissing { get; set; }

    public Guid CreatedByOfficerId { get; set; }

    public ICollection<MissingPersonEpisode> Episodes { get; set; } = new List<MissingPersonEpisode>();
    public ICollection<PersonAssociate> Associates { get; set; } = new List<PersonAssociate>();
    public ICollection<PlaceOfInterest> PlacesOfInterest { get; set; } = new List<PlaceOfInterest>();
    public ICollection<PersonNote> Notes { get; set; } = new List<PersonNote>();
    public ICollection<PersonImage> Images { get; set; } = new List<PersonImage>();

    public int? AgeOn(DateTimeOffset at)
    {
        if (DateOfBirth is null) return null;
        var dob = DateOfBirth.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var age = at.Year - dob.Year;
        if (at.DateTime < dob.AddYears(age)) age--;
        return age;
    }

    public string FullName => string.Join(' ', new[] { FirstName, MiddleNames, LastName }
        .Where(part => !string.IsNullOrWhiteSpace(part)));
}

public class PersonAssociate : TenantEntity
{
    public Guid MissingPersonId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Relationship { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }

    /// <summary>Marks people of specific interest or concern, e.g. suspected exploitation.</summary>
    public bool IsSignificantRisk { get; set; }
    public Guid CreatedByOfficerId { get; set; }
}

public class PlaceOfInterest : TenantEntity
{
    public Guid MissingPersonId { get; set; }
    public string Label { get; set; } = string.Empty;
    public PlaceCategory Category { get; set; } = PlaceCategory.Other;
    public string? Address { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public SearchPriority SearchPriority { get; set; } = SearchPriority.Normal;
    public string? Notes { get; set; }
    public Guid CreatedByOfficerId { get; set; }
}

public class PersonNote : TenantEntity
{
    public Guid MissingPersonId { get; set; }
    public Guid? EpisodeId { get; set; }
    public NoteCategory Category { get; set; } = NoteCategory.General;
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public bool IsSensitive { get; set; }
    public Guid CreatedByOfficerId { get; set; }
}

public class PersonImage : TenantEntity
{
    public Guid MissingPersonId { get; set; }
    public Guid? EpisodeId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public string StorageKey { get; set; } = string.Empty;
    public string? Caption { get; set; }
    public bool IsPrimary { get; set; }
    public Guid UploadedByOfficerId { get; set; }
}

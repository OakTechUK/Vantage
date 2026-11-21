using Vantage.Domain.Enums;

namespace Vantage.Application.Dtos;

public sealed record PersonSummaryDto(
    Guid Id,
    string FullName,
    DateOnly? DateOfBirth,
    int? Age,
    Sex Sex,
    bool IsRepeatMissing,
    int EpisodeCount,
    EpisodeStatus? LatestStatus,
    RiskLevel? LatestRisk,
    DateTimeOffset? LatestReportedAt,
    Guid? PrimaryImageId);

public sealed record VulnerabilityDto(
    bool IsLookedAfterChild,
    bool HasLearningDifficulty,
    bool HasMentalHealthConcerns,
    bool IsKnownSubstanceUser,
    bool IsAtRiskOfExploitation,
    string? Summary);

public sealed record AssociateDto(
    Guid Id,
    string Name,
    string? Relationship,
    string? Phone,
    string? Email,
    string? Address,
    string? Notes,
    bool IsSignificantRisk,
    DateTimeOffset CreatedAt);

public sealed record PlaceDto(
    Guid Id,
    string Label,
    PlaceCategory Category,
    string? Address,
    double? Latitude,
    double? Longitude,
    SearchPriority SearchPriority,
    string? Notes,
    DateTimeOffset CreatedAt);

public sealed record NoteDto(
    Guid Id,
    Guid? EpisodeId,
    NoteCategory Category,
    string Title,
    string Body,
    bool IsSensitive,
    Guid CreatedByOfficerId,
    DateTimeOffset CreatedAt);

public sealed record ImageDto(
    Guid Id,
    Guid? EpisodeId,
    string FileName,
    string ContentType,
    long SizeBytes,
    string? Caption,
    bool IsPrimary,
    DateTimeOffset CreatedAt);

public sealed record PersonDetailDto(
    Guid Id,
    string FirstName,
    string? MiddleNames,
    string LastName,
    string FullName,
    DateOnly? DateOfBirth,
    int? Age,
    Sex Sex,
    string? Ethnicity,
    string? Nationality,
    string? Languages,
    int? HeightCm,
    string? Build,
    string? HairColour,
    string? EyeColour,
    string? DistinguishingFeatures,
    string? Description,
    bool IsRepeatMissing,
    VulnerabilityDto Vulnerabilities,
    DateTimeOffset CreatedAt,
    IReadOnlyList<AssociateDto> Associates,
    IReadOnlyList<PlaceDto> PlacesOfInterest,
    IReadOnlyList<NoteDto> Notes,
    IReadOnlyList<ImageDto> Images,
    IReadOnlyList<CaseSummaryDto> Episodes);

public sealed record IntelligenceReportDto(
    PersonDetailDto Person,
    IReadOnlyList<string> RiskFactors,
    IReadOnlyList<PlaceDto> KeyLocations,
    IReadOnlyList<AssociateDto> KeyPeople,
    IReadOnlyList<NoteDto> Intelligence,
    IReadOnlyList<CaseSummaryDto> Episodes,
    IReadOnlyList<string> SearchConsiderations,
    DateTimeOffset GeneratedAt);

public sealed record CreatePersonRequest(
    string FirstName,
    string? MiddleNames,
    string LastName,
    DateOnly? DateOfBirth,
    Sex Sex,
    string? Ethnicity,
    string? Nationality,
    string? Languages,
    int? HeightCm,
    string? Build,
    string? HairColour,
    string? EyeColour,
    string? DistinguishingFeatures,
    string? Description,
    bool IsLookedAfterChild,
    bool HasLearningDifficulty,
    bool HasMentalHealthConcerns,
    bool IsKnownSubstanceUser,
    bool IsAtRiskOfExploitation,
    string? VulnerabilitySummary);

public sealed record UpdatePersonRequest(
    string FirstName,
    string? MiddleNames,
    string LastName,
    DateOnly? DateOfBirth,
    Sex Sex,
    string? Ethnicity,
    string? Nationality,
    string? Languages,
    int? HeightCm,
    string? Build,
    string? HairColour,
    string? EyeColour,
    string? DistinguishingFeatures,
    string? Description,
    bool IsLookedAfterChild,
    bool HasLearningDifficulty,
    bool HasMentalHealthConcerns,
    bool IsKnownSubstanceUser,
    bool IsAtRiskOfExploitation,
    string? VulnerabilitySummary);

public sealed record AddAssociateRequest(
    string Name,
    string? Relationship,
    string? Phone,
    string? Email,
    string? Address,
    string? Notes,
    bool IsSignificantRisk);

public sealed record AddPlaceRequest(
    string Label,
    PlaceCategory Category,
    string? Address,
    double? Latitude,
    double? Longitude,
    SearchPriority SearchPriority,
    string? Notes);

public sealed record AddNoteRequest(
    Guid? EpisodeId,
    NoteCategory Category,
    string Title,
    string Body,
    bool IsSensitive);

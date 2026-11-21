using Vantage.Application.Common;
using Vantage.Application.Dtos;
using Vantage.Domain.Entities;

namespace Vantage.Application.Services;

public static class PersonFactory
{
    public static MissingPerson Create(CreatePersonRequest request, Guid tenantId, Guid officerId, DateTimeOffset now)
    {
        Validate(request.FirstName, request.LastName, request.DateOfBirth, request.HeightCm, request.Description, request.VulnerabilitySummary);
        var person = new MissingPerson
        {
            TenantId = tenantId,
            CreatedByOfficerId = officerId,
            CreatedAt = now
        };
        Apply(person, request.FirstName, request.MiddleNames, request.LastName, request.DateOfBirth, request.Sex,
            request.Ethnicity, request.Nationality, request.Languages, request.HeightCm, request.Build,
            request.HairColour, request.EyeColour, request.DistinguishingFeatures, request.Description,
            request.IsLookedAfterChild, request.HasLearningDifficulty, request.HasMentalHealthConcerns,
            request.IsKnownSubstanceUser, request.IsAtRiskOfExploitation, request.VulnerabilitySummary, now);
        return person;
    }

    public static void Apply(MissingPerson person, UpdatePersonRequest request, DateTimeOffset now)
    {
        Validate(request.FirstName, request.LastName, request.DateOfBirth, request.HeightCm, request.Description, request.VulnerabilitySummary);
        Apply(person, request.FirstName, request.MiddleNames, request.LastName, request.DateOfBirth, request.Sex,
            request.Ethnicity, request.Nationality, request.Languages, request.HeightCm, request.Build,
            request.HairColour, request.EyeColour, request.DistinguishingFeatures, request.Description,
            request.IsLookedAfterChild, request.HasLearningDifficulty, request.HasMentalHealthConcerns,
            request.IsKnownSubstanceUser, request.IsAtRiskOfExploitation, request.VulnerabilitySummary, now);
    }

    private static void Apply(
        MissingPerson person, string firstName, string? middleNames, string lastName, DateOnly? dateOfBirth,
        Domain.Enums.Sex sex, string? ethnicity, string? nationality, string? languages, int? heightCm,
        string? build, string? hairColour, string? eyeColour, string? distinguishingFeatures, string? description,
        bool lookedAfter, bool learningDifficulty, bool mentalHealth, bool substanceUser, bool exploitation,
        string? vulnerabilitySummary, DateTimeOffset now)
    {
        person.FirstName = firstName.Trim();
        person.MiddleNames = Clean(middleNames);
        person.LastName = lastName.Trim();
        person.DateOfBirth = dateOfBirth;
        person.Sex = sex;
        person.Ethnicity = Clean(ethnicity);
        person.Nationality = Clean(nationality);
        person.Languages = Clean(languages);
        person.HeightCm = heightCm;
        person.Build = Clean(build);
        person.HairColour = Clean(hairColour);
        person.EyeColour = Clean(eyeColour);
        person.DistinguishingFeatures = Clean(distinguishingFeatures);
        person.Description = Clean(description);
        person.IsLookedAfterChild = lookedAfter;
        person.HasLearningDifficulty = learningDifficulty;
        person.HasMentalHealthConcerns = mentalHealth;
        person.IsKnownSubstanceUser = substanceUser;
        person.IsAtRiskOfExploitation = exploitation;
        person.VulnerabilitySummary = Clean(vulnerabilitySummary);
        person.UpdatedAt = now;
    }

    private static void Validate(string? firstName, string? lastName, DateOnly? dateOfBirth, int? heightCm, string? description, string? vulnerabilitySummary)
    {
        if (string.IsNullOrWhiteSpace(firstName) || firstName.Trim().Length > 100)
            throw new ValidationFailureException("First name is required and must be 100 characters or fewer.");
        if (string.IsNullOrWhiteSpace(lastName) || lastName.Trim().Length > 100)
            throw new ValidationFailureException("Last name is required and must be 100 characters or fewer.");
        if (dateOfBirth is { } dob && (dob > DateOnly.FromDateTime(DateTime.UtcNow) || dob < new DateOnly(1900, 1, 1)))
            throw new ValidationFailureException("Date of birth must be between 1900 and today.");
        if (heightCm is { } height && (height < 30 || height > 260))
            throw new ValidationFailureException("Height must be between 30cm and 260cm.");
        if (description?.Length > 4000)
            throw new ValidationFailureException("Description must be 4000 characters or fewer.");
        if (vulnerabilitySummary?.Length > 2000)
            throw new ValidationFailureException("Vulnerability summary must be 2000 characters or fewer.");
    }

    private static string? Clean(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

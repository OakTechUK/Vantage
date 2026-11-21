using Vantage.Application.Abstractions;
using Vantage.Application.Common;
using Vantage.Application.Dtos;
using Vantage.Domain.Entities;
using Vantage.Domain.Enums;

namespace Vantage.Application.Services;

public sealed class PersonService(
    IMissingPersonRepository persons,
    IEpisodeRepository episodes,
    IIfindRepository ifind,
    IFileStorage storage,
    IUnitOfWork unitOfWork,
    ICurrentUser currentUser,
    IClock clock,
    IAuditService audit)
{
    private const long MaxImageBytes = 10 * 1024 * 1024;
    private static readonly HashSet<string> AllowedImageTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/webp"
    };

    public async Task<PagedResult<PersonSummaryDto>> SearchAsync(PersonQuery query, CancellationToken ct = default)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var (items, total) = await persons.SearchAsync(query with { Page = page, PageSize = pageSize }, ct);
        var now = clock.UtcNow;
        return new PagedResult<PersonSummaryDto>(items.Select(p => p.ToSummary(now)).ToList(), total, page, pageSize);
    }

    public async Task<PersonDetailDto> GetAsync(Guid id, CancellationToken ct = default)
    {
        var person = await persons.GetWithGraphAsync(id, ct)
            ?? throw new NotFoundException("Person not found.");
        return person.ToDetail(clock.UtcNow);
    }

    public async Task<PersonDetailDto> CreateAsync(CreatePersonRequest request, CancellationToken ct = default)
    {
        var tenantId = RequireTenant();
        var officerId = RequireOfficer();
        var now = clock.UtcNow;
        var person = PersonFactory.Create(request, tenantId, officerId, now);
        await persons.AddAsync(person, ct);
        await unitOfWork.SaveChangesAsync(ct);
        await audit.RecordAsync("person.created", nameof(MissingPerson), person.Id, new { person.FullName }, ct);
        return await GetAsync(person.Id, ct);
    }

    public async Task<PersonDetailDto> UpdateAsync(Guid id, UpdatePersonRequest request, CancellationToken ct = default)
    {
        var person = await persons.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Person not found.");
        PersonFactory.Apply(person, request, clock.UtcNow);
        await unitOfWork.SaveChangesAsync(ct);
        await audit.RecordAsync("person.updated", nameof(MissingPerson), person.Id, new { person.FullName }, ct);
        return await GetAsync(id, ct);
    }

    public async Task<AssociateDto> AddAssociateAsync(Guid personId, AddAssociateRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Length > 200)
            throw new ValidationFailureException("Associate name is required and must be 200 characters or fewer.");
        await RequirePersonAsync(personId, ct);

        var associate = new PersonAssociate
        {
            TenantId = RequireTenant(),
            MissingPersonId = personId,
            Name = request.Name.Trim(),
            Relationship = Clean(request.Relationship),
            Phone = Clean(request.Phone),
            Email = Clean(request.Email),
            Address = Clean(request.Address),
            Notes = Clean(request.Notes),
            IsSignificantRisk = request.IsSignificantRisk,
            CreatedByOfficerId = RequireOfficer()
        };
        await persons.AddAssociateAsync(associate, ct);
        await unitOfWork.SaveChangesAsync(ct);
        await audit.RecordAsync("person.associate.added", nameof(PersonAssociate), associate.Id, new { associate.Name }, ct);
        return associate.ToDto();
    }

    public async Task<PlaceDto> AddPlaceAsync(Guid personId, AddPlaceRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Label) || request.Label.Length > 200)
            throw new ValidationFailureException("Place label is required and must be 200 characters or fewer.");
        if (request.Latitude is < -90 or > 90 || request.Longitude is < -180 or > 180)
            throw new ValidationFailureException("Latitude/longitude are out of range.");

        await RequirePersonAsync(personId, ct);
        var place = new PlaceOfInterest
        {
            TenantId = RequireTenant(),
            MissingPersonId = personId,
            Label = request.Label.Trim(),
            Category = request.Category,
            Address = Clean(request.Address),
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            SearchPriority = request.SearchPriority,
            Notes = Clean(request.Notes),
            CreatedByOfficerId = RequireOfficer()
        };
        await persons.AddPlaceAsync(place, ct);
        await unitOfWork.SaveChangesAsync(ct);
        await audit.RecordAsync("person.place.added", nameof(PlaceOfInterest), place.Id, new { place.Label }, ct);
        return place.ToDto();
    }

    public async Task<NoteDto> AddNoteAsync(Guid personId, AddNoteRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Length > 200)
            throw new ValidationFailureException("Note title is required and must be 200 characters or fewer.");
        if (string.IsNullOrWhiteSpace(request.Body) || request.Body.Length > 10000)
            throw new ValidationFailureException("Note body is required and must be 10,000 characters or fewer.");

        var person = await persons.GetByIdAsync(personId, ct) ?? throw new NotFoundException("Person not found.");
        if (request.EpisodeId is { } episodeId)
        {
            var episode = await episodes.GetByIdAsync(episodeId, ct) ?? throw new NotFoundException("Enquiry not found.");
            if (episode.MissingPersonId != person.Id)
                throw new ValidationFailureException("The enquiry does not belong to this person.");
        }

        var note = new PersonNote
        {
            TenantId = RequireTenant(),
            MissingPersonId = personId,
            EpisodeId = request.EpisodeId,
            Category = request.Category,
            Title = request.Title.Trim(),
            Body = request.Body.Trim(),
            IsSensitive = request.IsSensitive,
            CreatedByOfficerId = RequireOfficer()
        };
        await persons.AddNoteAsync(note, ct);
        await unitOfWork.SaveChangesAsync(ct);
        await audit.RecordAsync("person.note.added", nameof(PersonNote), note.Id, new { note.Title, note.Category }, ct);
        return note.ToDto();
    }

    public async Task<ImageDto> AddImageAsync(
        Guid personId,
        Guid? episodeId,
        string fileName,
        string contentType,
        long length,
        Stream content,
        string? caption,
        bool isPrimary,
        CancellationToken ct = default)
    {
        if (length <= 0 || length > MaxImageBytes)
            throw new ValidationFailureException("Images must be between 1 byte and 10MB.");
        if (!AllowedImageTypes.Contains(contentType))
            throw new ValidationFailureException("Only JPEG, PNG and WebP images are supported.");
        if (string.IsNullOrWhiteSpace(fileName))
            throw new ValidationFailureException("A file name is required.");

        var person = await persons.GetWithGraphAsync(personId, ct) ?? throw new NotFoundException("Person not found.");
        if (episodeId is { } eid && person.Episodes.All(e => e.Id != eid))
            throw new ValidationFailureException("The enquiry does not belong to this person.");

        var storageKey = await storage.SaveAsync(content, fileName, contentType, ct);
        if (isPrimary || person.Images.Count == 0)
        {
            foreach (var existing in person.Images) existing.IsPrimary = false;
            isPrimary = true;
        }

        var image = new PersonImage
        {
            TenantId = RequireTenant(),
            MissingPersonId = personId,
            EpisodeId = episodeId,
            FileName = Path.GetFileName(fileName),
            ContentType = contentType,
            SizeBytes = length,
            StorageKey = storageKey,
            Caption = Clean(caption),
            IsPrimary = isPrimary,
            UploadedByOfficerId = RequireOfficer()
        };
        await persons.AddImageAsync(image, ct);
        await unitOfWork.SaveChangesAsync(ct);
        await audit.RecordAsync("person.image.added", nameof(PersonImage), image.Id, new { image.FileName }, ct);
        return image.ToDto();
    }

    public async Task<(ImageDto Image, Stream Content)> OpenImageAsync(Guid personId, Guid imageId, CancellationToken ct = default)
    {
        var person = await persons.GetWithGraphAsync(personId, ct) ?? throw new NotFoundException("Person not found.");
        var image = person.Images.FirstOrDefault(i => i.Id == imageId) ?? throw new NotFoundException("Image not found.");
        var stream = await storage.OpenReadAsync(image.StorageKey, ct) ?? throw new NotFoundException("Image content not found.");
        return (image.ToDto(), stream);
    }

    public async Task<IntelligenceReportDto> GetIntelligenceReportAsync(Guid personId, CancellationToken ct = default)
    {
        var person = await persons.GetWithGraphAsync(personId, ct) ?? throw new NotFoundException("Person not found.");
        var now = clock.UtcNow;
        var detail = person.ToDetail(now);
        var latestRisk = person.Episodes.OrderByDescending(e => e.ReportedAt).Select(e => (RiskLevel?)e.RiskLevel).FirstOrDefault() ?? RiskLevel.Low;

        var riskFactors = new List<string>();
        if (person.AgeOn(now) is < 18) riskFactors.Add("Child (under 18)");
        if (person.IsLookedAfterChild) riskFactors.Add("Looked-after child");
        if (person.HasLearningDifficulty) riskFactors.Add("Learning difficulty");
        if (person.HasMentalHealthConcerns) riskFactors.Add("Mental health concerns");
        if (person.IsKnownSubstanceUser) riskFactors.Add("Known substance use");
        if (person.IsAtRiskOfExploitation) riskFactors.Add("At risk of exploitation");
        if (person.IsRepeatMissing) riskFactors.Add("Repeat missing person");
        if (person.Associates.Any(a => a.IsSignificantRisk)) riskFactors.Add("Significant-risk associate on file");

        var catalogue = await ifind.GetCatalogueAsync(person.AgeOn(now) is < 18, latestRisk, null, ct);
        var considerations = catalogue
            .OrderByDescending(i => i.MinimumRisk)
            .Take(12)
            .Select(i => i.Title)
            .ToList();

        return new IntelligenceReportDto(
            detail,
            riskFactors,
            detail.PlacesOfInterest.Where(p => p.SearchPriority != SearchPriority.Low).ToList(),
            detail.Associates.Where(a => a.IsSignificantRisk).ToList(),
            detail.Notes.Where(n => n.Category is NoteCategory.Intelligence or NoteCategory.Risk or NoteCategory.Exploitation).ToList(),
            detail.Episodes,
            considerations,
            now);
    }

    private async Task RequirePersonAsync(Guid id, CancellationToken ct)
    {
        if (await persons.GetByIdAsync(id, ct) is null) throw new NotFoundException("Person not found.");
    }

    private Guid RequireTenant() => currentUser.TenantId ?? throw new ForbiddenException("A tenant context is required.");

    private Guid RequireOfficer() => currentUser.OfficerId ?? throw new ForbiddenException("An authenticated officer is required.");

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

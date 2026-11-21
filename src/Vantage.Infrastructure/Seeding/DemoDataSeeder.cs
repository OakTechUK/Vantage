using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Vantage.Application.Abstractions;
using Vantage.Domain.Entities;
using Vantage.Domain.Enums;
using Vantage.Infrastructure.Persistence;
using Vantage.Infrastructure.Identity;

namespace Vantage.Infrastructure.Seeding;

public sealed class DemoDataSeeder(
    VantageDbContext db,
    UserManager<Officer> users,
    IClock clock,
    ILogger<DemoDataSeeder> logger)
{
    public const string DemoPassword = "Passw0rd!2026";

    public async Task InitializeAsync(CancellationToken ct = default)
    {
        await db.Database.EnsureCreatedAsync(ct);
        await SeedIfindCatalogueAsync(ct);
        if (await db.Tenants.AnyAsync(ct))
        {
            logger.LogInformation("Vantage demo data already present.");
            return;
        }

        var now = clock.UtcNow;
        var year = now.Year;

        var wpc = new Tenant
        {
            Code = "WPC",
            Name = "Westshire Police",
            MpbForceCode = "WPC",
            LocalAuthorityName = "Westshire County Council",
            PrimaryContactEmail = "missing-persons@westshire.police.uk"
        };
        var ncp = new Tenant
        {
            Code = "NCP",
            Name = "North City Police",
            MpbForceCode = "NCP",
            LocalAuthorityName = "North City Council",
            PrimaryContactEmail = "mpu@northcity.police.uk"
        };
        db.Tenants.AddRange(wpc, ncp);
        await db.SaveChangesAsync(ct);

        var ds = await CreateOfficer(wpc, "sarah.collins@wpc.police.uk", "DS Sarah Collins", "Detective Sergeant", "WPC-1042", OfficerRole.Supervisor);
        var pc = await CreateOfficer(wpc, "james.okoro@wpc.police.uk", "PC James Okoro", "Police Constable", "WPC-2210", OfficerRole.Officer);
        var dc = await CreateOfficer(wpc, "priya.nair@wpc.police.uk", "DC Priya Nair", "Detective Constable", "WPC-1877", OfficerRole.Officer);
        var ncpSupervisor = await CreateOfficer(ncp, "alex.morgan@ncp.police.uk", "DI Alex Morgan", "Detective Inspector", "NCP-3001", OfficerRole.Supervisor);

        var catalogue = await db.IfindItems.AsNoTracking().ToDictionaryAsync(i => i.Code, ct);

        // ---- Westshire cases -------------------------------------------------

        var amelia = NewPerson(wpc, "Amelia", "Hayes", AgeDob(now, 14), Sex.Female, ds.Id, now.AddDays(-2), description: "5ft 4in, slim build, shoulder-length brown hair. Last seen in school uniform.");
        amelia.HasMentalHealthConcerns = true;
        amelia.VulnerabilitySummary = "Known to self-harm when anxious. Open to early help services.";
        var ameliaCase = NewEpisode(wpc, amelia, $"{wpc.Code}-{year % 100:00}-0001", now.AddDays(-2).AddHours(-3),
            MissingCategory.Missing, RiskLevel.High, pc.Id, wpc.ReviewHighHours,
            "Amelia did not return home from school. Her phone is switched off and she has not accessed her bank account.",
            "Riverside Retail Park", now.AddDays(-2).AddHours(-6), "Navy school blazer, grey skirt, white trainers");
        ameliaCase.LastReviewedAt = now.AddDays(-1);
        ameliaCase.Reviews.Add(new CaseReview
        {
            TenantId = wpc.Id, ReviewedByOfficerId = ds.Id, ReviewedAt = now.AddDays(-1),
            RiskLevelAtReview = RiskLevel.High, Notes = "CCTV identified Amelia entering the retail park with an older male at 16:10. Enquiries ongoing.",
            NextReviewDueAt = now.AddHours(-2), CreatedAt = now.AddDays(-1)
        });
        ameliaCase.NextReviewDueAt = now.AddHours(-2);
        ameliaCase.Status = EpisodeStatus.Active;
        ameliaCase.Tasks.Add(NewTask(wpc, ameliaCase, pc.Id, "Review CCTV at Riverside Retail Park",
            "Obtain and review all camera coverage between 15:30 and 17:00, including the bus interchange.",
            TaskCategory.Cctv, TaskPriority.Urgent, CaseTaskStatus.Open, ds.Id, now.AddHours(2), "Riverside Retail Park"));
        ameliaCase.Tasks.Add(NewTask(wpc, ameliaCase, pc.Id, "Speak to school safeguarding lead",
            "Establish friendship groups, recent behaviour changes and any concerns raised by staff.",
            TaskCategory.School, TaskPriority.High, CaseTaskStatus.InProgress, pc.Id, now.AddHours(6), "Riverside Academy"));
        ameliaCase.Tasks.Add(NewTask(wpc, ameliaCase, pc.Id, "Check hospital A&E departments",
            "Circulate photograph to Westshire General and St Anne's urgent care.",
            TaskCategory.Hospital, TaskPriority.High, CaseTaskStatus.Completed, pc.Id, now.AddHours(-1), null));
        ameliaCase.Tasks.Last().CompletedAt = now.AddHours(-4);
        ameliaCase.Tasks.Last().CompletedByOfficerId = pc.Id;
        ameliaCase.Tasks.Last().Outcome = "No attendance recorded at either site.";
        ameliaCase.Tasks.Add(NewTask(wpc, ameliaCase, pc.Id, "Review CCTV at Riverside Retail Prk", // deliberate typo duplicate
            "Second angle requested from the car park operator.", TaskCategory.Cctv, TaskPriority.Normal,
            CaseTaskStatus.Open, pc.Id, now.AddHours(8), "Riverside Retail Park"));

        var jayden = new PersonAssociate
        {
            TenantId = wpc.Id, MissingPersonId = amelia.Id, Name = "Jayden Cole", Relationship = "Friend",
            Phone = "07700 900123", Address = "14 Harlow Court, Westshire", IsSignificantRisk = true,
            Notes = "Amelia has previously stayed at this address without telling her family. Jayden is 19.",
            CreatedByOfficerId = pc.Id, CreatedAt = now.AddDays(-1)
        };
        amelia.Associates.Add(jayden);
        amelia.PlacesOfInterest.Add(NewPlace(wpc, amelia, "Riverside Retail Park", PlaceCategory.Social,
            "Riverside Way, Westshire", SearchPriority.High, "Last confirmed sighting. CCTV to be secured.", pc.Id, now.AddDays(-2)));
        amelia.PlacesOfInterest.Add(NewPlace(wpc, amelia, "Harlow Court", PlaceCategory.Friend,
            "Harlow Estate, Westshire", SearchPriority.High, "Home address of Jayden Cole.", pc.Id, now.AddDays(-1)));
        amelia.Notes.Add(NewNote(wpc, amelia, ameliaCase.Id, NoteCategory.Health, "Mental health background",
            "Amelia has been open to CAMHS since age 12. Recent school report notes increased anxiety and two episodes of self-harm in the last term.",
            pc.Id, now.AddDays(-1), sensitive: true));
        amelia.Notes.Add(NewNote(wpc, amelia, ameliaCase.Id, NoteCategory.Intelligence, "Previous stay at Harlow Court",
            "In March Amelia stayed overnight at Jayden Cole's address. She disclosed this to a friend but not to her parents.",
            pc.Id, now.AddDays(-1), sensitive: false));
        AddIfind(ameliaCase, catalogue, "HEALTH-AE", now.AddDays(-1), IfindStatus.Done, "No attendance at either hospital.");
        AddIfind(ameliaCase, catalogue, "CCTV-LOCAL", now.AddDays(-1), IfindStatus.InProgress, "Retail park footage secured; bus interchange outstanding.");
        AddIfind(ameliaCase, catalogue, "ASSOC-KNOWN", now.AddDays(-1), IfindStatus.NotStarted, null);
        AddIfind(ameliaCase, catalogue, "DIGITAL-SOCIAL", now.AddDays(-1), IfindStatus.NotStarted, null);

        var tommy = NewPerson(wpc, "Tommy", "Reed", AgeDob(now, 9), Sex.Male, ds.Id, now.AddMonths(-8), description: "4ft 6in, short blond hair. Often wears a red hooded top.");
        tommy.IsLookedAfterChild = true;
        tommy.HasLearningDifficulty = true;
        tommy.IsAtRiskOfExploitation = true;
        tommy.IsRepeatMissing = true;
        tommy.VulnerabilitySummary = "Looked-after child in a residential placement. Two previous missing episodes linked to an adult male.";
        var tommyCase = NewEpisode(wpc, tommy, $"{wpc.Code}-{year % 100:00}-0002", now.AddHours(-7),
            MissingCategory.Missing, RiskLevel.Critical, ds.Id, wpc.ReviewCriticalHours,
            "Tommy left his residential placement at approximately 18:00 and was seen getting into a dark-coloured car. He has previously been linked to an adult male who is subject to a warning notice.",
            "Harlow Estate", now.AddHours(-8), "Red hooded top, black tracksuit bottoms");
        tommyCase.IsRepeatAtReport = true;
        tommyCase.Status = EpisodeStatus.Active;
        tommyCase.LastReviewedAt = now.AddHours(-3);
        tommyCase.NextReviewDueAt = now.AddHours(1);
        tommyCase.Reviews.Add(new CaseReview
        {
            TenantId = wpc.Id, ReviewedByOfficerId = ds.Id, ReviewedAt = now.AddHours(-3),
            RiskLevelAtReview = RiskLevel.Critical, Notes = "ANPR suggests the vehicle travelled towards the canal. Fire service assisting with water search.",
            NextReviewDueAt = now.AddHours(1), CreatedAt = now.AddHours(-3)
        });
        var ryan = new PersonAssociate
        {
            TenantId = wpc.Id, MissingPersonId = tommy.Id, Name = "Ryan Vickers", Relationship = "Known adult",
            Phone = "07700 900555", Address = "Flat 2, 9 Canal Street", IsSignificantRisk = true,
            Notes = "Subject of an active child abduction warning notice. Tommy has been found at this address twice.",
            CreatedByOfficerId = ds.Id, CreatedAt = now.AddMonths(-8)
        };
        tommy.Associates.Add(ryan);
        tommy.PlacesOfInterest.Add(NewPlace(wpc, tommy, "Canal towpath", PlaceCategory.Other,
            "Canal Street to Mill Lane", SearchPriority.High, "Previous sightings and ANPR direction of travel.", ds.Id, now.AddHours(-1)));
        tommy.PlacesOfInterest.Add(NewPlace(wpc, tommy, "Harlow Estate", PlaceCategory.Home,
            "Harlow Estate, Westshire", SearchPriority.High, "Residential placement and known peer group.", ds.Id, now.AddHours(-2)));
        tommy.Notes.Add(NewNote(wpc, tommy, tommyCase.Id, NoteCategory.Exploitation, "County lines indicator",
            "Tommy has been found in possession of burner phones twice this year and has spoken about 'working for Ryan'.",
            ds.Id, now.AddMonths(-2), sensitive: true));
        tommyCase.Tasks.Add(NewTask(wpc, tommyCase, ds.Id, "House-to-house enquiries on Harlow Estate",
            "Cover the placement and surrounding 80 addresses. Prioritise any doorbell or vehicle footage.",
            TaskCategory.HouseToHouse, TaskPriority.Urgent, CaseTaskStatus.InProgress, pc.Id, now.AddHours(1), "Harlow Estate"));
        tommyCase.Tasks.Add(NewTask(wpc, tommyCase, ds.Id, "Review social services records",
            "Identify previous associates and placement breakdowns; liaise with allocated social worker.",
            TaskCategory.Enquiry, TaskPriority.High, CaseTaskStatus.Open, dc.Id, now.AddHours(3), null));
        tommyCase.Tasks.Add(NewTask(wpc, tommyCase, ds.Id, "Water search - canal towpath",
            "Fire and rescue service to search identified points along the canal.",
            TaskCategory.Enquiry, TaskPriority.Urgent, CaseTaskStatus.Open, ds.Id, now.AddHours(2), "Canal towpath"));
        AddIfind(tommyCase, catalogue, "WATER-CANAL", now.AddHours(-2), IfindStatus.InProgress, "Fire service attending at 07:30.");
        AddIfind(tommyCase, catalogue, "EXPLOIT-CSE", now.AddHours(-2), IfindStatus.InProgress, "Intelligence links to Ryan Vickers are being developed.");
        AddIfind(tommyCase, catalogue, "NIGHT-TIME", now.AddHours(-2), IfindStatus.NotStarted, null);

        var olderTommy1 = NewEpisode(wpc, tommy, $"{wpc.Code}-{year % 100:00}-0003", now.AddMonths(-3),
            MissingCategory.Missing, RiskLevel.High, ds.Id, wpc.ReviewHighHours,
            "Failed to return to placement after school.", "Harlow Estate", now.AddMonths(-3), null);
        olderTommy1.Status = EpisodeStatus.Closed;
        olderTommy1.Outcome = OutcomeType.LocatedSafe;
        olderTommy1.LocatedAt = now.AddMonths(-3).AddDays(1);
        olderTommy1.LocatedLocation = "Canal Street";
        olderTommy1.ClosedAt = now.AddMonths(-3).AddDays(1);
        olderTommy1.ClosureNotes = "Found safe and well at an address in Canal Street. Safeguarding referral completed.";

        var olderTommy2 = NewEpisode(wpc, tommy, $"{wpc.Code}-{year % 100:00}-0004", now.AddMonths(-7),
            MissingCategory.Missing, RiskLevel.High, ds.Id, wpc.ReviewHighHours,
            "Left placement without permission overnight.", "Harlow Estate", now.AddMonths(-7), null);
        olderTommy2.Status = EpisodeStatus.Closed;
        olderTommy2.Outcome = OutcomeType.ReturnedVoluntarily;
        olderTommy2.LocatedAt = now.AddMonths(-7).AddHours(9);
        olderTommy2.LocatedLocation = "Westshire town centre";
        olderTommy2.ClosedAt = now.AddMonths(-7).AddHours(10);

        var sarah = NewPerson(wpc, "Sarah", "Whitmore", AgeDob(now, 34), Sex.Female, dc.Id, now.AddMonths(-4), description: "5ft 7in, long auburn hair, tattoo of a swallow on right forearm.");
        sarah.IsRepeatMissing = true;
        var sarahCase = NewEpisode(wpc, sarah, $"{wpc.Code}-{year % 100:00}-0005", now.AddDays(-3),
            MissingCategory.Missing, RiskLevel.Medium, dc.Id, wpc.ReviewMediumHours,
            "Sarah left her home address following an argument with her partner. She has not used her phone since and missed a shift at work.",
            "Northgate Station", now.AddDays(-3).AddHours(-4), "Black coat, blue jeans");
        sarahCase.Status = EpisodeStatus.Active;
        sarahCase.NextReviewDueAt = now.AddHours(3);
        sarahCase.Tasks.Add(NewTask(wpc, sarahCase, dc.Id, "Obtain CCTV from Northgate Station",
            "Cover platforms and taxi rank from 14:00 onwards.", TaskCategory.Cctv, TaskPriority.High,
            CaseTaskStatus.Open, pc.Id, now.AddHours(4), "Northgate Station"));
        sarahCase.Tasks.Add(NewTask(wpc, sarahCase, dc.Id, "Speak to partner and workplace",
            "Establish recent relationship difficulties and any planned destinations.", TaskCategory.Enquiry,
            TaskPriority.Normal, CaseTaskStatus.Completed, dc.Id, now.AddDays(-1), null));
        sarahCase.Tasks.Last().CompletedAt = now.AddDays(-1);
        sarahCase.Tasks.Last().CompletedByOfficerId = dc.Id;
        sarah.PlacesOfInterest.Add(NewPlace(wpc, sarah, "Northgate Station", PlaceCategory.Transport,
            "Northgate, Westshire", SearchPriority.High, "Last known location; taxi rank and rail enquiries.", dc.Id, now.AddDays(-3)));
        sarah.Notes.Add(NewNote(wpc, sarah, sarahCase.Id, NoteCategory.Background, "Relationship breakdown",
            "Sarah disclosed to a colleague that she was considering staying with her sister in Leeds. Sister has been contacted and has not heard from her.",
            dc.Id, now.AddDays(-2), sensitive: false));
        var sarahOlder = NewEpisode(wpc, sarah, $"{wpc.Code}-{year % 100:00}-0006", now.AddMonths(-4),
            MissingCategory.Absent, RiskLevel.Low, dc.Id, wpc.ReviewLowHours,
            "Stayed out overnight after an argument.", "Westshire town centre", now.AddMonths(-4), null);
        sarahOlder.Status = EpisodeStatus.Closed;
        sarahOlder.Outcome = OutcomeType.ReturnedVoluntarily;
        sarahOlder.LocatedAt = now.AddMonths(-4).AddHours(12);
        sarahOlder.ClosedAt = now.AddMonths(-4).AddHours(14);

        var daniel = NewPerson(wpc, "Daniel", "Okafor", AgeDob(now, 27), Sex.Male, pc.Id, now.AddDays(-10), description: "6ft 2in, black hair, beard.");
        var danielCase = NewEpisode(wpc, daniel, $"{wpc.Code}-{year % 100:00}-0007", now.AddDays(-10),
            MissingCategory.Absent, RiskLevel.Low, pc.Id, wpc.ReviewLowHours,
            "Daniel did not return home after a night out. Family describe this as out of character but no immediate concerns.",
            "Westshire town centre", now.AddDays(-10).AddHours(-8), "Grey shirt, dark trousers");
        danielCase.Status = EpisodeStatus.Active;
        danielCase.NextReviewDueAt = now.AddDays(3);

        var maya = NewPerson(wpc, "Maya", "Patel", AgeDob(now, 16), Sex.Female, dc.Id, now.AddDays(-7), description: "5ft 2in, black hair in a ponytail.");
        var mayaCase = NewEpisode(wpc, maya, $"{wpc.Code}-{year % 100:00}-0008", now.AddDays(-6),
            MissingCategory.Missing, RiskLevel.Medium, dc.Id, wpc.ReviewMediumHours,
            "Maya did not return from a friend's house.", "Mill Lane", now.AddDays(-6).AddHours(-5), "White hoodie, black leggings");
        mayaCase.IsChildAtReport = true;
        mayaCase.Status = EpisodeStatus.Closed;
        mayaCase.Outcome = OutcomeType.LocatedSafe;
        mayaCase.LocatedAt = now.AddDays(-5);
        mayaCase.LocatedLocation = "Friend's address in Mill Lane";
        mayaCase.ClosedAt = now.AddDays(-5);
        mayaCase.ClosureNotes = "Located safe and well. No safeguarding concerns identified.";

        var leo = NewPerson(wpc, "Leo", "Marsh", AgeDob(now, 12), Sex.Male, pc.Id, now.AddDays(-1), description: "4ft 9in, curly brown hair, glasses.");
        leo.HasLearningDifficulty = true;
        var leoCase = NewEpisode(wpc, leo, $"{wpc.Code}-{year % 100:00}-0009", now.AddDays(-1),
            MissingCategory.Missing, RiskLevel.High, pc.Id, wpc.ReviewHighHours,
            "Leo did not arrive home from a friend's house. He has limited road safety awareness and usually returns before dark.",
            "Canal towpath", now.AddDays(-1).AddHours(-3), "Green jacket, grey joggers");
        leoCase.IsChildAtReport = true;
        leoCase.Status = EpisodeStatus.Active;
        leoCase.NextReviewDueAt = now.AddHours(10);
        leoCase.Tasks.Add(NewTask(wpc, leoCase, pc.Id, "Search canal towpath and surrounding open space",
            "Low-risk search of the towpath, lock gates and recreation ground.", TaskCategory.Enquiry,
            TaskPriority.Urgent, CaseTaskStatus.InProgress, dc.Id, now.AddHours(1), "Canal towpath"));
        leo.PlacesOfInterest.Add(NewPlace(wpc, leo, "Canal towpath", PlaceCategory.Other,
            "Canal Street to Mill Lane", SearchPriority.High, "Favourite fishing spot; last seen walking this way.", pc.Id, now.AddDays(-1)));

        var cawn = new ChildAbductionWarningNotice
        {
            TenantId = wpc.Id,
            Reference = $"CAWN-{year}-A41F2C",
            ChildPersonId = tommy.Id,
            SubjectAssociateId = ryan.Id,
            SubjectName = "Ryan Vickers",
            SubjectDateOfBirth = AgeDob(now, 31),
            IssuedAt = now.AddMonths(-5),
            ExpiresAt = now.AddMonths(7),
            Status = CawnStatus.Active,
            Reason = "Repeated associations with a looked-after child and intelligence indicating grooming behaviour.",
            IssuedByOfficerId = ds.Id,
            CreatedAt = now.AddMonths(-5)
        };

        db.MissingPersons.AddRange(amelia, tommy, sarah, daniel, maya, leo);
        db.CaseNumberCounters.Add(new CaseNumberCounter { TenantId = wpc.Id, Year = year, LastNumber = 9, CreatedAt = now });
        db.CawnNotices.Add(cawn);

        // ---- North City cases (tenant isolation demo) -----------------------

        var grace = NewPerson(ncp, "Grace", "Turner", AgeDob(now, 29), Sex.Female, ncpSupervisor.Id, now.AddDays(-2), description: "5ft 5in, blonde hair.");
        var graceCase = NewEpisode(ncp, grace, $"{ncp.Code}-{year % 100:00}-0001", now.AddDays(-2),
            MissingCategory.Missing, RiskLevel.Medium, ncpSupervisor.Id, ncp.ReviewMediumHours,
            "Grace failed to attend work and her family have been unable to contact her.", "Northgate Station", now.AddDays(-2).AddHours(-2), null);
        graceCase.Status = EpisodeStatus.Active;
        graceCase.NextReviewDueAt = now.AddHours(4);

        var isaac = NewPerson(ncp, "Isaac", "Byrne", AgeDob(now, 17), Sex.Male, ncpSupervisor.Id, now.AddDays(-1), description: "5ft 8in, dark hair.");
        var isaacCase = NewEpisode(ncp, isaac, $"{ncp.Code}-{year % 100:00}-0002", now.AddDays(-1),
            MissingCategory.Missing, RiskLevel.High, ncpSupervisor.Id, ncp.ReviewHighHours,
            "Isaac did not return to his foster placement. Known to travel to the coast.", "North City bus station", now.AddDays(-1).AddHours(-1), "Black puffer jacket");
        isaacCase.IsChildAtReport = true;
        isaacCase.Status = EpisodeStatus.Active;
        isaacCase.NextReviewDueAt = now.AddHours(2);
        isaacCase.Tasks.Add(NewTask(ncp, isaacCase, ncpSupervisor.Id, "Check bus station and ticket records",
            "Establish whether Isaac purchased a ticket towards the coast.", TaskCategory.Transport,
            TaskPriority.High, CaseTaskStatus.Open, ncpSupervisor.Id, now.AddHours(2), "North City bus station"));

        db.MissingPersons.AddRange(grace, isaac);
        db.CaseNumberCounters.Add(new CaseNumberCounter { TenantId = ncp.Id, Year = year, LastNumber = 2, CreatedAt = now });

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Seeded Vantage demo data for {TenantCount} tenants.", 2);
    }

    private async Task<Officer> CreateOfficer(
        Tenant tenant, string email, string displayName, string rank, string collarNumber, OfficerRole role)
    {
        var officer = new Officer
        {
            TenantId = tenant.Id,
            Email = email,
            UserName = $"{tenant.Code}-{email}",
            DisplayName = displayName,
            Rank = rank,
            CollarNumber = collarNumber,
            Role = role,
            EmailConfirmed = true,
            IsActive = true
        };
        var result = await users.CreateAsync(officer, DemoPassword);
        if (!result.Succeeded)
            throw new InvalidOperationException($"Could not seed officer {email}: {string.Join("; ", result.Errors.Select(e => e.Description))}");
        return officer;
    }

    private static MissingPerson NewPerson(
        Tenant tenant, string first, string last, DateOnly dob, Sex sex, Guid createdBy,
        DateTimeOffset createdAt, string? description = null)
        => new()
        {
            TenantId = tenant.Id,
            FirstName = first,
            LastName = last,
            DateOfBirth = dob,
            Sex = sex,
            Description = description,
            CreatedByOfficerId = createdBy,
            CreatedAt = createdAt
        };

    private static MissingPersonEpisode NewEpisode(
        Tenant tenant, MissingPerson person, string caseNumber, DateTimeOffset reportedAt,
        MissingCategory category, RiskLevel risk, Guid officerId, int reviewHours,
        string circumstances, string? lastSeenLocation, DateTimeOffset? lastSeenAt, string? wearing)
    {
        var episode = new MissingPersonEpisode
        {
            TenantId = tenant.Id,
            CaseNumber = caseNumber,
            MissingPersonId = person.Id,
            Status = EpisodeStatus.Active,
            Category = category,
            RiskLevel = risk,
            ReportedAt = reportedAt,
            ReportedByOfficerId = officerId,
            Circumstances = circumstances,
            LastSeenLocation = lastSeenLocation,
            LastSeenAt = lastSeenAt,
            LastSeenWearing = wearing,
            IsChildAtReport = person.AgeOn(reportedAt) is < 18,
            IsRepeatAtReport = person.Episodes.Count > 0,
            NextReviewDueAt = reportedAt.AddHours(reviewHours),
            CreatedAt = reportedAt
        };
        person.Episodes.Add(episode);
        if (person.Episodes.Count > 1) person.IsRepeatMissing = true;
        return episode;
    }

    private static CaseTask NewTask(
        Tenant tenant, MissingPersonEpisode episode, Guid officerId, string title, string description,
        TaskCategory category, TaskPriority priority, CaseTaskStatus status, Guid assignedTo,
        DateTimeOffset? dueAt, string? location)
        => new()
        {
            TenantId = tenant.Id,
            EpisodeId = episode.Id,
            Title = title,
            Description = description,
            Category = category,
            Priority = priority,
            Status = status,
            AssignedToOfficerId = assignedTo,
            DueAt = dueAt,
            LocationText = location,
            CreatedByOfficerId = officerId,
            CreatedAt = episode.ReportedAt.AddHours(1)
        };

    private static PlaceOfInterest NewPlace(
        Tenant tenant, MissingPerson person, string label, PlaceCategory category, string address,
        SearchPriority priority, string notes, Guid officerId, DateTimeOffset createdAt)
        => new()
        {
            TenantId = tenant.Id,
            MissingPersonId = person.Id,
            Label = label,
            Category = category,
            Address = address,
            SearchPriority = priority,
            Notes = notes,
            CreatedByOfficerId = officerId,
            CreatedAt = createdAt
        };

    private static PersonNote NewNote(
        Tenant tenant, MissingPerson person, Guid? episodeId, NoteCategory category, string title,
        string body, Guid officerId, DateTimeOffset createdAt, bool sensitive)
        => new()
        {
            TenantId = tenant.Id,
            MissingPersonId = person.Id,
            EpisodeId = episodeId,
            Category = category,
            Title = title,
            Body = body,
            IsSensitive = sensitive,
            CreatedByOfficerId = officerId,
            CreatedAt = createdAt
        };

    private static void AddIfind(
        MissingPersonEpisode episode, IReadOnlyDictionary<string, IfindItem> catalogue,
        string code, DateTimeOffset createdAt, IfindStatus status, string? notes)
    {
        if (!catalogue.TryGetValue(code, out var item)) return;
        episode.IfindEntries.Add(new IfindChecklistEntry
        {
            TenantId = episode.TenantId,
            EpisodeId = episode.Id,
            IfindItemId = item.Id,
            Title = item.Title,
            Category = item.Category,
            Status = status,
            Notes = notes,
            AddedByOfficerId = episode.ReportedByOfficerId,
            CompletedByOfficerId = status == IfindStatus.Done ? episode.ReportedByOfficerId : null,
            CompletedAt = status == IfindStatus.Done ? createdAt : null,
            CreatedAt = createdAt
        });
    }

    private static DateOnly AgeDob(DateTimeOffset now, int age)
        => DateOnly.FromDateTime(now.UtcDateTime).AddYears(-age);

    private async Task SeedIfindCatalogueAsync(CancellationToken ct)
    {
        if (await db.IfindItems.AnyAsync(ct)) return;
        db.IfindItems.AddRange(
            Item("HEALTH-AE", "Check local A&E and urgent care", "Circulate the missing person's details to emergency departments and urgent treatment centres.", IfindCategory.Health, RiskLevel.Low),
            Item("HEALTH-MH", "Check mental health services and crisis contacts", "Contact the mental health team, crisis line and any known care coordinator.", IfindCategory.Health, RiskLevel.Medium),
            Item("TRANSPORT-RAIL", "Check railway stations and transport hubs", "Circulate to station staff and review ticket and CCTV records at key stations.", IfindCategory.Transport, RiskLevel.Low),
            Item("TRANSPORT-BUS", "Check bus operators and taxi firms", "Contact local operators for ticket data, driver briefings and vehicle CCTV.", IfindCategory.Transport, RiskLevel.Low),
            Item("WATER-CANAL", "Search waterways and towpaths", "Consider canal, river and reservoir searches with appropriate specialist resources.", IfindCategory.Waterways, RiskLevel.Medium),
            Item("ASSOC-KNOWN", "Contact known associates and friends", "Speak to family, friends and associates; include people not previously known to services.", IfindCategory.Associates, RiskLevel.Low),
            Item("FAMILY-HOME", "Visit family home and relatives", "Attend the family home and other addresses used by the missing person.", IfindCategory.Associates, RiskLevel.Low),
            Item("DIGITAL-SOCIAL", "Review social media and messaging accounts", "Request account preservation and review recent activity, friends and stories.", IfindCategory.Digital, RiskLevel.Medium),
            Item("PHONE", "Request phone network enquiries", "Consider urgent phone data requests where there is a serious risk to life.", IfindCategory.Digital, RiskLevel.High),
            Item("CCTV-LOCAL", "Identify and review local CCTV", "Map private and public cameras around the last seen location and route.", IfindCategory.Cctv, RiskLevel.Low),
            Item("EDU-SCHOOL", "Contact school, college or education provider", "Establish attendance, friendship groups and any concerns raised by staff.", IfindCategory.Education, RiskLevel.Low),
            Item("RETAIL-LASTSEEN", "Visit the last seen retail area", "Speak to staff, security and obtain footage from the last known location.", IfindCategory.Retail, RiskLevel.Low),
            Item("EXPLOIT-CSE", "Consider child exploitation indicators", "Assess for grooming, county lines and online exploitation; consult specialist teams.", IfindCategory.Exploitation, RiskLevel.Medium, children: true, adults: false),
            Item("NIGHT-TIME", "Check night-time economy venues", "Contact licensed premises, door staff and taxi marshals.", IfindCategory.Environment, RiskLevel.Low, children: false),
            Item("ENV-URBAN", "Search outbuildings, parks and open spaces", "Task local patrols and search teams to check known or accessible locations.", IfindCategory.Environment, RiskLevel.Low),
            Item("HOSTEL", "Check hostels and homeless services", "Circulate to local hostels, night shelters and outreach teams.", IfindCategory.Environment, RiskLevel.Low),
            Item("BORDER", "Check ports and border systems", "Consider port alerts and border checks where there is a risk of travel abroad.", IfindCategory.Transport, RiskLevel.High),
            Item("BANK", "Check financial activity", "Consider bank and payment enquiries where lawful and proportionate.", IfindCategory.Other, RiskLevel.Medium),
            Item("MEDIA-APPEAL", "Consider media and public appeal", "Prepare an appeal with the family and communications team where appropriate.", IfindCategory.Media, RiskLevel.Medium),
            Item("DOGS", "Consider specialist search resources", "Request police dogs, drone or specialist search assets based on the search assessment.", IfindCategory.Other, RiskLevel.Medium),
            Item("HOSPITAL-CHECK", "Check hospitals and healthcare settings", "Contact hospitals, walk-in centres and known healthcare providers.", IfindCategory.Health, RiskLevel.Low),
            Item("SCHOOL-FRIENDS", "Identify and speak to close friends", "Establish the missing person's recent relationships and offline contacts.", IfindCategory.Associates, RiskLevel.Low, children: true, adults: true)
        );
        await db.SaveChangesAsync(ct);
    }

    private static IfindItem Item(
        string code, string title, string description, IfindCategory category, RiskLevel minimumRisk,
        bool children = true, bool adults = true)
        => new()
        {
            Code = code,
            Title = title,
            Description = description,
            Category = category,
            MinimumRisk = minimumRisk,
            AppliesToChildren = children,
            AppliesToAdults = adults,
            Guidance = "Record the action taken, any result and the officer responsible."
        };
}

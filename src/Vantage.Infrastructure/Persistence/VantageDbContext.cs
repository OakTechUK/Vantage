using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Vantage.Domain.Common;
using Vantage.Domain.Entities;
using Vantage.Domain.Enums;
using Vantage.Infrastructure.Identity;

namespace Vantage.Infrastructure.Persistence;

/// <summary>
/// A police officer account. Identity tables are shared across tenants; every query in
/// the application is scoped by TenantId.
/// </summary>
public class Officer : IdentityUser<Guid>, ITenantOwned
{
    public Guid TenantId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Rank { get; set; } = string.Empty;
    public string CollarNumber { get; set; } = string.Empty;
    public OfficerRole Role { get; set; } = OfficerRole.Officer;
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class VantageDbContext(
    DbContextOptions<VantageDbContext> options,
    Vantage.Application.Abstractions.ICurrentUser currentUser,
    Vantage.Application.Abstractions.IClock clock)
    : IdentityDbContext<Officer, IdentityRole<Guid>, Guid>(options)
{
    public Guid? CurrentTenantId => currentUser.TenantId;

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<MissingPerson> MissingPersons => Set<MissingPerson>();
    public DbSet<MissingPersonEpisode> Episodes => Set<MissingPersonEpisode>();
    public DbSet<PersonAssociate> Associates => Set<PersonAssociate>();
    public DbSet<PlaceOfInterest> PlacesOfInterest => Set<PlaceOfInterest>();
    public DbSet<PersonNote> Notes => Set<PersonNote>();
    public DbSet<PersonImage> Images => Set<PersonImage>();
    public DbSet<CaseTask> Tasks => Set<CaseTask>();
    public DbSet<CaseReview> Reviews => Set<CaseReview>();
    public DbSet<CaseNumberCounter> CaseNumberCounters => Set<CaseNumberCounter>();
    public DbSet<AuditEntry> AuditEntries => Set<AuditEntry>();
    public DbSet<IfindItem> IfindItems => Set<IfindItem>();
    public DbSet<IfindChecklistEntry> IfindChecklistEntries => Set<IfindChecklistEntry>();
    public DbSet<ChildAbductionWarningNotice> CawnNotices => Set<ChildAbductionWarningNotice>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Tenant>(e =>
        {
            e.ToTable("Tenants");
            e.HasKey(x => x.Id);
            e.Property(x => x.Code).HasMaxLength(20).IsRequired();
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.Property(x => x.MpbForceCode).HasMaxLength(20);
            e.Property(x => x.LocalAuthorityName).HasMaxLength(200);
            e.Property(x => x.PrimaryContactEmail).HasMaxLength(320);
            e.HasIndex(x => x.Code).IsUnique();
        });

        modelBuilder.Entity<Officer>(e =>
        {
            e.Property(x => x.DisplayName).HasMaxLength(200);
            e.Property(x => x.Rank).HasMaxLength(100);
            e.Property(x => x.CollarNumber).HasMaxLength(50);
            e.HasIndex(x => new { x.TenantId, x.NormalizedEmail });
        });

        modelBuilder.Entity<MissingPerson>(e =>
        {
            e.ToTable("MissingPersons");
            e.Property(x => x.FirstName).HasMaxLength(100).IsRequired();
            e.Property(x => x.MiddleNames).HasMaxLength(200);
            e.Property(x => x.LastName).HasMaxLength(100).IsRequired();
            e.Property(x => x.Ethnicity).HasMaxLength(100);
            e.Property(x => x.Nationality).HasMaxLength(100);
            e.Property(x => x.Languages).HasMaxLength(200);
            e.Property(x => x.Build).HasMaxLength(100);
            e.Property(x => x.HairColour).HasMaxLength(100);
            e.Property(x => x.EyeColour).HasMaxLength(100);
            e.Property(x => x.DistinguishingFeatures).HasMaxLength(1000);
            e.Property(x => x.Description).HasMaxLength(4000);
            e.Property(x => x.VulnerabilitySummary).HasMaxLength(2000);
            e.HasIndex(x => new { x.TenantId, x.LastName });
            e.HasIndex(x => new { x.TenantId, x.IsRepeatMissing });
            e.HasQueryFilter(x => CurrentTenantId == null || x.TenantId == CurrentTenantId);
        });

        modelBuilder.Entity<MissingPersonEpisode>(e =>
        {
            e.ToTable("Episodes");
            e.Property(x => x.CaseNumber).HasMaxLength(40).IsRequired();
            e.Property(x => x.Circumstances).HasMaxLength(8000);
            e.Property(x => x.LastSeenLocation).HasMaxLength(300);
            e.Property(x => x.LastSeenWearing).HasMaxLength(1000);
            e.Property(x => x.LastSeenWith).HasMaxLength(1000);
            e.Property(x => x.LocatedLocation).HasMaxLength(300);
            e.Property(x => x.ClosureNotes).HasMaxLength(4000);
            e.HasIndex(x => new { x.TenantId, x.CaseNumber }).IsUnique();
            e.HasIndex(x => new { x.TenantId, x.Status });
            e.HasIndex(x => new { x.TenantId, x.NextReviewDueAt });
            e.HasIndex(x => new { x.TenantId, x.ReportedAt });
            e.HasOne(x => x.MissingPerson)
                .WithMany(p => p.Episodes)
                .HasForeignKey(x => x.MissingPersonId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasQueryFilter(x => CurrentTenantId == null || x.TenantId == CurrentTenantId);
        });

        modelBuilder.Entity<PersonAssociate>(e =>
        {
            e.ToTable("PersonAssociates");
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.Property(x => x.Relationship).HasMaxLength(100);
            e.Property(x => x.Phone).HasMaxLength(50);
            e.Property(x => x.Email).HasMaxLength(320);
            e.Property(x => x.Address).HasMaxLength(500);
            e.Property(x => x.Notes).HasMaxLength(4000);
            e.HasOne<MissingPerson>().WithMany(p => p.Associates)
                .HasForeignKey(x => x.MissingPersonId).OnDelete(DeleteBehavior.Cascade);
            e.HasQueryFilter(x => CurrentTenantId == null || x.TenantId == CurrentTenantId);
        });

        modelBuilder.Entity<PlaceOfInterest>(e =>
        {
            e.ToTable("PlacesOfInterest");
            e.Property(x => x.Label).HasMaxLength(200).IsRequired();
            e.Property(x => x.Address).HasMaxLength(500);
            e.Property(x => x.Notes).HasMaxLength(4000);
            e.HasOne<MissingPerson>().WithMany(p => p.PlacesOfInterest)
                .HasForeignKey(x => x.MissingPersonId).OnDelete(DeleteBehavior.Cascade);
            e.HasQueryFilter(x => CurrentTenantId == null || x.TenantId == CurrentTenantId);
        });

        modelBuilder.Entity<PersonNote>(e =>
        {
            e.ToTable("PersonNotes");
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.Property(x => x.Body).HasMaxLength(10000).IsRequired();
            e.HasOne<MissingPerson>().WithMany(p => p.Notes)
                .HasForeignKey(x => x.MissingPersonId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne<MissingPersonEpisode>().WithMany(p => p.Notes)
                .HasForeignKey(x => x.EpisodeId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => new { x.TenantId, x.MissingPersonId });
            e.HasQueryFilter(x => CurrentTenantId == null || x.TenantId == CurrentTenantId);
        });

        modelBuilder.Entity<PersonImage>(e =>
        {
            e.ToTable("PersonImages");
            e.Property(x => x.FileName).HasMaxLength(260).IsRequired();
            e.Property(x => x.ContentType).HasMaxLength(100).IsRequired();
            e.Property(x => x.StorageKey).HasMaxLength(500).IsRequired();
            e.Property(x => x.Caption).HasMaxLength(500);
            e.HasOne<MissingPerson>().WithMany(p => p.Images)
                .HasForeignKey(x => x.MissingPersonId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.TenantId, x.MissingPersonId });
            e.HasQueryFilter(x => CurrentTenantId == null || x.TenantId == CurrentTenantId);
        });

        modelBuilder.Entity<CaseTask>(e =>
        {
            e.ToTable("CaseTasks");
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.Property(x => x.Description).HasMaxLength(4000);
            e.Property(x => x.Outcome).HasMaxLength(4000);
            e.Property(x => x.LocationText).HasMaxLength(300);
            e.HasOne<MissingPersonEpisode>().WithMany(x => x.Tasks)
                .HasForeignKey(x => x.EpisodeId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.TenantId, x.EpisodeId, x.Status });
            e.HasQueryFilter(x => CurrentTenantId == null || x.TenantId == CurrentTenantId);
        });

        modelBuilder.Entity<CaseReview>(e =>
        {
            e.ToTable("CaseReviews");
            e.Property(x => x.Notes).HasMaxLength(4000).IsRequired();
            e.HasOne<MissingPersonEpisode>().WithMany(x => x.Reviews)
                .HasForeignKey(x => x.EpisodeId).OnDelete(DeleteBehavior.Cascade);
            e.HasQueryFilter(x => CurrentTenantId == null || x.TenantId == CurrentTenantId);
        });

        modelBuilder.Entity<CaseNumberCounter>(e =>
        {
            e.ToTable("CaseNumberCounters");
            e.HasIndex(x => new { x.TenantId, x.Year }).IsUnique();
            e.HasQueryFilter(x => CurrentTenantId == null || x.TenantId == CurrentTenantId);
        });

        modelBuilder.Entity<AuditEntry>(e =>
        {
            e.ToTable("AuditEntries");
            e.Property(x => x.Action).HasMaxLength(200).IsRequired();
            e.Property(x => x.EntityType).HasMaxLength(200).IsRequired();
            e.Property(x => x.Details).HasMaxLength(8000);
            e.Property(x => x.IpAddress).HasMaxLength(64);
            e.HasIndex(x => new { x.TenantId, x.EntityId });
            e.HasIndex(x => new { x.TenantId, x.CreatedAt });
            e.HasQueryFilter(x => CurrentTenantId == null || x.TenantId == CurrentTenantId);
        });

        modelBuilder.Entity<IfindItem>(e =>
        {
            e.ToTable("IfindItems");
            e.HasKey(x => x.Id);
            e.Property(x => x.Code).HasMaxLength(40).IsRequired();
            e.Property(x => x.Title).HasMaxLength(250).IsRequired();
            e.Property(x => x.Description).HasMaxLength(2000);
            e.Property(x => x.Guidance).HasMaxLength(2000);
            e.HasIndex(x => x.Code).IsUnique();
        });

        modelBuilder.Entity<IfindChecklistEntry>(e =>
        {
            e.ToTable("IfindChecklistEntries");
            e.Property(x => x.Title).HasMaxLength(250).IsRequired();
            e.Property(x => x.Notes).HasMaxLength(4000);
            e.HasOne<MissingPersonEpisode>().WithMany(x => x.IfindEntries)
                .HasForeignKey(x => x.EpisodeId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.TenantId, x.EpisodeId });
            e.HasQueryFilter(x => CurrentTenantId == null || x.TenantId == CurrentTenantId);
        });

        modelBuilder.Entity<ChildAbductionWarningNotice>(e =>
        {
            e.ToTable("ChildAbductionWarningNotices");
            e.Property(x => x.Reference).HasMaxLength(40).IsRequired();
            e.Property(x => x.SubjectName).HasMaxLength(200).IsRequired();
            e.Property(x => x.Reason).HasMaxLength(4000).IsRequired();
            e.Property(x => x.RevocationReason).HasMaxLength(4000);
            e.HasIndex(x => new { x.TenantId, x.Reference }).IsUnique();
            e.HasIndex(x => new { x.TenantId, x.Status });
            e.HasOne(x => x.Child).WithMany().HasForeignKey(x => x.ChildPersonId).OnDelete(DeleteBehavior.Restrict);
            e.HasQueryFilter(x => CurrentTenantId == null || x.TenantId == CurrentTenantId);
        });

        // SQLite cannot compare or order DateTimeOffset columns. Storing UTC ticks keeps
        // the domain model clean while allowing range filters and ordering. A production
        // provider (PostgreSQL/SQL Server) keeps its native timestamp type.
        if (!Database.IsSqlite()) return;

        var dateTimeOffsetConverter = new ValueConverter<DateTimeOffset, long>(
            value => value.UtcTicks,
            value => new DateTimeOffset(value, TimeSpan.Zero));
        var nullableDateTimeOffsetConverter = new ValueConverter<DateTimeOffset?, long?>(
            value => value == null ? null : value.Value.UtcTicks,
            value => value == null ? null : new DateTimeOffset(value.Value, TimeSpan.Zero));

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(DateTimeOffset))
                    property.SetValueConverter(dateTimeOffsetConverter);
                else if (property.ClrType == typeof(DateTimeOffset?))
                    property.SetValueConverter(nullableDateTimeOffsetConverter);
            }
        }
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyTenantAndTimestamps();
        ApplyAutomaticAudit();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override int SaveChanges()
    {
        ApplyTenantAndTimestamps();
        ApplyAutomaticAudit();
        return base.SaveChanges();
    }

    private void ApplyTenantAndTimestamps()
    {
        var now = clock.UtcNow;
        foreach (var entry in ChangeTracker.Entries<ITenantOwned>())
        {
            if (entry.State == EntityState.Added)
            {
                if (entry.Entity.TenantId == Guid.Empty && CurrentTenantId is { } tenantId)
                    entry.Entity.TenantId = tenantId;
                if (entry.Entity is TenantEntity entity && entity.CreatedAt == default)
                    entity.CreatedAt = now;
            }
            else if (entry.State == EntityState.Modified && entry.Entity is TenantEntity modified)
            {
                modified.UpdatedAt = now;
            }
        }
    }

    /// <summary>
    /// Records an immutable trail of every create/update/delete. Only property names are
    /// captured, never sensitive values.
    /// </summary>
    private void ApplyAutomaticAudit()
    {
        var now = clock.UtcNow;
        var pending = ChangeTracker.Entries()
            .Where(e => e.Entity is ITenantOwned
                        && e.Entity is not AuditEntry
                        && e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .ToList();

        foreach (var entry in pending)
        {
            var owned = (ITenantOwned)entry.Entity;
            var action = entry.State switch
            {
                EntityState.Added => "created",
                EntityState.Modified => "updated",
                _ => "deleted"
            };
            var changed = entry.State == EntityState.Modified
                ? string.Join(", ", entry.Properties.Where(p => p.IsModified).Select(p => p.Metadata.Name))
                : string.Join(", ", entry.Properties.Where(p => p.Metadata.IsPrimaryKey() || p.Metadata.Name is "TenantId").Select(p => p.Metadata.Name));

            var id = entry.Properties
                .FirstOrDefault(p => p.Metadata.IsPrimaryKey())?.CurrentValue as Guid?;

            AuditEntries.Add(new AuditEntry
            {
                TenantId = owned.TenantId != Guid.Empty ? owned.TenantId : CurrentTenantId ?? Guid.Empty,
                ActorOfficerId = currentUser.OfficerId,
                Action = $"entity.{action}",
                EntityType = entry.Entity.GetType().Name,
                EntityId = id,
                Details = changed,
                IpAddress = currentUser.IpAddress,
                CreatedAt = now
            });
        }
    }
}

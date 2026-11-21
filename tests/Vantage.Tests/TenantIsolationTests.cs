using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Vantage.Application.Abstractions;
using Vantage.Domain.Entities;
using Vantage.Domain.Enums;
using Vantage.Infrastructure.Persistence;

namespace Vantage.Tests;

public sealed class TenantIsolationTests : IDisposable
{
    private sealed class TestUser : ICurrentUser
    {
        public Guid? OfficerId { get; set; } = Guid.NewGuid();
        public Guid? TenantId { get; set; }
        public string? DisplayName => "Test Officer";
        public OfficerRole? Role => OfficerRole.Officer;
        public bool IsAuthenticated => true;
        public string? IpAddress => "127.0.0.1";
    }

    private sealed class TestClock : IClock
    {
        public DateTimeOffset UtcNow { get; } = new(2026, 11, 21, 12, 0, 0, TimeSpan.Zero);
    }

    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<VantageDbContext> _options;

    public TenantIsolationTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        _options = new DbContextOptionsBuilder<VantageDbContext>()
            .UseSqlite(_connection)
            .Options;

        using var setup = NewContext(null);
        setup.Database.EnsureCreated();
    }

    private VantageDbContext NewContext(Guid? tenantId)
        => new(_options, new TestUser { TenantId = tenantId }, new TestClock());

    private static MissingPerson Person(Guid tenantId, string first, string last) => new()
    {
        TenantId = tenantId,
        FirstName = first,
        LastName = last,
        CreatedByOfficerId = Guid.NewGuid()
    };

    [Fact]
    public async Task TenantOnlySeesItsOwnPeople()
    {
        var forceA = Guid.NewGuid();
        var forceB = Guid.NewGuid();

        await using (var seed = NewContext(null))
        {
            seed.MissingPersons.AddRange(
                Person(forceA, "Amelia", "Hayes"),
                Person(forceB, "Grace", "Turner"));
            await seed.SaveChangesAsync();
        }

        await using var context = NewContext(forceA);
        var people = await context.MissingPersons.ToListAsync();

        Assert.Single(people);
        Assert.Equal("Hayes", people[0].LastName);
        Assert.DoesNotContain(people, person => person.TenantId == forceB);
    }

    [Fact]
    public async Task IgnoreQueryFilters_CanSeeAllTenantsForPlatformOperations()
    {
        var forceA = Guid.NewGuid();
        var forceB = Guid.NewGuid();

        await using (var seed = NewContext(null))
        {
            seed.MissingPersons.AddRange(
                Person(forceA, "Amelia", "Hayes"),
                Person(forceB, "Grace", "Turner"));
            await seed.SaveChangesAsync();
        }

        await using var context = NewContext(forceA);
        var all = await context.MissingPersons.IgnoreQueryFilters().ToListAsync();

        Assert.Equal(2, all.Count);
    }

    [Fact]
    public async Task NewEntitiesAreStampedWithTheCurrentTenant()
    {
        var force = Guid.NewGuid();
        await using (var seed = NewContext(force))
        {
            var person = new MissingPerson
            {
                FirstName = "Leo",
                LastName = "Marsh",
                CreatedByOfficerId = Guid.NewGuid()
            };
            seed.MissingPersons.Add(person);
            await seed.SaveChangesAsync();
        }

        await using var context = NewContext(force);
        var stored = await context.MissingPersons.SingleAsync();
        Assert.Equal(force, stored.TenantId);
    }

    [Fact]
    public async Task AutomaticAuditTrailIsWritten()
    {
        var force = Guid.NewGuid();
        await using (var context = NewContext(force))
        {
            context.MissingPersons.Add(new MissingPerson
            {
                FirstName = "Leo",
                LastName = "Marsh",
                CreatedByOfficerId = Guid.NewGuid()
            });
            await context.SaveChangesAsync();
        }

        await using var check = NewContext(force);
        var audit = await check.AuditEntries.ToListAsync();
        Assert.Contains(audit, entry => entry.EntityType == nameof(MissingPerson) && entry.Action == "entity.created");
    }

    public void Dispose() => _connection.Dispose();
}

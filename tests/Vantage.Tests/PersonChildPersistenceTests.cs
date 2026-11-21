using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Vantage.Application.Abstractions;
using Vantage.Domain.Entities;
using Vantage.Domain.Enums;
using Vantage.Infrastructure.Persistence;
using Vantage.Infrastructure.Persistence.Repositories;

namespace Vantage.Tests;

public sealed class PersonChildPersistenceTests : IDisposable
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
    private readonly Guid _tenant = Guid.NewGuid();
    private readonly VantageDbContext _context;
    private readonly MissingPersonRepository _repository;

    public PersonChildPersistenceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        var options = new DbContextOptionsBuilder<VantageDbContext>()
            .UseSqlite(_connection)
            .Options;
        _context = new VantageDbContext(options, new TestUser { TenantId = _tenant }, new TestClock());
        _context.Database.EnsureCreated();
        _repository = new MissingPersonRepository(_context);
    }

    [Fact]
    public async Task AddingAnImageThroughTheRepositoryInsertsIt()
    {
        var person = new MissingPerson
        {
            TenantId = _tenant,
            FirstName = "Amelia",
            LastName = "Hayes",
            CreatedByOfficerId = Guid.NewGuid()
        };
        await _repository.AddAsync(person);
        await _context.SaveChangesAsync();

        await _repository.AddImageAsync(new PersonImage
        {
            TenantId = _tenant,
            MissingPersonId = person.Id,
            FileName = "photo.png",
            ContentType = "image/png",
            SizeBytes = 100,
            StorageKey = "2026/11/test.png",
            IsPrimary = true,
            UploadedByOfficerId = Guid.NewGuid()
        });
        await _context.SaveChangesAsync();

        Assert.Equal(1, await _context.Images.CountAsync());
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
    }
}

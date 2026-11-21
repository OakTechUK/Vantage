using Vantage.Domain.Enums;

namespace Vantage.Application.Abstractions;

public interface ICurrentUser
{
    Guid? OfficerId { get; }
    Guid? TenantId { get; }
    string? DisplayName { get; }
    OfficerRole? Role { get; }
    bool IsAuthenticated { get; }
    string? IpAddress { get; }
    bool IsSupervisorOrAbove => Role is OfficerRole.Supervisor or OfficerRole.Administrator;
}

public interface IClock
{
    DateTimeOffset UtcNow { get; }
}

/// <summary>
/// Transaction boundary over the persistence provider. Application services never see
/// EF Core or a concrete database.
/// </summary>
public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
    Task<T> ExecuteInTransactionAsync<T>(Func<CancellationToken, Task<T>> action, CancellationToken ct = default);
}

public interface IFileStorage
{
    Task<string> SaveAsync(Stream content, string fileName, string contentType, CancellationToken ct = default);
    Task<Stream?> OpenReadAsync(string storageKey, CancellationToken ct = default);
    Task DeleteAsync(string storageKey, CancellationToken ct = default);
}

public sealed record LoginRequest(string TenantCode, string Email, string Password);

public sealed record LoginResponse(string AccessToken, DateTimeOffset ExpiresAt, OfficerProfileDto Officer);

public sealed record OfficerProfileDto(
    Guid Id,
    string Email,
    string DisplayName,
    string Rank,
    string CollarNumber,
    OfficerRole Role,
    Guid TenantId,
    string TenantCode,
    string TenantName);

public sealed record TenantLookupDto(Guid Id, string Code, string Name);

/// <summary>
/// Identity boundary. The current implementation uses ASP.NET Core Identity with local
/// credentials and JWTs; a force SSO / OIDC implementation can replace it.
/// </summary>
public interface IAuthenticationService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task<OfficerProfileDto?> GetProfileAsync(Guid officerId, CancellationToken ct = default);
    Task<IReadOnlyList<TenantLookupDto>> ListTenantsAsync(CancellationToken ct = default);
}

public sealed record OfficerSummaryDto(Guid Id, string DisplayName, string Rank, string CollarNumber, OfficerRole Role);

public interface IOfficerDirectory
{
    Task<IReadOnlyList<OfficerSummaryDto>> ListAsync(CancellationToken ct = default);
    Task<OfficerSummaryDto?> GetAsync(Guid officerId, CancellationToken ct = default);
}

public interface IAuditService
{
    Task RecordAsync(string action, string entityType, Guid? entityId, object? details = null, CancellationToken ct = default);
}

public interface ICaseNumberGenerator
{
    Task<string> NextAsync(Guid tenantId, string tenantCode, CancellationToken ct = default);
}

public sealed record LocalAuthorityNotificationResult(bool Notified, DateTimeOffset? NotifiedAt, string? Reference);

/// <summary>Stub-able boundary for the automatic local-authority child notification.</summary>
public interface ILocalAuthorityNotifier
{
    Task<LocalAuthorityNotificationResult> NotifyChildMissingAsync(
        Guid tenantId, string tenantName, string caseNumber, string childName,
        DateOnly? dateOfBirth, CancellationToken ct = default);
}

public sealed record MpbExport(string FileName, string ContentType, byte[] Content);

/// <summary>Stub-able boundary for the UK Missing Persons Bureau quarterly return.</summary>
public interface IMissingPersonsBureauExporter
{
    Task<MpbExport> BuildQuarterlyReturnAsync(int year, int quarter, CancellationToken ct = default);
}

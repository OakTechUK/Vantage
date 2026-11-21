using Vantage.Application.Abstractions;
using Vantage.Domain.Enums;

namespace Vantage.Application.Dtos;

public sealed record IfindItemDto(
    Guid Id,
    string Code,
    string Title,
    string Description,
    IfindCategory Category,
    bool AppliesToChildren,
    bool AppliesToAdults,
    RiskLevel MinimumRisk,
    string? Guidance);

public sealed record IfindEntryDto(
    Guid Id,
    Guid? IfindItemId,
    string Title,
    IfindCategory Category,
    IfindStatus Status,
    string? Notes,
    Guid AddedByOfficerId,
    Guid? CompletedByOfficerId,
    DateTimeOffset? CompletedAt,
    DateTimeOffset CreatedAt);

public sealed record AddIfindEntryRequest(
    Guid? IfindItemId,
    string? Title,
    IfindCategory? Category,
    string? Notes);

public sealed record UpdateIfindEntryRequest(
    IfindStatus Status,
    string? Notes);

public sealed record CawnDto(
    Guid Id,
    string Reference,
    Guid ChildPersonId,
    string ChildName,
    Guid? SubjectAssociateId,
    string SubjectName,
    DateOnly? SubjectDateOfBirth,
    DateTimeOffset IssuedAt,
    DateTimeOffset ExpiresAt,
    CawnStatus Status,
    string Reason,
    Guid IssuedByOfficerId,
    DateTimeOffset? RevokedAt,
    string? RevocationReason);

public sealed record CreateCawnRequest(
    Guid ChildPersonId,
    string ChildName,
    Guid? SubjectAssociateId,
    string SubjectName,
    DateOnly? SubjectDateOfBirth,
    DateTimeOffset? ExpiresAt,
    string Reason);

public sealed record RevokeCawnRequest(string Reason);

public sealed record OfficerListDto(IReadOnlyList<OfficerSummaryDto> Items);

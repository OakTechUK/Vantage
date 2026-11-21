using Vantage.Application.Abstractions;
using Vantage.Application.Common;
using Vantage.Application.Dtos;
using Vantage.Domain.Entities;
using Vantage.Domain.Enums;

namespace Vantage.Application.Services;

public sealed class CawnService(
    ICawnRepository cawns,
    IMissingPersonRepository persons,
    IUnitOfWork unitOfWork,
    ICurrentUser currentUser,
    IClock clock,
    IAuditService audit)
{
    public async Task<PagedResult<CawnDto>> SearchAsync(CawnStatus? status, string? search, int page, int pageSize, CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var (items, total) = await cawns.SearchAsync(status, search, page, pageSize, ct);
        return new PagedResult<CawnDto>(items.Select(n => n.ToDto()).ToList(), total, page, pageSize);
    }

    public async Task<CawnDto> CreateAsync(CreateCawnRequest request, CancellationToken ct = default)
    {
        var now = clock.UtcNow;
        var child = await persons.GetWithGraphAsync(request.ChildPersonId, ct)
            ?? throw new NotFoundException("Child not found.");
        if (child.AgeOn(now) is not < 18)
            throw new ValidationFailureException("A child abduction warning notice can only be issued for a person under 18.");
        if (string.IsNullOrWhiteSpace(request.SubjectName) || request.SubjectName.Length > 200)
            throw new ValidationFailureException("Subject name is required and must be 200 characters or fewer.");
        if (string.IsNullOrWhiteSpace(request.Reason))
            throw new ValidationFailureException("The reason for the notice is required.");

        if (request.SubjectAssociateId is { } associateId &&
            child.Associates.All(a => a.Id != associateId))
            throw new ValidationFailureException("The subject is not an associate on the child's file.");

        var expires = request.ExpiresAt ?? now.AddMonths(12);
        if (expires <= now) throw new ValidationFailureException("The expiry date must be in the future.");

        var notice = new ChildAbductionWarningNotice
        {
            TenantId = RequireTenant(),
            Reference = $"CAWN-{now.Year}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}",
            ChildPersonId = request.ChildPersonId,
            SubjectAssociateId = request.SubjectAssociateId,
            SubjectName = request.SubjectName.Trim(),
            SubjectDateOfBirth = request.SubjectDateOfBirth,
            IssuedAt = now,
            ExpiresAt = expires,
            Status = CawnStatus.Active,
            Reason = request.Reason.Trim(),
            IssuedByOfficerId = RequireOfficer()
        };
        await cawns.AddAsync(notice, ct);
        await unitOfWork.SaveChangesAsync(ct);
        await audit.RecordAsync("cawn.issued", nameof(ChildAbductionWarningNotice), notice.Id,
            new { notice.Reference, notice.SubjectName }, ct);
        return notice.ToDto();
    }

    public async Task<CawnDto> RevokeAsync(Guid id, RevokeCawnRequest request, CancellationToken ct = default)
    {
        var notice = await cawns.GetAsync(id, ct) ?? throw new NotFoundException("Notice not found.");
        if (notice.Status is CawnStatus.Revoked)
            throw new ValidationFailureException("This notice has already been revoked.");
        if (string.IsNullOrWhiteSpace(request.Reason))
            throw new ValidationFailureException("A revocation reason is required.");

        notice.Status = CawnStatus.Revoked;
        notice.RevokedAt = clock.UtcNow;
        notice.RevocationReason = request.Reason.Trim();
        await unitOfWork.SaveChangesAsync(ct);
        await audit.RecordAsync("cawn.revoked", nameof(ChildAbductionWarningNotice), notice.Id, new { request.Reason }, ct);
        return notice.ToDto();
    }

    private Guid RequireTenant() => currentUser.TenantId ?? throw new ForbiddenException("A tenant context is required.");
    private Guid RequireOfficer() => currentUser.OfficerId ?? throw new ForbiddenException("An authenticated officer is required.");
}

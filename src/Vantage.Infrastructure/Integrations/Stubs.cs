using System.Text;
using Microsoft.Extensions.Logging;
using Vantage.Application.Abstractions;
using Vantage.Domain.Enums;

namespace Vantage.Infrastructure.Integrations;

/// <summary>
/// Development stub. In production this would post the child missing notification to the
/// local authority's agreed channel (secure email / API) and record the receipt.
/// </summary>
public sealed class StubLocalAuthorityNotifier(ILogger<StubLocalAuthorityNotifier> logger, IClock clock)
    : ILocalAuthorityNotifier
{
    public Task<LocalAuthorityNotificationResult> NotifyChildMissingAsync(
        Guid tenantId, string tenantName, string caseNumber, string childName,
        DateOnly? dateOfBirth, CancellationToken ct = default)
    {
        logger.LogInformation(
            "STUB local authority notification: force={Tenant} case={CaseNumber} child={Child}",
            tenantName, caseNumber, childName);
        return Task.FromResult(new LocalAuthorityNotificationResult(true, clock.UtcNow, $"LA-{caseNumber}"));
    }
}

/// <summary>
/// Builds a UK Missing Persons Bureau quarterly return as CSV. This is an interface-backed
/// stub so the eventual national submission format can be swapped in without touching the API.
/// </summary>
public sealed class MissingPersonsBureauExporter(IReportQueries queries, IClock clock) : IMissingPersonsBureauExporter
{
    public async Task<MpbExport> BuildQuarterlyReturnAsync(int year, int quarter, CancellationToken ct = default)
    {
        var rows = await queries.GetMpbRowsAsync(year, quarter, ct);
        var csv = new StringBuilder();
        csv.AppendLine("Force Code,Case Number,Person Name,Date of Birth,Sex,Category,Risk,Reported At,Located At,Outcome,Last Seen Location,Local Authority Notified");

        foreach (var row in rows)
        {
            csv.AppendLine(string.Join(',',
                Escape(row.ForceCode),
                Escape(row.CaseNumber),
                Escape(row.PersonName),
                row.DateOfBirth?.ToString("yyyy-MM-dd") ?? string.Empty,
                row.Sex.ToString(),
                row.Category.ToString(),
                row.Risk.ToString(),
                row.ReportedAt.ToString("yyyy-MM-dd HH:mm"),
                row.LocatedAt?.ToString("yyyy-MM-dd HH:mm") ?? string.Empty,
                row.Outcome?.ToString() ?? string.Empty,
                Escape(row.LastSeenLocation ?? string.Empty),
                row.LocalAuthorityNotified ? "Yes" : "No"));
        }

        var bytes = new UTF8Encoding(true).GetBytes(csv.ToString());
        return new MpbExport($"mpb-return-{year}-Q{quarter}-{clock.UtcNow:yyyyMMdd}.csv", "text/csv", bytes);
    }

    private static string Escape(string value)
        => value.Contains(',') || value.Contains('"') || value.Contains('\n')
            ? $"\"{value.Replace("\"", "\"\"")}\""
            : value;
}

using Vantage.Application.Dtos;

namespace Vantage.Application.Common;

public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize)
{
    public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling(Total / (double)PageSize);
    public static PagedResult<T> Empty(int page, int pageSize) => new([], 0, page, pageSize);
}

public sealed class NotFoundException(string message) : Exception(message);

public sealed class ForbiddenException(string message) : Exception(message);

public sealed class ValidationFailureException(string message) : Exception(message);

/// <summary>Raised when a task looks like an existing task on the same enquiry.</summary>
public sealed class DuplicateTaskException(string message, IReadOnlyList<TaskDuplicateMatch> matches)
    : Exception(message)
{
    public IReadOnlyList<TaskDuplicateMatch> Matches { get; } = matches;
}

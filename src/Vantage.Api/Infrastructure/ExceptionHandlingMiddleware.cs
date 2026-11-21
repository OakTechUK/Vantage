using Vantage.Application.Common;

namespace Vantage.Api.Infrastructure;

public sealed class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception exception)
        {
            if (context.Response.HasStarted) throw;

            var (status, title) = exception switch
            {
                NotFoundException => (StatusCodes.Status404NotFound, "Not found"),
                ForbiddenException => (StatusCodes.Status403Forbidden, "Forbidden"),
                ValidationFailureException => (StatusCodes.Status400BadRequest, "Validation failed"),
                DuplicateTaskException => (StatusCodes.Status409Conflict, "Possible duplicate task"),
                _ => (StatusCodes.Status500InternalServerError, "Unexpected error")
            };

            if (status == StatusCodes.Status500InternalServerError)
                logger.LogError(exception, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path);

            context.Response.StatusCode = status;
            context.Response.ContentType = "application/problem+json";

            if (exception is DuplicateTaskException duplicate)
            {
                await context.Response.WriteAsJsonAsync(new
                {
                    title,
                    status,
                    detail = duplicate.Message,
                    duplicates = duplicate.Matches
                });
                return;
            }

            await context.Response.WriteAsJsonAsync(new
            {
                title,
                status,
                detail = exception is ValidationFailureException or NotFoundException or ForbiddenException
                    ? exception.Message
                    : "An unexpected error occurred. The incident has been logged."
            });
        }
    }
}

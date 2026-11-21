namespace Vantage.Application.Services;

/// <summary>
/// Iterative two-row Levenshtein distance with an optional early exit. Used for
/// typo-tolerant duplicate task detection.
/// </summary>
public static class Levenshtein
{
    public static int Distance(string a, string b, int? maxDistance = null)
    {
        if (a == b) return 0;
        if (a.Length == 0) return b.Length;
        if (b.Length == 0) return a.Length;

        // Keep the shorter string on the inner loop for memory efficiency.
        if (a.Length > b.Length) (a, b) = (b, a);

        var previous = new int[a.Length + 1];
        var current = new int[a.Length + 1];
        for (var i = 0; i <= a.Length; i++) previous[i] = i;

        for (var j = 1; j <= b.Length; j++)
        {
            current[0] = j;
            var rowMinimum = current[0];
            for (var i = 1; i <= a.Length; i++)
            {
                var cost = a[i - 1] == b[j - 1] ? 0 : 1;
                current[i] = Math.Min(
                    Math.Min(current[i - 1] + 1, previous[i] + 1),
                    previous[i - 1] + cost);
                rowMinimum = Math.Min(rowMinimum, current[i]);
            }

            if (maxDistance is not null && rowMinimum > maxDistance) return maxDistance.Value + 1;
            (previous, current) = (current, previous);
        }

        return previous[a.Length];
    }

    public static double Similarity(string a, string b, int? maxDistance = null)
    {
        if (string.IsNullOrEmpty(a) && string.IsNullOrEmpty(b)) return 1;
        var max = Math.Max(a.Length, b.Length);
        if (max == 0) return 1;
        var distance = Distance(a, b, maxDistance);
        return 1d - (distance / (double)max);
    }
}

public static class TextNormalizer
{
    public static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;

        Span<char> buffer = value.Length <= 512 ? stackalloc char[value.Length] : new char[value.Length];
        var length = 0;
        var lastWasSpace = true;
        foreach (var raw in value)
        {
            var c = char.ToLowerInvariant(raw);
            if (char.IsLetterOrDigit(c))
            {
                buffer[length++] = c;
                lastWasSpace = false;
            }
            else if (!lastWasSpace)
            {
                buffer[length++] = ' ';
                lastWasSpace = true;
            }
        }

        var end = length;
        while (end > 0 && buffer[end - 1] == ' ') end--;
        return new string(buffer[..end]);
    }

    /// <summary>Sorts tokens so word order variations still compare closely.</summary>
    public static string NormalizeTokenSorted(string? value)
    {
        var normalized = Normalize(value);
        if (normalized.Length == 0) return normalized;
        var tokens = normalized.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        Array.Sort(tokens, StringComparer.Ordinal);
        return string.Join(' ', tokens);
    }
}

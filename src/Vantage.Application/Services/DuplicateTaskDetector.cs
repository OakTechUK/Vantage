using Vantage.Application.Dtos;
using Vantage.Domain.Entities;
using Vantage.Domain.Enums;

namespace Vantage.Application.Services;

public sealed record DuplicateDetectionOptions(
    double SimilarityThreshold = 0.82,
    int MaximumDistance = 4,
    bool IncludeCompleted = true);

/// <summary>
/// Detects tasks that duplicate an existing enquiry action. It tolerates typos and
/// word-order variations by comparing normalised, token-sorted titles and by folding
/// in the linked location where one is supplied.
/// </summary>
public static class DuplicateTaskDetector
{
    public static IReadOnlyList<TaskDuplicateMatch> Find(
        string title,
        string? location,
        IEnumerable<CaseTask> candidates,
        DuplicateDetectionOptions? options = null)
    {
        options ??= new DuplicateDetectionOptions();

        var normalizedTitle = TextNormalizer.Normalize(title);
        var sortedTitle = TextNormalizer.NormalizeTokenSorted(title);
        var normalizedCombined = TextNormalizer.Normalize($"{title} {location}");
        var sortedCombined = TextNormalizer.NormalizeTokenSorted($"{title} {location}");

        var matches = new List<TaskDuplicateMatch>();
        foreach (var candidate in candidates)
        {
            if (!options.IncludeCompleted && candidate.Status is CaseTaskStatus.Completed or CaseTaskStatus.Cancelled)
                continue;

            var candidateTitle = TextNormalizer.Normalize(candidate.Title);
            var candidateSortedTitle = TextNormalizer.NormalizeTokenSorted(candidate.Title);
            var candidateCombined = TextNormalizer.Normalize($"{candidate.Title} {candidate.LocationText}");
            var candidateSortedCombined = TextNormalizer.NormalizeTokenSorted($"{candidate.Title} {candidate.LocationText}");

            var distance = Math.Min(
                Levenshtein.Distance(normalizedTitle, candidateTitle, options.MaximumDistance),
                Levenshtein.Distance(sortedTitle, candidateSortedTitle, options.MaximumDistance));
            var compositeDistance = Math.Min(
                Levenshtein.Distance(normalizedCombined, candidateCombined, options.MaximumDistance),
                Levenshtein.Distance(sortedCombined, candidateSortedCombined, options.MaximumDistance));

            var similarity = Math.Max(
                Levenshtein.Similarity(normalizedTitle, candidateTitle, options.MaximumDistance),
                Levenshtein.Similarity(sortedTitle, candidateSortedTitle, options.MaximumDistance));

            var compositeSimilarity = Math.Max(
                Levenshtein.Similarity(normalizedCombined, candidateCombined, options.MaximumDistance),
                Levenshtein.Similarity(sortedCombined, candidateSortedCombined, options.MaximumDistance));

            var bestSimilarity = Math.Max(similarity, compositeSimilarity);
            var bestDistance = similarity >= compositeSimilarity ? distance : Math.Min(distance, compositeDistance);

            if (bestSimilarity >= options.SimilarityThreshold && bestDistance <= options.MaximumDistance)
            {
                matches.Add(new TaskDuplicateMatch(
                    candidate.Id,
                    candidate.Title,
                    candidate.Status,
                    Math.Round(bestSimilarity, 3),
                    bestDistance,
                    candidate.LocationText));
            }
        }

        return matches
            .OrderByDescending(m => m.Similarity)
            .ThenBy(m => m.Distance)
            .ToList();
    }
}

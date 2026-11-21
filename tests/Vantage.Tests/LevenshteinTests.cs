using Vantage.Application.Services;

namespace Vantage.Tests;

public class LevenshteinTests
{
    [Theory]
    [InlineData("kitten", "sitting", 3)]
    [InlineData("flaw", "lawn", 2)]
    [InlineData("", "missing", 7)]
    [InlineData("same", "same", 0)]
    [InlineData("Saturday", "Sunday", 3)]
    public void Distance_ReturnsExpectedValue(string a, string b, int expected)
    {
        Assert.Equal(expected, Levenshtein.Distance(a, b));
    }

    [Fact]
    public void Distance_IsSymmetric()
    {
        Assert.Equal(
            Levenshtein.Distance("Riverside Retail Park", "Riverside Retail Prk"),
            Levenshtein.Distance("Riverside Retail Prk", "Riverside Retail Park"));
    }

    [Fact]
    public void Similarity_TypoRemainsAboveDuplicateThreshold()
    {
        var similarity = Levenshtein.Similarity(
            TextNormalizer.Normalize("Review CCTV at Riverside Retail Park"),
            TextNormalizer.Normalize("Review CCTV at Riverside Retail Prk"));

        Assert.True(similarity >= 0.95);
    }

    [Fact]
    public void Normalize_StripsPunctuationAndCollapsesWhitespace()
    {
        Assert.Equal("check cctv at tesco", TextNormalizer.Normalize("  Check CCTV, at Tesco!! "));
    }

    [Fact]
    public void NormalizeTokenSorted_IgnoresWordOrder()
    {
        Assert.Equal(
            TextNormalizer.NormalizeTokenSorted("Review CCTV at Riverside"),
            TextNormalizer.NormalizeTokenSorted("Riverside at CCTV Review"));
    }
}

using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>
/// حالة الفقرة التجهيزية (الشكل 50). Worked examples inline, no database (P-04).
/// </summary>
public class SupplyStatusTests
{
    [Theory]
    [InlineData(100, 100, 100, SupplyStatus.Received)]
    [InlineData(100, 80, 80, SupplyStatus.Partial)]
    [InlineData(100, 40, 0, SupplyStatus.Supplied)]
    [InlineData(100, 0, 0, SupplyStatus.Pending)]
    public void Reads_the_four_states(decimal contracted, decimal supplied, decimal received, string expected) =>
        Assert.Equal(expected, SupplyStatus.Of(contracted, supplied, received));

    /// <summary>
    /// A fully received line is `received`, not `supplied`, even though both
    /// tests pass. Reading them in the wrong order collapses four states to two.
    /// </summary>
    [Fact]
    public void Received_wins_over_supplied() =>
        Assert.Equal(SupplyStatus.Received, SupplyStatus.Of(50, 50, 50));

    /// <summary>
    /// An over-receipt still reads `received` — it is not a fifth state here.
    /// The excess is a distribution problem (BR-08), not a status one.
    /// </summary>
    [Fact]
    public void Over_receipt_is_still_received() =>
        Assert.Equal(SupplyStatus.Received, SupplyStatus.Of(50, 60, 60));

    /// <summary>
    /// An empty line is NOT complete. 0 ≥ 0 is true, so without the contracted
    /// guard a line with nothing on it would report as fully received.
    /// </summary>
    [Fact]
    public void Zero_contracted_is_pending_not_received() =>
        Assert.Equal(SupplyStatus.Pending, SupplyStatus.Of(0, 0, 0));

    [Fact]
    public void Received_pct_is_derived_and_safe_at_zero()
    {
        Assert.Equal(80m, SupplyStatus.ReceivedPct(100, 80));
        Assert.Equal(0m, SupplyStatus.ReceivedPct(0, 0));
    }

    [Fact]
    public void Remaining_never_goes_negative()
    {
        Assert.Equal(20m, SupplyStatus.Remaining(100, 80));
        Assert.Equal(0m, SupplyStatus.Remaining(100, 130));
    }
}

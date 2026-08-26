using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>الشكل 58 — beneficiary-level redistribution inside one supply item.</summary>
public class SupplyRedistributionTests
{
    /// <summary>الشكل 51's own allocation for ITM-002: البصرة 40 · الموصل 71.</summary>
    private static Dictionary<string, decimal> Itm002() => new()
    {
        ["ub"] = 40m,
        ["nu"] = 71m,
    };

    private static SupplyRedistribution.Transfer T(string from, string to, decimal qty)
        => new(from, to, qty);

    [Fact]
    public void Worked_example_the_plate_moves_twelve_and_ten_to_tal_afar()
    {
        // الشكل 58: من البصرة 12 · من الموصل 10 → تلعفر. صافي التغيير:
        // البصرة −12 · تلعفر +22 · الموصل −10.
        var transfers = new[] { T("ub", "cu", 12m), T("nu", "cu", 10m) };
        var nets = SupplyRedistribution.Nets(Itm002(), transfers);

        Assert.Null(SupplyRedistribution.Check(Itm002(), transfers));
        Assert.Equal(22m, nets.Single(n => n.Code == "cu").Delta);
        Assert.Equal(-12m, nets.Single(n => n.Code == "ub").Delta);
        Assert.Equal(-10m, nets.Single(n => n.Code == "nu").Delta);
    }

    [Fact]
    public void The_item_total_is_unchanged_which_is_the_point()
    {
        var transfers = new[] { T("ub", "cu", 12m), T("nu", "cu", 10m) };
        var nets = SupplyRedistribution.Nets(Itm002(), transfers);

        Assert.Equal(111m, nets.Sum(n => n.Before));
        Assert.Equal(111m, nets.Sum(n => n.After));
        Assert.Equal(0m, nets.Sum(n => n.Delta));
    }

    [Fact]
    public void The_contract_value_impact_is_zero_and_is_returned_not_assumed()
    {
        // الشكل 59: «قيمة العقد الحالية 416,160,000 مقابل 0 و416,160,000».
        Assert.Equal(0m, SupplyRedistribution.Impact(
            [T("ub", "cu", 12m), T("nu", "cu", 10m)]));
    }

    [Fact]
    public void A_beneficiary_that_only_receives_starts_from_nothing()
    {
        // جامعة تلعفر's case: it holds none of this item, and the order exists
        // precisely so that it should.
        var nets = SupplyRedistribution.Nets(Itm002(), [T("ub", "cu", 12m)]);
        var tal = nets.Single(n => n.Code == "cu");

        Assert.Equal(0m, tal.Before);
        Assert.Equal(12m, tal.After);
    }

    [Fact]
    public void A_source_cannot_give_more_than_it_holds()
    {
        var refusal = SupplyRedistribution.Check(Itm002(), [T("ub", "cu", 41m)]);

        Assert.NotNull(refusal);
        Assert.Contains("40", refusal!.MessageAr);
    }

    [Fact]
    public void Two_transfers_from_one_source_are_checked_TOGETHER()
    {
        // Each is under 40; together they are 60. Checking row by row would let
        // this through.
        var transfers = new[] { T("ub", "cu", 30m), T("ub", "tu", 30m) };

        Assert.Null(SupplyRedistribution.Check(Itm002(), [transfers[0]]));
        Assert.NotNull(SupplyRedistribution.Check(Itm002(), transfers));
    }

    [Fact]
    public void Available_falls_as_earlier_transfers_draw_on_the_same_source()
    {
        // الشكل 58 prints «المتاح» beside the row being edited, and it has to
        // account for the rows already above it.
        var alloc = Itm002();

        Assert.Equal(40m, SupplyRedistribution.Available("ub", alloc, []));
        Assert.Equal(28m, SupplyRedistribution.Available("ub", alloc, [T("ub", "cu", 12m)]));
        Assert.Equal(0m, SupplyRedistribution.Available("ub", alloc, [T("ub", "cu", 40m)]));
        // Never negative, whatever legacy data says.
        Assert.Equal(0m, SupplyRedistribution.Available("ub", alloc, [T("ub", "cu", 99m)]));
    }

    [Fact]
    public void A_transfer_to_its_own_source_is_refused()
    {
        // It moves nothing and hides a typo behind a no-op.
        Assert.NotNull(SupplyRedistribution.Check(Itm002(), [T("ub", "ub", 5m)]));
    }

    [Fact]
    public void A_transfer_needs_both_ends_and_a_positive_quantity()
    {
        Assert.NotNull(SupplyRedistribution.Check(Itm002(), [T("", "cu", 5m)]));
        Assert.NotNull(SupplyRedistribution.Check(Itm002(), [T("ub", "", 5m)]));
        Assert.NotNull(SupplyRedistribution.Check(Itm002(), [T("ub", "cu", 0m)]));
        // A negative transfer is the opposite transfer entered backwards, and
        // the form has a from/to pair for that.
        Assert.NotNull(SupplyRedistribution.Check(Itm002(), [T("ub", "cu", -5m)]));
    }

    [Fact]
    public void An_empty_set_is_refused_rather_than_applied_as_a_no_op()
    {
        Assert.NotNull(SupplyRedistribution.Check(Itm002(), []));
    }

    [Fact]
    public void The_chip_strip_puts_what_moved_first()
    {
        var alloc = new Dictionary<string, decimal>
        {
            ["ub"] = 40m, ["nu"] = 71m, ["tu"] = 65m,
        };
        var nets = SupplyRedistribution.Nets(alloc, [T("ub", "cu", 12m)]);

        // تلعفر +12 and البصرة −12 tie at 12 and sort by code; الكوفة and
        // الموصل moved nothing and come last.
        Assert.Equal(12m, Math.Abs(nets[0].Delta));
        Assert.Equal(12m, Math.Abs(nets[1].Delta));
        Assert.Equal(0m, nets[2].Delta);
        Assert.Equal(0m, nets[3].Delta);
    }
}

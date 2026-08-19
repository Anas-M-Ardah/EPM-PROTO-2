using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>المسار 11 · الأشكال 52–55 — the two receipts and their two ceilings.</summary>
public class SupplyReceiptsTests
{
    private static SupplyReceipts.Receipt W(decimal q) => new(SupplyReceipts.Warehouse, q, null);
    private static SupplyReceipts.Receipt P(decimal q, string ben) => new(SupplyReceipts.Preliminary, q, ben);

    [Fact]
    public void Worked_example_ITM_002_has_sixteen_still_owed()
    {
        // الشكل 50: المتعاقد 111 · الاستلام 95. الشكل 53 then prints
        // «المتبقي 16 جهاز» in the quantity field's own hint.
        var receipts = new[] { W(95m) };

        Assert.Equal(95m, SupplyReceipts.ReceivedInto(receipts));
        Assert.Equal(16m, SupplyReceipts.Remaining(SupplyReceipts.Warehouse, 111m, receipts));
    }

    [Fact]
    public void A_receipt_of_exactly_the_remainder_is_accepted_and_closes_the_line()
    {
        var receipts = new[] { W(95m) };

        Assert.Null(SupplyReceipts.Check(SupplyReceipts.Warehouse, 16m, null, 111m, receipts));
        Assert.Equal(111m, SupplyReceipts.ReceivedInto(receipts.Append(W(16m))));
    }

    [Fact]
    public void One_more_than_the_remainder_is_refused()
    {
        var refusal = SupplyReceipts.Check(SupplyReceipts.Warehouse, 17m, null, 111m, [W(95m)]);

        Assert.NotNull(refusal);
        Assert.Contains("16", refusal!.MessageAr);
    }

    [Fact]
    public void A_beneficiary_cannot_take_delivery_of_what_never_reached_the_store()
    {
        // 95 arrived, 76 already handed over → 19 available to hand on.
        var receipts = new SupplyReceipts.Receipt[] { W(95m), P(76m, "BEN-UOB") };

        Assert.Equal(19m, SupplyReceipts.Remaining(SupplyReceipts.Preliminary, 111m, receipts));
        Assert.Null(SupplyReceipts.Check(SupplyReceipts.Preliminary, 19m, "BEN-UOB", 111m, receipts));
        Assert.NotNull(SupplyReceipts.Check(SupplyReceipts.Preliminary, 20m, "BEN-UOB", 111m, receipts));
    }

    [Fact]
    public void The_two_kinds_count_against_different_ceilings()
    {
        // Nothing has arrived, so nothing can be handed over — even though 111
        // are still owed against the contract.
        var none = Array.Empty<SupplyReceipts.Receipt>();

        Assert.Equal(111m, SupplyReceipts.Remaining(SupplyReceipts.Warehouse, 111m, none));
        Assert.Equal(0m, SupplyReceipts.Remaining(SupplyReceipts.Preliminary, 111m, none));
        Assert.NotNull(SupplyReceipts.Check(SupplyReceipts.Preliminary, 1m, "BEN-UOB", 111m, none));
    }

    [Fact]
    public void A_preliminary_receipt_needs_a_receiving_party()
    {
        // الشكل 54 — «تُحمّل الجامعة المستلمة مسؤولية الكمية». A hand-over to
        // nobody is a quantity off the ministry's books with no owner.
        var receipts = new[] { W(95m) };

        Assert.NotNull(SupplyReceipts.Check(SupplyReceipts.Preliminary, 10m, null, 111m, receipts));
        Assert.NotNull(SupplyReceipts.Check(SupplyReceipts.Preliminary, 10m, "  ", 111m, receipts));
        Assert.Null(SupplyReceipts.Check(SupplyReceipts.Preliminary, 10m, "BEN-UOB", 111m, receipts));
    }

    [Fact]
    public void A_warehouse_receipt_needs_no_beneficiary()
    {
        // A store is not a beneficiary.
        Assert.Null(SupplyReceipts.Check(SupplyReceipts.Warehouse, 10m, null, 111m, []));
    }

    [Fact]
    public void What_one_beneficiary_has_taken_is_counted_per_beneficiary()
    {
        // الشكل 51's «المستلم» column: البصرة 34, الموصل 61.
        var receipts = new SupplyReceipts.Receipt[]
        {
            W(95m), P(34m, "BEN-BAS"), P(61m, "BEN-MOS"),
        };

        Assert.Equal(34m, SupplyReceipts.HandedOverTo(receipts, "BEN-BAS"));
        Assert.Equal(61m, SupplyReceipts.HandedOverTo(receipts, "BEN-MOS"));
        Assert.Equal(0m, SupplyReceipts.HandedOverTo(receipts, "BEN-KUF"));
        Assert.Equal(95m, SupplyReceipts.HandedOver(receipts));
    }

    [Fact]
    public void Zero_and_negative_quantities_are_refused()
    {
        Assert.NotNull(SupplyReceipts.Check(SupplyReceipts.Warehouse, 0m, null, 111m, []));
        Assert.NotNull(SupplyReceipts.Check(SupplyReceipts.Warehouse, -5m, null, 111m, []));
    }

    [Fact]
    public void An_unknown_kind_is_refused_before_any_quantity_is_looked_at()
    {
        Assert.NotNull(SupplyReceipts.Check("final", 1m, null, 111m, []));
        Assert.False(SupplyReceipts.IsKnownKind("final"));
    }

    [Fact]
    public void The_remaining_never_goes_negative()
    {
        // Legacy data can carry an over-receipt. It is not a licence to book a
        // negative one — the same floor `SupplyStatus.Remaining` keeps.
        Assert.Equal(0m, SupplyReceipts.Remaining(SupplyReceipts.Warehouse, 100m, [W(120m)]));
    }

    [Fact]
    public void The_receipt_number_is_the_one_the_plates_print()
    {
        // الشكل 53 · WR-0439-2-2 and الشكل 52 · PR-0439-… on PRJ-0439's item 2.
        Assert.Equal("WR-0439-2-2", SupplyReceipts.Number(SupplyReceipts.Warehouse, "PRJ-0439", 2, 2));
        Assert.Equal("PR-0439-6-1", SupplyReceipts.Number(SupplyReceipts.Preliminary, "PRJ-0439", 6, 1));
    }
}

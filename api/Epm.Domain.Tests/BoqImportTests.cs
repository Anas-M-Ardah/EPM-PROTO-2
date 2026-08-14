using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>
/// المسار 3 · الشكل 13 — «تحليل الملف والتحقق ثم مقارنته بالإصدار القائم».
///
/// The worked example is the fixture's own CNT-0279-EM bill (02 §1): two items,
/// 56,131,000 and 43,869,000, weights 56.13 / 43.87. It is used here so the
/// import cannot disagree with BR-01 about the contract every other test uses.
/// </summary>
public class BoqImportTests
{
    private static BoqImport.Candidate Row(
        int row, string code, decimal qty, decimal rate,
        string desc = "بند", string unit = "م³", string division = "D1")
        => new(row, code, desc, division, unit, qty, rate);

    // ── المسار 3 step 5 — «صحة الكميات والأسعار ومجموع الأوزان 100.00%» ──────

    [Fact]
    public void A_clean_two_line_bill_has_no_violations()
    {
        var v = BoqImport.Validate([
            Row(2, "BQ-001", 1_000m, 56_131m),
            Row(3, "BQ-002", 1_000m, 43_869m),
        ]);

        Assert.Empty(v);
    }

    [Fact]
    public void The_weights_of_a_validated_bill_sum_to_exactly_100()
    {
        // 02 §1's own example, arriving through the importer instead of the
        // register: the file is only accepted if BR-01 can weight it.
        var rows = new[]
        {
            Row(2, "BQ-001", 1m, 56_131_000m),
            Row(3, "BQ-002", 1m, 43_869_000m),
        };

        Assert.Empty(BoqImport.Validate(rows));

        var w = BoqWeights.ForContract(rows.Select(r => r.Amount).ToList());

        Assert.Equal(56.13m, w[0]);
        Assert.Equal(43.87m, w[1]);
        Assert.Equal(100.00m, w.Sum());
    }

    [Fact]
    public void An_empty_file_is_refused_and_says_so_about_the_file_not_a_row()
    {
        var v = BoqImport.Validate([]);

        Assert.Single(v);
        Assert.Equal(0, v[0].Row);
        Assert.Equal("", v[0].Field);
    }

    [Fact]
    public void An_unpriced_line_is_refused()
    {
        // «بنود غير مسعّرة» — المسار 3 raises an alert for it, and a zero-rate
        // line would carry no weight while diluting every other line's share.
        var v = BoqImport.Validate([Row(2, "BQ-001", 100m, 0m)]);

        Assert.Contains(v, x => x.Row == 2 && x.Field == "rate");
    }

    [Fact]
    public void A_zero_quantity_is_refused()
        => Assert.Contains(BoqImport.Validate([Row(2, "BQ-001", 0m, 1_000m)]),
            x => x.Row == 2 && x.Field == "qty");

    [Fact]
    public void Every_failing_cell_is_reported_not_only_the_first()
    {
        // A wizard that surfaces one error per attempt turns a spreadsheet fix
        // into a dozen round trips.
        var v = BoqImport.Validate([
            Row(2, "", 0m, 0m, desc: "", unit: ""),
        ]);

        // Five cells on row 2 — code · description · unit · qty · rate — AND the
        // file-level finding, because a bill whose only row is unpriced totals
        // zero and so has no weights to derive either.
        Assert.Equal(5, v.Count(x => x.Row == 2));
        Assert.Single(v, x => x.Row == 0);
    }

    [Fact]
    public void A_duplicate_code_is_reported_on_the_SECOND_row()
    {
        // The register is keyed by code inside a contract, so the second row
        // would overwrite the first rather than add to it.
        var v = BoqImport.Validate([
            Row(2, "BQ-001", 10m, 100m),
            Row(3, "bq-001", 20m, 100m),
        ]);

        var dup = Assert.Single(v);
        Assert.Equal(3, dup.Row);
        Assert.Equal("code", dup.Field);
    }

    // ── المسار 3 step 4 — «مقارنته بالإصدار القائم» ─────────────────────────

    private static readonly BoqImport.Existing[] Current =
    [
        new("BQ-001", "حفريات", 1_000m, 1_000m, 1_000_000m),
        new("BQ-002", "خرسانة", 500m, 2_000m, 1_000_000m),
    ];

    [Fact]
    public void An_untouched_line_is_unchanged_not_changed()
    {
        var c = BoqImport.Compare(Current, [
            Row(2, "BQ-001", 1_000m, 1_000m),
            Row(3, "BQ-002", 500m, 2_000m),
        ]);

        Assert.Equal(2, c.Unchanged);
        Assert.Equal(0, c.Changed);
        Assert.Equal(0m, c.Delta);
    }

    [Fact]
    public void A_moved_quantity_is_changed_and_carries_both_sides()
    {
        var c = BoqImport.Compare(Current, [
            Row(2, "BQ-001", 1_200m, 1_000m),
            Row(3, "BQ-002", 500m, 2_000m),
        ]);

        var line = Assert.Single(c.Lines, l => l.Change == BoqImport.Change.Changed);

        Assert.Equal(1_000m, line.BeforeQty);
        Assert.Equal(1_200m, line.AfterQty);
        Assert.Equal(1_000_000m, line.BeforeAmount);
        Assert.Equal(1_200_000m, line.AfterAmount);
        Assert.Equal(200_000m, c.Delta);
    }

    [Fact]
    public void A_line_missing_from_the_file_is_REMOVED_and_still_appears()
    {
        // The whole reason the comparison step exists: an import that silently
        // drops a priced item takes its links and its earned value with it.
        var c = BoqImport.Compare(Current, [Row(2, "BQ-001", 1_000m, 1_000m)]);

        var gone = Assert.Single(c.Lines, l => l.Change == BoqImport.Change.Removed);

        Assert.Equal("BQ-002", gone.Code);
        Assert.Equal(1_000_000m, gone.BeforeAmount);
        Assert.Equal(0m, gone.AfterAmount);
        Assert.Equal(-1_000_000m, c.Delta);
    }

    [Fact]
    public void A_new_code_is_ADDED_with_no_before_side()
    {
        var c = BoqImport.Compare(Current, [
            Row(2, "BQ-001", 1_000m, 1_000m),
            Row(3, "BQ-002", 500m, 2_000m),
            Row(4, "BQ-003", 10m, 500m),
        ]);

        var added = Assert.Single(c.Lines, l => l.Change == BoqImport.Change.Added);

        Assert.Null(added.BeforeQty);
        Assert.Equal(0m, added.BeforeAmount);
        Assert.Equal(5_000m, added.AfterAmount);
        Assert.Equal(5_000m, c.Delta);
    }

    [Fact]
    public void Comparing_against_an_empty_register_makes_every_line_added()
    {
        var c = BoqImport.Compare([], [Row(2, "BQ-001", 1m, 1m)]);

        Assert.Equal(1, c.Added);
        Assert.Equal(0m, c.BeforeTotal);
    }
}

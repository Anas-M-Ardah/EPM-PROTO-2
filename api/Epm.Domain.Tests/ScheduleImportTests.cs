using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>المسار 4 · الشكل 24 — the P6 import's validation and impact.</summary>
public class ScheduleImportTests
{
    private static ScheduleImport.Candidate C(
        int row, string id, string name = "نشاط",
        string blStart = "2026-01-01", string? blFinish = "2026-03-31",
        decimal cost = 1_000_000m, decimal? hours = 500m,
        bool milestone = false, string preds = "", string wbs = "1")
        => new(row, id, name, wbs, "الأعمال",
            blStart is null ? null : DateOnly.Parse(blStart),
            blFinish is null ? null : DateOnly.Parse(blFinish),
            cost, hours, milestone, preds);

    [Fact]
    public void A_clean_file_has_no_violations()
    {
        var v = ScheduleImport.Validate([
            C(1, "A1"),
            C(2, "A2", preds: "A1"),
        ], ScheduleImport.BasisCost);

        Assert.Empty(v);
    }

    [Fact]
    public void An_empty_file_is_refused_before_anything_else()
    {
        var v = ScheduleImport.Validate([], ScheduleImport.BasisCost);

        Assert.Single(v);
        Assert.Equal("file", v[0].Field);
    }

    [Fact]
    public void A_duplicate_activity_id_is_a_violation_on_the_second_row()
    {
        var v = ScheduleImport.Validate([C(1, "A1"), C(2, "A1")], ScheduleImport.BasisCost);

        Assert.Single(v);
        Assert.Equal(2, v[0].Row);
        Assert.Equal("activityId", v[0].Field);
    }

    [Fact]
    public void A_missing_baseline_is_refused()
    {
        // PlannedProgress can say nothing about it, so it would sit in the
        // schedule carrying cost and contributing zero planned percent.
        var v = ScheduleImport.Validate([C(1, "A1", blFinish: null)], ScheduleImport.BasisCost);

        Assert.Single(v);
        Assert.Equal("baseline", v[0].Field);
    }

    [Fact]
    public void A_baseline_that_finishes_before_it_starts_is_refused()
    {
        var v = ScheduleImport.Validate(
            [C(1, "A1", blStart: "2026-03-31", blFinish: "2026-01-01")], ScheduleImport.BasisCost);

        Assert.Single(v);
        Assert.Equal("baseline", v[0].Field);
    }

    [Fact]
    public void The_basis_is_checked_on_the_basis_actually_chosen()
    {
        var noHours = C(1, "A1", hours: 0m);

        Assert.Empty(ScheduleImport.Validate([noHours], ScheduleImport.BasisCost));
        Assert.Single(ScheduleImport.Validate([noHours], ScheduleImport.BasisManHours));
    }

    [Fact]
    public void A_milestone_needs_no_basis_and_still_needs_dates()
    {
        // 02 §2 — zero cost and zero hours by definition, out of every
        // denominator. Exempt from the basis check and from nothing else.
        Assert.Empty(ScheduleImport.Validate(
            [C(1, "M1", cost: 0m, hours: 0m, milestone: true)], ScheduleImport.BasisCost));

        var v = ScheduleImport.Validate(
            [C(1, "M1", cost: 0m, hours: 0m, milestone: true, blFinish: null)],
            ScheduleImport.BasisCost);
        Assert.Single(v);
        Assert.Equal("baseline", v[0].Field);
    }

    [Fact]
    public void A_predecessor_naming_nothing_in_the_file_is_a_violation()
    {
        var v = ScheduleImport.Validate([C(1, "A1", preds: "A9")], ScheduleImport.BasisCost);

        Assert.Single(v);
        Assert.Equal("predecessors", v[0].Field);
    }

    [Fact]
    public void Every_violation_is_reported_not_the_first()
    {
        // A wizard that stops at one makes a person re-upload once per row.
        var v = ScheduleImport.Validate([
            C(1, "A1", name: "", blFinish: null),
            C(2, "A1", cost: 0m),
        ], ScheduleImport.BasisCost);

        Assert.True(v.Count >= 4);
    }

    [Fact]
    public void Duration_counts_both_end_days()
    {
        // A one-day activity starts and finishes on the same date.
        Assert.Equal(1, C(1, "A1", blStart: "2026-01-01", blFinish: "2026-01-01").Duration);
        Assert.Equal(90, C(1, "A1", blStart: "2026-01-01", blFinish: "2026-03-31").Duration);
    }

    // ── the impact ───────────────────────────────────────────────────────

    [Fact]
    public void Worked_example_one_added_one_moved_one_removed_one_unchanged()
    {
        var current = new List<ScheduleImport.Existing>
        {
            new("A1", "التهيئة", new DateOnly(2026, 3, 31)),
            new("A2", "الحفر", new DateOnly(2026, 6, 30)),
            new("A3", "ملغى", new DateOnly(2026, 7, 31)),
        };

        var incoming = new List<ScheduleImport.Candidate>
        {
            C(1, "A1", blFinish: "2026-03-31"),                 // unchanged
            C(2, "A2", blFinish: "2026-07-20"),                 // moved +20
            C(3, "A4", blFinish: "2026-08-31"),                 // added
        };

        var im = ScheduleImport.Compare(incoming, current);

        Assert.Equal(1, im.Added);
        Assert.Equal(1, im.Removed);
        Assert.Equal(1, im.Moved);
        Assert.Equal(1, im.Unchanged);
        Assert.Equal(new DateOnly(2026, 7, 31), im.FinishBefore);
        Assert.Equal(new DateOnly(2026, 8, 31), im.FinishAfter);
        Assert.Equal(31, im.ContractFinishDelta);
    }

    [Fact]
    public void An_activity_that_disappears_is_named_not_only_counted()
    {
        // It carries BOQ links, progress and earned value; a file that simply
        // omits it would take them with it.
        var im = ScheduleImport.Compare(
            [C(1, "A1")],
            [new("A1", "أ", new DateOnly(2026, 3, 31)), new("A9", "المحذوف", new DateOnly(2026, 5, 1))]);

        var gone = im.Changes.Single(c => c.Kind == "removed");
        Assert.Equal("A9", gone.ActivityId);
        Assert.Equal("المحذوف", gone.Name);
    }

    [Fact]
    public void An_unchanged_activity_takes_no_row_in_the_change_list()
    {
        // The list is what MOVED. Printing 200 unchanged rows would bury the
        // three that did.
        var im = ScheduleImport.Compare(
            [C(1, "A1", blFinish: "2026-03-31")],
            [new("A1", "أ", new DateOnly(2026, 3, 31))]);

        Assert.Equal(1, im.Unchanged);
        Assert.Empty(im.Changes);
    }

    [Fact]
    public void The_changes_are_ordered_by_how_far_they_move()
    {
        var im = ScheduleImport.Compare(
            [C(1, "A1", blFinish: "2026-04-05"), C(2, "A2", blFinish: "2026-09-30")],
            [new("A1", "أ", new DateOnly(2026, 3, 31)), new("A2", "ب", new DateOnly(2026, 6, 30))]);

        Assert.Equal("A2", im.Changes[0].ActivityId);
        Assert.Equal(92, im.Changes[0].SlipDays);
    }

    [Fact]
    public void Importing_into_an_empty_schedule_adds_everything_and_moves_the_finish_nowhere()
    {
        // There is no finish to compare against, so the delta is zero rather
        // than the whole programme's length.
        var im = ScheduleImport.Compare([C(1, "A1"), C(2, "A2")], []);

        Assert.Equal(2, im.Added);
        Assert.Equal(0, im.Removed);
        Assert.Null(im.FinishBefore);
        Assert.Equal(0, im.ContractFinishDelta);
    }

    [Fact]
    public void Only_the_three_named_formats_and_two_bases_are_accepted()
    {
        Assert.True(ScheduleImport.IsKnownFormat("xer"));
        Assert.True(ScheduleImport.IsKnownFormat("p6xml"));
        Assert.True(ScheduleImport.IsKnownFormat("excel"));
        Assert.False(ScheduleImport.IsKnownFormat("mpp"));
        Assert.False(ScheduleImport.IsKnownFormat(null));

        Assert.True(ScheduleImport.IsKnownBasis("cost"));
        Assert.True(ScheduleImport.IsKnownBasis("manhours"));
        Assert.False(ScheduleImport.IsKnownBasis("duration"));
    }
}

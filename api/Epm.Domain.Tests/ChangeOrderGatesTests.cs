using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>BR-07 · 02 §7 — change-order validation gates.</summary>
public class ChangeOrderGatesTests
{
    private static ChangeOrderGates.Order Order(
        IReadOnlyList<ChangeOrderGates.Line>? lines = null,
        IReadOnlyList<ChangeOrderGates.Activity>? acts = null,
        bool supply = false)
        => new("CNT-0279-EM", lines ?? [], acts ?? [], supply);

    [Fact]
    public void Worked_example_decrease_30_against_remaining_10_is_blocked()
    {
        var issues = ChangeOrderGates.Validate(Order([
            new("BQ-002", "CNT-0279-EM", "dec", ContractedQty: 100m, ExecutedQty: 90m,
                ContractorDeltaQty: 30m, ReDeptDeltaQty: 30m),
        ]));

        Assert.Equal(2, issues.Count);   // one per proposal — they are checked separately
        Assert.All(issues, i => Assert.Equal("decrease-exceeds", i.Gate));
    }

    [Fact]
    public void Each_proposal_is_checked_separately()
    {
        // 02 §7: the RE department's decrease is valid, the contractor's is not.
        var issues = ChangeOrderGates.Validate(Order([
            new("BQ-002", "CNT-0279-EM", "dec", 100m, 90m,
                ContractorDeltaQty: 30m, ReDeptDeltaQty: 8m),
        ]));

        var only = Assert.Single(issues);
        Assert.Equal("decrease-exceeds", only.Gate);
        Assert.Contains("المقاول", only.MsgAr);
    }

    [Fact]
    public void A_decrease_sent_as_a_negative_delta_is_measured_as_a_magnitude()
    {
        // Live audit 2026-09-13 (T9.3): −45 against a remaining 38 was accepted,
        // because −45 > 38 is false. The sign a caller uses must not matter.
        var issues = ChangeOrderGates.Validate(Order([
            new("AUD-02", "CNT-0279-EM", "dec", ContractedQty: 50m, ExecutedQty: 12m,
                ContractorDeltaQty: -45m, ReDeptDeltaQty: -45m),
        ]));

        Assert.Equal(2, issues.Count);
        Assert.All(issues, i => Assert.Equal("decrease-exceeds", i.Gate));
    }

    [Fact]
    public void A_negative_decrease_within_the_remaining_quantity_still_passes()
        => Assert.Empty(ChangeOrderGates.Validate(Order([
            new("BQ-002", "CNT-0279-EM", "dec", 100m, 90m, -8m, -8m),
        ])));

    [Fact]
    public void A_decrease_within_the_remaining_quantity_passes()
        => Assert.Empty(ChangeOrderGates.Validate(Order([
            new("BQ-002", "CNT-0279-EM", "dec", 100m, 90m, 8m, 8m),
        ])));

    [Fact]
    public void An_empty_order_is_blocked()
    {
        var only = Assert.Single(ChangeOrderGates.Validate(Order()));
        Assert.Equal("empty", only.Gate);
    }

    [Fact]
    public void A_line_from_another_contract_is_blocked()
    {
        // D-12 — one order may never span two contracts.
        var issues = ChangeOrderGates.Validate(Order([
            new("BQ-101", "CNT-0279", "inc", 100m, 0m, 10m, 10m),
        ]));

        Assert.Contains(issues, i => i.Gate == "cross-contract" && i.Ref == "BQ-101");
    }

    [Fact]
    public void An_activity_from_another_contract_is_blocked()
    {
        var issues = ChangeOrderGates.Validate(Order(
            [new("BQ-002", "CNT-0279-EM", "inc", 100m, 0m, 10m, 10m)],
            [new("A5", "CNT-0279")]));

        Assert.Contains(issues, i => i.Gate == "cross-contract" && i.Ref == "A5");
    }

    [Fact]
    public void Redistribution_without_a_target_is_blocked()
    {
        var issues = ChangeOrderGates.Validate(Order([
            new("BQ-002", "CNT-0279-EM", "redist", 100m, 0m, 0m, 0m,
                TargetCode: null, Drawn: 10m, Distributed: 10m),
        ]));

        Assert.Contains(issues, i => i.Gate == "redist-no-target");
    }

    [Fact]
    public void Unbalanced_redistribution_is_blocked()
    {
        var issues = ChangeOrderGates.Validate(Order([
            new("BQ-002", "CNT-0279-EM", "redist", 100m, 0m, 0m, 0m,
                TargetCode: "BQ-004", Drawn: 10m, Distributed: 7m),
        ]));

        Assert.Contains(issues, i => i.Gate == "redist-unbalanced");
    }

    [Fact]
    public void A_balanced_redistribution_with_a_target_passes()
        => Assert.Empty(ChangeOrderGates.Validate(Order([
            new("BQ-002", "CNT-0279-EM", "redist", 100m, 0m, 0m, 0m,
                TargetCode: "BQ-004", Drawn: 10m, Distributed: 10m),
        ])));

    [Fact]
    public void A_clean_order_can_be_submitted()
        => Assert.True(ChangeOrderGates.CanSubmit(Order([
            new("BQ-002", "CNT-0279-EM", "inc", 100m, 40m, 30m, 30m),
        ])));

    // ── D-14 · 02 §5 — a supply order may not change a unit rate ─────────
    [Fact]
    public void A_rate_change_on_a_supply_order_is_refused()
    {
        var issues = ChangeOrderGates.Validate(Order([
            new("ITM-006", "CNT-0279-EM", "rate", 196m, 118m, 0m, 0m),
        ], supply: true));

        Assert.Contains(issues, i => i.Gate == "supply-no-rate");
    }

    [Fact]
    public void The_same_rate_change_is_fine_on_an_engineering_order()
        => Assert.DoesNotContain(ChangeOrderGates.Validate(Order([
            new("BQ-002", "CNT-0279-EM", "rate", 196m, 118m, 0m, 0m),
        ])), i => i.Gate == "supply-no-rate");
}

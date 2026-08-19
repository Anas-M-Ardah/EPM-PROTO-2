namespace Epm.Api.Domain;

/// <summary>
/// `04 §6` — what a change order did to ONE BOQ line or ONE activity, told at
/// the row rather than only in the contract tab.
///
/// rule: a row's mark is `applied` when every order touching it has been
///       applied, `pending` when none has, and `mixed` when both are true of
///       the same row. The effective figure counts APPLIED orders only; an
///       approved-but-unapplied one is a projection beside it, never folded in.
/// spec: 02 §9 · CLAUDE.md §5.2 «معتمد ≠ مطبَّق», rendered at the cell.
/// example: original 100 · VO-01 applied +30 · VO-02 approved +10
///          → effective 130, pending 140, state `mixed`, count 2.
///
/// ── WHY THIS IS A DOMAIN FILE AND NOT A PROJECTION ───────────────────────
/// Three pieces of arithmetic live here, and all three are rules:
///   1. WHICH ORDERS COUNT. Only applied ones move the effective figure. This
///      is the same rule `Domain/Amendments` applies at contract level, and
///      the two may not disagree about the same order.
///   2. THE RUNNING FIGURE. Several orders can hit one line, and each applies
///      to what the line stood at when it was applied — not to the original.
///      The chain IS the history, and each step records where it started.
///   3. PENDING CHAINS ONTO EFFECTIVE, CUMULATIVELY, exactly as
///      `Amendments.Projection` does at contract level: two approved orders
///      each adding 10 project to +20, not to +10 twice.
///
/// ── THE STATE IS NEVER COLOUR-ONLY ───────────────────────────────────────
/// The badge carries the COUNT as its label, and `mixed` adds a dot. A reader
/// who cannot tell green from amber still reads "2" and the tooltip that names
/// each order and its state (05 §7, CLAUDE.md §6).
/// </summary>
public static class AmendmentDisclosure
{
    public const string Applied = "applied";
    public const string Pending = "pending";
    public const string Mixed = "mixed";

    /// <summary>
    /// Empty when nothing touched the row — the caller sends no mark at all
    /// rather than a badge reading zero.
    /// </summary>
    public static string State(int total, int appliedCount) =>
        total <= 0 ? ""
        : appliedCount == total ? Applied
        : appliedCount == 0 ? Pending
        : Mixed;

    // ── the BOQ line ─────────────────────────────────────────────────────

    /// <param name="DeltaQty">Signed. A decrease is a negative delta, not a separate kind.</param>
    /// <param name="ExcessQty">
    /// The part of this order's increase that fell beyond the 20% threshold and
    /// was re-priced (BR-05). Zero on every order that stayed inside it.
    /// </param>
    public record Touch(
        string No,
        DateOnly? At,
        bool IsApplied,
        decimal DeltaQty,
        decimal DeltaValue,
        decimal ExcessQty,
        decimal? ExcessRate);

    /// <param name="QtyFrom">What the line stood at when this order reached it.</param>
    public record Step(
        string No,
        DateOnly? At,
        bool IsApplied,
        decimal QtyFrom,
        decimal QtyTo,
        decimal ValueFrom,
        decimal ValueTo,
        decimal ExcessQty,
        decimal? ExcessRate);

    /// <param name="PendingQty">
    /// Null when nothing is awaiting application. Null and "equal to effective"
    /// are different facts: one row has no projection, the other has one that
    /// happens to net to zero.
    /// </param>
    public record Result(
        int Count,
        int AppliedCount,
        int PendingCount,
        string State,
        decimal OriginalQty,
        decimal EffectiveQty,
        decimal? PendingQty,
        decimal OriginalValue,
        decimal EffectiveValue,
        decimal? PendingValue,
        IReadOnlyList<Step> Chain);

    public static Result For(
        decimal originalQty, decimal originalValue, IReadOnlyList<Touch> touches)
    {
        var chain = new List<Step>(touches.Count);

        // The applied pass first, in order, because each applied order moves
        // the figure the next one starts from.
        var qty = originalQty;
        var value = originalValue;
        foreach (var t in touches.Where(t => t.IsApplied))
        {
            var from = qty;
            var vFrom = value;
            qty += t.DeltaQty;
            value += t.DeltaValue;
            chain.Add(new Step(t.No, t.At, true, from, qty, vFrom, value, t.ExcessQty, t.ExcessRate));
        }

        // Then the projection: pending orders chain onto the effective figure
        // and onto each other, and change nothing above.
        decimal? pendingQty = null;
        decimal? pendingValue = null;
        var pQty = qty;
        var pValue = value;
        foreach (var t in touches.Where(t => !t.IsApplied))
        {
            var from = pQty;
            var vFrom = pValue;
            pQty += t.DeltaQty;
            pValue += t.DeltaValue;
            chain.Add(new Step(t.No, t.At, false, from, pQty, vFrom, pValue, t.ExcessQty, t.ExcessRate));
            pendingQty = pQty;
            pendingValue = pValue;
        }

        var appliedCount = touches.Count(t => t.IsApplied);

        return new Result(
            touches.Count, appliedCount, touches.Count - appliedCount,
            State(touches.Count, appliedCount),
            originalQty, qty, pendingQty,
            originalValue, value, pendingValue,
            chain);
    }

    // ── the activity ─────────────────────────────────────────────────────

    /// <param name="DeltaDays">
    /// Signed days added to the remaining duration. The finish moves by the same
    /// number — `03 §9` step 6 applies one delta to both, so deriving the finish
    /// here rather than carrying a second field keeps them from disagreeing.
    /// </param>
    public record ActivityTouch(string No, DateOnly? At, bool IsApplied, int DeltaDays);

    public record ActivityStep(
        string No,
        DateOnly? At,
        bool IsApplied,
        int RemainingFrom,
        int RemainingTo,
        DateOnly? FinishFrom,
        DateOnly? FinishTo);

    public record ActivityResult(
        int Count,
        int AppliedCount,
        int PendingCount,
        string State,
        int OriginalRemaining,
        int EffectiveRemaining,
        int? PendingRemaining,
        DateOnly? OriginalFinish,
        DateOnly? EffectiveFinish,
        DateOnly? PendingFinish,
        IReadOnlyList<ActivityStep> Chain);

    public static ActivityResult ForActivity(
        int originalRemaining, DateOnly? originalFinish, IReadOnlyList<ActivityTouch> touches)
    {
        var chain = new List<ActivityStep>(touches.Count);

        var rem = originalRemaining;
        var finish = originalFinish;
        foreach (var t in touches.Where(t => t.IsApplied))
        {
            var from = rem;
            var fFrom = finish;
            rem += t.DeltaDays;
            finish = finish?.AddDays(t.DeltaDays);
            chain.Add(new ActivityStep(t.No, t.At, true, from, rem, fFrom, finish));
        }

        int? pendingRem = null;
        DateOnly? pendingFinish = null;
        var pRem = rem;
        var pFinish = finish;
        foreach (var t in touches.Where(t => !t.IsApplied))
        {
            var from = pRem;
            var fFrom = pFinish;
            pRem += t.DeltaDays;
            pFinish = pFinish?.AddDays(t.DeltaDays);
            chain.Add(new ActivityStep(t.No, t.At, false, from, pRem, fFrom, pFinish));
            pendingRem = pRem;
            pendingFinish = pFinish;
        }

        var appliedCount = touches.Count(t => t.IsApplied);

        return new ActivityResult(
            touches.Count, appliedCount, touches.Count - appliedCount,
            State(touches.Count, appliedCount),
            originalRemaining, rem, pendingRem,
            originalFinish, finish, pendingFinish,
            chain);
    }
}

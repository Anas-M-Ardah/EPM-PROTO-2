namespace Epm.Api.Domain;

/// <summary>
/// المستخلص — the money on one payment certificate, and the two ceilings the
/// ministry may not spend past.
///
/// ── WHY THIS FILE EXISTS ─────────────────────────────────────────────────
/// Every figure below was written inline in `FinancialsEndpoints` and asserted
/// by nothing. `EP-FIN-03` disburses money against these rules, and a rule that
/// decides whether a payment may be released has to be readable on its own and
/// tested against the plates rather than against a fixture (CLAUDE.md §3.1, §4).
///
/// ── FOUR FIGURES PER CERTIFICATE ─────────────────────────────────────────
/// gross − retention − advance recovery = net. Retention held is a liability
/// the MINISTRY still owes; advance outstanding is one the CONTRACTOR still
/// owes. Collapsing them into a single "amount" is what makes either balance
/// impossible to find a year later.
///
/// ── PAID IS NOT CERTIFIED, ANYWHERE ──────────────────────────────────────
/// Disbursed, retention held and advance outstanding all count PAID
/// certificates only. A certificate that has been certified and not yet paid
/// has withheld nothing and recovered nothing — no money has moved for anything
/// to be held back from. `CNT-0279`'s third certificate is exactly that case,
/// and counting it would report retention the ministry is not yet holding and
/// advance the contractor has not yet repaid.
///
/// ── §15-2's TWO CEILINGS ─────────────────────────────────────────────────
/// «الصرف السنوي لا يتجاوز التخصيص السنوي، والمصروف التراكمي لا يتجاوز الكلفة
/// المعدلة». المسار 8 puts the check at step 4, before the file enters the
/// audit route; this build checks it there AND again at the disbursement desk,
/// because the first is a projection and the second is where money moves.
///
/// No clock and no database. Every input is an argument (D-06).
/// </summary>
public static class PaymentCertificate
{
    /// <summary>The certificate's net — what the contractor is actually paid.</summary>
    public static decimal Net(decimal gross, decimal retention, decimal advanceRecovery)
        => gross - retention - advanceRecovery;

    /// <summary>
    /// The three expense items partition the NET, not the gross (`Payment.cs`).
    /// Retention and advance recovery are withheld from the whole certificate,
    /// not from one cost item, which is why they are deducted before the split.
    ///
    /// The tolerance is one fils — the portions are entered by hand and a
    /// rounding of the third one must not refuse an otherwise correct split.
    /// </summary>
    public const decimal SplitTolerance = 0.01m;

    public static bool SplitMatches(decimal net, decimal award, decimal reserve, decimal supervision)
        => Math.Abs(award + reserve + supervision - net) <= SplitTolerance;

    /// <summary>
    /// The three columns of a payment that this file reads. A record rather
    /// than the entity, so `Epm.Domain.Tests` can state a case in one line and
    /// no test can reach a table.
    /// </summary>
    /// <param name="Kind">interim · advance · final · retention-release.</param>
    /// <param name="Status">pending · certified · paid.</param>
    public record Line(
        string Kind,
        string Status,
        decimal NetAmount,
        decimal RetentionAmount,
        decimal AdvanceRecovery,
        int? PaidYear = null);

    public const string Paid = "paid";
    public const string Certified = "certified";
    public const string Pending = "pending";

    /// <summary>المصروف التراكمي — Σ net of PAID certificates.</summary>
    public static decimal Disbursed(IEnumerable<Line> lines)
        => lines.Where(x => x.Status == Paid).Sum(x => x.NetAmount);

    /// <summary>المصادق عليه وغير المصروف — money owed, in neither balance.</summary>
    public static decimal CertifiedUnpaid(IEnumerable<Line> lines)
        => lines.Where(x => x.Status == Certified).Sum(x => x.NetAmount);

    /// <summary>مبلغ الأمانات — retention withheld by certificates that were PAID.</summary>
    public static decimal RetentionHeld(IEnumerable<Line> lines)
        => lines.Where(x => x.Status == Paid).Sum(x => x.RetentionAmount);

    /// <summary>
    /// السلفة القائمة — advances paid, less what PAID certificates have
    /// recovered. It is what the contractor still owes back, and it never goes
    /// below zero: over-recovery is a correction, not a debt owed the other way.
    /// </summary>
    public static decimal AdvanceOutstanding(IEnumerable<Line> lines)
    {
        var advanced = lines.Where(x => x.Kind == "advance" && x.Status == Paid).Sum(x => x.NetAmount);
        var recovered = lines.Where(x => x.Status == Paid).Sum(x => x.AdvanceRecovery);
        return Math.Max(0m, advanced - recovered);
    }

    /// <summary>مصروف السنة — Σ net of certificates PAID in that fiscal year.</summary>
    public static decimal SpentIn(IEnumerable<Line> lines, int year)
        => lines.Where(x => x.Status == Paid && x.PaidYear == year).Sum(x => x.NetAmount);

    // ── §15-2 ───────────────────────────────────────────────────────────────

    /// <summary>Which ceiling an amount breaches, or <c>null</c> when it clears both.</summary>
    /// <param name="Key">`allocation` or `revised-cost` — the i18n and 422 anchor.</param>
    /// <param name="Ceiling">The figure that may not be passed.</param>
    /// <param name="Would">What the total would become if the amount were released.</param>
    public record Breach(string Key, decimal Ceiling, decimal Would)
    {
        public decimal Excess => Would - Ceiling;
    }

    /// <summary>
    /// «الصرف السنوي لا يتجاوز التخصيص السنوي، والمصروف التراكمي لا يتجاوز
    /// الكلفة المعدلة» — both, in the order the document states them.
    ///
    /// A null ceiling is NOT a ceiling of zero: a project with no allocation
    /// recorded for the year, or no revised cost, has nothing to breach and
    /// this returns null for it (P-09). Refusing on an absent figure would
    /// block every project the finance directorate has not reached yet.
    /// </summary>
    public static Breach? Ceilings(
        decimal amount,
        decimal spentThisYear, decimal? annualAllocation,
        decimal spentToDate, decimal? revisedCost)
    {
        if (annualAllocation is { } alloc && spentThisYear + amount > alloc)
            return new Breach("allocation", alloc, spentThisYear + amount);

        if (revisedCost is { } revised && spentToDate + amount > revised)
            return new Breach("revised-cost", revised, spentToDate + amount);

        return null;
    }
}

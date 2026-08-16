namespace Epm.Api.Data.Entities;

/// <summary>
/// مرحلة تدقيق — one desk a certificate sits at on its way to disbursement
/// (الشكل 17).
///
/// This is the table `FinancialsEndpoints` said it did not have: the `sla` entry
/// in its `unavailable` list read «يتطلب تواريخ مراحل تدقيق المستخلص — لا تسجّلها
/// جداول الدفعات بعد» (P-56). It does now.
///
/// ── WHY THE STAGES ARE ROWS AND NOT COLUMNS ──────────────────────────────
/// الشكل 17 draws «بطاقة لكل مرحلة» and the appendix names two of them by way of
/// example — المهندس المقيم, الدائرة المالية — without claiming the list is
/// closed. A column pair per desk would fix the route in the schema and need a
/// migration the first time a ministry adds one; a row per stage lets the route
/// be data, which is what it is.
///
/// ── THE ARITHMETIC IS NOT HERE ───────────────────────────────────────────
/// How long a stage has taken and whether it is late is BR-12
/// (`Domain/SlaLeadTime`), measured against the project's DATA DATE and never a
/// clock (D-06). This table records four facts and derives nothing: which desk,
/// its cap, when it received the file, and when it let it go.
/// </summary>
public class PaymentAuditStage
{
    public int Id { get; set; }

    /// <summary>→ Payment.Id</summary>
    public int PaymentId { get; set; }

    /// <summary>Order along the route, 1-based. The card grid reads it.</summary>
    public int No { get; set; }

    /// <summary>Lookup `audit-stage`: resident-engineer · finance · audit · disbursement.</summary>
    public string StageKey { get; set; } = "";

    /// <summary>«الجهة» — the desk the file is with, as the card prints it.</summary>
    public string PartyAr { get; set; } = "";
    public string PartyEn { get; set; } = "";

    /// <summary>
    /// «السقف» — the days this desk is allowed. Recorded PER STAGE rather than
    /// taken from `SlaLeadTime.SlaDaysPerStage`: the plate shows 7 where D-03
    /// assumes 5, and a cap that varies by desk is the kind of thing an
    /// instruction changes without changing the code.
    /// </summary>
    public int CapDays { get; set; }

    /// <summary>When this desk received the file. Null means it has not yet.</summary>
    public DateOnly? StartedAt { get; set; }

    /// <summary>When it let it go. Null while the file is still there.</summary>
    public DateOnly? FinishedAt { get; set; }
}

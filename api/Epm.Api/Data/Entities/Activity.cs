namespace Epm.Api.Data.Entities;

/// <summary>
/// Spec 01 §2.5. A Primavera P6 activity. FLAT — no navigation properties.
///
/// THE WBS IS A PATH STRING, not a table. WbsPath = "1.2.3" and WbsNames =
/// "المبنى أ / الإنشائي / الأعمدة". Build the tree in memory by splitting on '.'
/// and '/'. A self-referencing table bought nothing here — the tree is only ever
/// rendered whole, from one contract's activities.
///
/// DERIVED — never stored (02 §2):
///   absolute / relative weight, on the cost OR man-hours basis.
/// Basis is chosen at schedule import; the UI keeps a toggle.
/// Milestones (zero duration, zero cost) get weight 0 and are EXCLUDED from allocation.
///
/// ── REGISTERED BY PHASE 4.2, COMPLETED BY 4.3 ────────────────────────────
/// The BOQ tab needed activities before the Schedule tab existed: BR-03 drives
/// the allocation share off the activity's ABSOLUTE WEIGHT, and BR-04 reads its
/// PROGRESS to give a BOQ line its executed %. So 4.2 registered the table with
/// only those columns. Phase 4.3 restored the rest below — the dates, the
/// durations, the float, the calendar and the predecessors that make a Gantt.
/// </summary>
public class Activity
{
    public int Id { get; set; }

    /// <summary>The Primavera ID, e.g. "A5". Unique within the contract (checked in code, not indexed).</summary>
    public string ActivityId { get; set; } = "";

    /// <summary>→ Contract.Id. REQUIRED. Contract scoping is an invariant (01 §1).</summary>
    public string ContractId { get; set; } = "";

    public string NameAr { get; set; } = "";
    public string NameEn { get; set; } = "";

    /// <summary>Dotted WBS path, e.g. "1.2.3". Empty for an unclassified activity.</summary>
    public string WbsPath { get; set; } = "";

    /// <summary>Slash-separated node names matching WbsPath, for rendering the tree without a lookup.</summary>
    public string WbsNames { get; set; } = "";

    /// <summary>Reported against the activity. BR-04 reflects it onto the BOQ line.</summary>
    public decimal ProgressPct { get; set; }

    // ---- THE BASELINE (Phase 4.3) ----
    // The contractual reference. It is what the delay penalty is measured
    // against (BR-10) and an applied change order does NOT move it — the
    // extension moves the contractual finish in the contract amendment
    // instead. That is why baseline and current are separate columns.
    public DateOnly? BaselineStart { get; set; }
    public DateOnly? BaselineFinish { get; set; }

    /// <summary>Set once the activity has actually started. Null while ProgressPct is 0.</summary>
    public DateOnly? ActualStart { get; set; }
    /// <summary>Set only when the activity is COMPLETE. Null at 99%.</summary>
    public DateOnly? ActualFinish { get; set; }
    /// <summary>Where the activity is currently expected to finish. Drives the bar and the slip.</summary>
    public DateOnly? ForecastFinish { get; set; }

    public int OriginalDuration { get; set; }
    /// <summary>What is left. Derived in practice, but P6 exports it, so it is stored as imported.</summary>
    public int RemainingDuration { get; set; }

    /// <summary>
    /// Days of slack. ZERO IS THE CRITICAL PATH — and `IsCritical` says so
    /// explicitly rather than making every reader re-derive it from this.
    /// </summary>
    public decimal TotalFloat { get; set; }

    /// <summary>
    /// A PATH PROPERTY, not a status (01 §2.5). Rendered as a 2px `--on-surface`
    /// RING, never as a colour (04 §5) — the colour channel belongs to status.
    /// </summary>
    public bool IsCritical { get; set; }

    /// <summary>The P6 calendar name, e.g. "6 أيام/أسبوع". Shown on the activity record.</summary>
    public string Calendar { get; set; } = "";

    /// <summary>
    /// Comma-separated P6 predecessor activity IDs. Prototype-grade: a relation
    /// table would buy nothing while nothing draws the arrows (04 §5 does not
    /// ask for them, and the reference does not draw them either).
    /// </summary>
    public string Predecessors { get; set; } = "";

    // ---- THE WEIGHT BASIS — imported from P6 (01 §2.5) ----
    public decimal BudgetedCost { get; set; }
    /// <summary>May be absent in the P6 file; the basis toggle then falls back to cost.</summary>
    public decimal? BudgetedManHours { get; set; }

    /// <summary>Lookup "activity-status": notstarted · inprogress · ahead · delayed · completed (06 §9).</summary>
    public string Status { get; set; } = "notstarted";

    /// <summary>True for zero-duration milestones — excluded from allocation (02 §2).</summary>
    public bool IsMilestone { get; set; }
}

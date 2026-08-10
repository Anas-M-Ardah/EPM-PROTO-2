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
/// IsCritical is a PATH PROPERTY, not a status (01 §2.5). It renders as a 2px
/// ring, never as a colour (04 §5) — the colour channel belongs to status.
/// </summary>
public class Activity
{
    public int Id { get; set; }

    /// <summary>The Primavera ID, e.g. "A1050". Unique within the contract (checked in code, not indexed).</summary>
    public string ActivityId { get; set; } = "";

    /// <summary>→ Contract.Id. REQUIRED. Contract scoping is an invariant (01 §1).</summary>
    public string ContractId { get; set; } = "";

    public string NameAr { get; set; } = "";
    public string NameEn { get; set; } = "";

    /// <summary>Dotted WBS path, e.g. "1.2.3". Empty for an unclassified activity.</summary>
    public string WbsPath { get; set; } = "";

    /// <summary>Slash-separated node names matching WbsPath, for rendering the tree without a lookup.</summary>
    public string WbsNames { get; set; } = "";

    public DateOnly? BaselineStart { get; set; }
    public DateOnly? BaselineFinish { get; set; }
    public DateOnly? ActualStart { get; set; }
    public DateOnly? ActualFinish { get; set; }
    public DateOnly? ForecastFinish { get; set; }

    public int OriginalDuration { get; set; }
    public int RemainingDuration { get; set; }

    public decimal ProgressPct { get; set; }

    // ---- THE WEIGHT BASIS — imported from P6 (01 §2.5) ----
    public decimal BudgetedCost { get; set; }
    /// <summary>May be absent in the P6 file; the basis toggle then falls back to cost.</summary>
    public decimal? BudgetedManHours { get; set; }

    public decimal TotalFloat { get; set; }
    /// <summary>A path property. Rendered as a ring, never a colour (04 §5).</summary>
    public bool IsCritical { get; set; }

    public string Calendar { get; set; } = "";

    /// <summary>Lookup "activity-status": notstarted · inprogress · ahead · delayed · completed (06 §9).</summary>
    public string Status { get; set; } = "notstarted";

    /// <summary>Comma-separated P6 predecessor activity IDs. Prototype-grade; not a relation table.</summary>
    public string Predecessors { get; set; } = "";

    /// <summary>True for zero-duration milestones — excluded from allocation (02 §2).</summary>
    public bool IsMilestone { get; set; }
}

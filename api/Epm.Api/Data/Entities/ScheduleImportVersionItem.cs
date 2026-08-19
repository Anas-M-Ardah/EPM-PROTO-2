namespace Epm.Api.Data.Entities;

/// <summary>
/// One activity inside a submitted schedule version — المسار 4 · الشكل 24.
///
/// THE FILE AS IT ARRIVED, not the schedule it would become. The columns are
/// the ones `Activities` needs to be built from, and no more: an approval
/// writes `Activities` rows from these, and everything else on an activity —
/// progress, actual dates, float, criticality — is EXECUTION and belongs to the
/// schedule in force, never to an import (`02 §2`, `03 §9`).
///
/// FLAT: `db.ScheduleImportVersionItems.Where(i => i.VersionId == id)`.
/// </summary>
public class ScheduleImportVersionItem
{
    public int Id { get; set; }

    /// <summary>→ ScheduleImportVersion.Id</summary>
    public int VersionId { get; set; }

    /// <summary>The P6 activity id. Unique within the file (checked in Domain/ScheduleImport).</summary>
    public string ActivityId { get; set; } = "";

    public string Name { get; set; } = "";

    /// <summary>Dotted path and slash-separated names, as `01 §2.5` stores them.</summary>
    public string WbsPath { get; set; } = "";
    public string WbsNames { get; set; } = "";

    public DateOnly? BaselineStart { get; set; }
    public DateOnly? BaselineFinish { get; set; }

    /// <summary>Baseline duration in days, both end days counted.</summary>
    public int Duration { get; set; }

    // ── BR-02's two bases, both carried whatever the version chose ───────
    //
    // The file usually holds both, and storing only the chosen one would mean a
    // version could never be re-read on the other basis — which is exactly the
    // comparison `02 §2` says a person should be able to make.

    public decimal BudgetedCost { get; set; }
    public decimal? BudgetedManHours { get; set; }

    /// <summary>02 §2 — zero basis, out of every denominator.</summary>
    public bool IsMilestone { get; set; }

    /// <summary>Comma-separated activity ids, as P6 exports them.</summary>
    public string Predecessors { get; set; } = "";
}

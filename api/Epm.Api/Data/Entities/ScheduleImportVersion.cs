namespace Epm.Api.Data.Entities;

/// <summary>
/// إصدار جدول زمني مستورد — المسار 4 · الشكل 24.
///
/// The schedule's counterpart to `BoqImportVersion`, and it exists for a
/// stronger reason than the bill's. `Activities.BaselineStart` and
/// `BaselineFinish` are what EVERY slip, float and planned percentage in the
/// system is measured from — SCR-E5's delay, SCR-W5's slip column, SCR-W6's
/// «المخطط حتى تاريخه», BR-10's penalty baseline and BR-11's SPI all read them.
/// An import that replaced them in place would move the meaning of «الانزياح»
/// on six screens at once, silently.
///
/// So a submission writes a VERSION and touches `Activities` not at all.
/// Approving one is a separate act with its own capacity, exactly as
/// `EP-BOQ-13` is to `EP-BOQ-11`.
///
/// FLAT: `db.ScheduleImportVersionItems.Where(i => i.VersionId == v.Id)` IS the
/// relationship.
/// </summary>
public class ScheduleImportVersion
{
    public int Id { get; set; }

    /// <summary>→ Contract.Id. A schedule belongs to exactly one contract (01 §1).</summary>
    public string ContractId { get; set; } = "";

    /// <summary>Sequential within the contract. «الإصدار رقم N».</summary>
    public int No { get; set; }

    /// <summary>Lookup `import-state`: submitted · approved · superseded.</summary>
    public string State { get; set; } = "submitted";

    /// <summary>xer · p6xml · excel — الشكل 24's own three options.</summary>
    public string Format { get; set; } = "xer";

    /// <summary>
    /// `cost` or `manhours` — BR-02's weight basis, and `02 §2` puts the choice
    /// HERE, at import, which is the one place this build had no record of it.
    /// The register's own note (P-48) says the basis is chosen at import and
    /// that nothing stored it; this column is what stores it.
    /// </summary>
    public string Basis { get; set; } = "cost";

    // ── who submitted, and who approved ──────────────────────────────────

    public string ActorId { get; set; } = "";
    public string ActorName { get; set; } = "";
    public string ActorRole { get; set; } = "";
    public string ActorParty { get; set; } = "";
    public DateOnly At { get; set; }

    /// <summary>Empty until approved. The two are never one person (see EP-SCD-06).</summary>
    public string ApproverId { get; set; } = "";
    public string ApproverName { get; set; } = "";
    public string ApproverRole { get; set; } = "";
    public string ApproverParty { get; set; } = "";
    public DateOnly? ApprovedAt { get; set; }

    // ── what arrived ─────────────────────────────────────────────────────

    public string FileName { get; set; } = "";
    public long FileSizeBytes { get; set; }

    public int ActivityCount { get; set; }

    /// <summary>Σ budgeted cost of the incoming activities. The bill of the schedule.</summary>
    public decimal TotalCost { get; set; }

    /// <summary>
    /// The latest baseline finish IN THE FILE, and the one in force when it was
    /// submitted. Stored rather than re-derived because the schedule in force
    /// moves, and a version's own impact statement must not change under it.
    /// </summary>
    public DateOnly? FinishBefore { get; set; }
    public DateOnly? FinishAfter { get; set; }

    /// <summary>After − before, in days. Signed. See `Domain/ScheduleImport.Impact`.</summary>
    public int ContractFinishDelta { get; set; }

    public int Added { get; set; }
    public int Removed { get; set; }
    public int Moved { get; set; }
}

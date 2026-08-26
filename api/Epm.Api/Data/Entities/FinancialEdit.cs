namespace Epm.Api.Data.Entities;

/// <summary>
/// ملحق الشكل 19 — one recorded change to a project's financial data,
/// «بقيمته قبل وبعد».
///
/// ── WHY A TABLE OF ITS OWN ────────────────────────────────────────────────
/// الشكل 19 logs four kinds of financial event. Three were already derivable:
/// a payment is a `Payments` row, an approved change order is a
/// `ContractAmendments` row, and an allocation is a `ProjectAllocations` row.
/// The fourth — «تعديل كلفة أو تخصيص» — was not, because nothing anywhere kept
/// the value a figure held BEFORE it was edited (P-179).
///
/// `ProjectActivityEvent` is the wrong home and says so itself: it records THAT
/// the definition was edited, has no before/after pair, and its own comment
/// states it is not an audit framework. Widening it to carry field-level
/// history would make one table answer two questions.
///
/// ── APPEND ONLY ───────────────────────────────────────────────────────────
/// Written by `EP-FIN-04`, one row per CHANGED field, and never updated or
/// deleted. Non-negotiable #6: original values are never overwritten — here
/// they are the record.
///
/// FLAT, like everything else: `ProjectId` is a plain column, and
/// `db.FinancialEdits.Where(e => e.ProjectId == id)` IS the relationship.
/// </summary>
public class FinancialEdit
{
    public int Id { get; set; }

    /// <summary>→ Project.Id</summary>
    public string ProjectId { get; set; } = "";

    /// <summary>
    /// The DTO member name the edit moved — `approvedCost` · `revisedCost` ·
    /// `annualAllocation` · `transferState`. The same string the Angular field
    /// carries as its `key`, so one grep crosses the language boundary and the
    /// log's label is looked up rather than stored.
    /// </summary>
    public string Field { get; set; } = "";

    /// <summary>
    /// The fiscal year an allocation edit belongs to; null on a project-level
    /// figure. الشكل 19 filters by year and an allocation edit belongs to the
    /// year it moved, not only to the year it was made in.
    /// </summary>
    public int? Year { get; set; }

    /// <summary>
    /// The values as strings — money, a percentage and a lookup code all pass
    /// through this table and only the reading screen knows how to format each.
    /// Empty means the figure was unset, which is not the same as zero (P-09).
    /// </summary>
    public string BeforeValue { get; set; } = "";
    public string AfterValue { get; set; } = "";

    /// <summary>§7's four attribution facts, captured at the moment of the edit.</summary>
    public string ActorId { get; set; } = "";

    /// <summary>اسم منفّذها — copied, not joined.</summary>
    public string ActorName { get; set; } = "";

    /// <summary>صفته — the persona's role at the time.</summary>
    public string ActorRole { get; set; } = "";

    /// <summary>جهته — the persona's party.</summary>
    public string ActorParty { get; set; } = "";

    /// <summary>The project's DATA DATE when the edit was made, never the clock (D-06).</summary>
    public DateOnly At { get; set; }
}

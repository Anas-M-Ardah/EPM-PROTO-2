namespace Epm.Api.Data.Entities;

/// <summary>
/// المسار 7 — إغلاق فترة الإنجاز (`docs/WORKFLOW-TRACKS.md:322-360`). One row
/// per project per closed-or-open reporting period.
///
/// ── NOT `ProgressPeriodDto` ───────────────────────────────────────────────
/// That is Domain/ComparisonPeriod's read-only «مقارنة مع القراءة السابقة»
/// selector — a UI reference computed from `ContractActivityEvent` history,
/// never a real period. This is the real thing: a period a user explicitly
/// closes, whose figures are then frozen and never recomputed.
///
/// ── PROJECT-SCOPED, NOT PER-CONTRACT ──────────────────────────────────────
/// Track 7's own script ends step 7 on «تحديث تاريخ البيانات» — singular, and
/// `Project.DataDate` is project-scoped, not per-contract. `ProgressReading`
/// stays per-contract/per-activity underneath; this is the project-level
/// aggregation the track closes over all of them at once.
///
/// ── THE SNAPSHOT IS A DELIBERATE EXCEPTION TO "NEVER STORE A DERIVED VALUE"
/// `CLAUDE.md §3.5` is right for every screen that keeps reading live — this
/// one is the opposite by design: Track 7 step 2 is «تثبيت القيم» (FIX the
/// values), and step 5 converts the period into «سجل مقفل غير قابل للتحرير».
/// `ContractAmendment.Value/Finish/DurationDays` freezes the same way at
/// apply time (BR-09) — the precedent this follows.
/// </summary>
public class AccomplishmentPeriod
{
    public int Id { get; set; }

    public string ProjectId { get; set; } = "";

    /// <summary>1, 2, 3… sequential per project. «الفترة رقم N».</summary>
    public int PeriodNo { get; set; }

    public DateOnly OpenedOn { get; set; }

    /// <summary>Null while open.</summary>
    public DateOnly? ClosedOn { get; set; }

    /// <summary>open · closed.</summary>
    public string Status { get; set; } = "open";

    // ── the snapshot — null while open, frozen at close ────────────────────
    public decimal? PhysicalPct { get; set; }
    public decimal? FinancialPct { get; set; }
    public decimal? Cpi { get; set; }
    public decimal? Spi { get; set; }
    public decimal? Eac { get; set; }
    public decimal? Vac { get; set; }

    public string ClosedByUserId { get; set; } = "";
    public string ClosedByParty { get; set; } = "";
}

namespace Epm.Api.Data.Entities;

/// <summary>
/// إصدار النموذج — SCR-W10 · **ملحق الشكل 44**'s version selector
/// («الحالي · 01-06-2026»).
///
/// ── WHY A TABLE AND NOT A COLUMN ─────────────────────────────────────────
/// The plate explains what the versions are for in its own closing note:
/// *«يعزز تعدد إصدارات النموذج ضبط تغييرات التصميم المرتبطة بالأوامر
/// التغييرية»*. A design change arrives with a change order and the model is
/// re-issued; the earlier issue stays readable. That is the same rule
/// <see cref="DocumentRevision"/> carries for drawings — a new issue is
/// INSERTED, and nothing is replaced in place.
///
/// ── WHAT IS NOT HERE ─────────────────────────────────────────────────────
/// No geometry, and no per-version element set. Elements belong to the
/// project, not to a version: rendering «what the model looked like at m2»
/// needs the viewer that `07 §8` puts out of Phase 1. The selector reads the
/// list and says which one is current; picking an older one is not built, and
/// the screen says so rather than silently showing today's elements under
/// yesterday's label (P-120).
/// </summary>
public class ModelVersion
{
    public int Id { get; set; }

    public string ProjectId { get; set; } = "";

    /// <summary>m1 · m2 · m3 — oldest to newest.</summary>
    public string Code { get; set; } = "";

    public string LabelAr { get; set; } = "";
    public string LabelEn { get; set; } = "";

    /// <summary>«01-06-2026» beside the selector.</summary>
    public DateOnly? IssuedOn { get; set; }

    /// <summary>Who issued it. Free text — this prototype has no CAD identity.</summary>
    public string By { get; set; } = "";

    /// <summary>
    /// «الحالي». One per project — the endpoint states the invariant rather
    /// than a schema constraint doing it silently (CLAUDE.md §3.4).
    /// </summary>
    public bool IsCurrent { get; set; }
}

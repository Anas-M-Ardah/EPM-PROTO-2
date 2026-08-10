namespace Epm.Api.Data.Entities;

/// <summary>
/// Spec 01 §2.7, 02 §3. BOQ ↔ Activity is MANY-TO-MANY: one BOQ item may be
/// delivered by several activities, one activity may deliver several BOQ items.
///
/// Unique on (BoqItemId, ActivityId) — see EpmDb.
///
/// The user NEVER types an allocation percentage. SharePct is computed from the
/// activity's absolute weight (BR-03) and only PERSISTED here once a user
/// manually overrides it — IsManual then flags the row and a reset restores the
/// computed value. When IsManual is false, treat SharePct as a cache and
/// recompute from Domain/Allocation.cs.
/// </summary>
public class BoqActivityLink
{
    public int Id { get; set; }

    public int BoqItemId { get; set; }

    public int ActivityId { get; set; }

    /// <summary>Auto from the activity's absolute weight; manually overridable and saved.</summary>
    public decimal SharePct { get; set; }

    /// <summary>True once a user has overridden the computed share (02 §3).</summary>
    public bool IsManual { get; set; }
}

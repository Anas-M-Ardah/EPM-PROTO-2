namespace Epm.Api.Data.Entities;

/// <summary>
/// سجل النشاط — the project's activity log (الشكل 5's second tab, shown there
/// with six events).
///
/// ── WHAT IT IS NOW ────────────────────────────────────────────────────────
/// A record of EDITS: who created the definition and who has changed it since.
/// It is required independently of any approval track — الشكل 5 gives it a tab,
/// and المسار 1's summary row asks for «سجل نشاط بالتعديلات» in as many words.
/// So it survived the removal of the draft/review workflow.
///
/// It once carried `submitted` / `returned` / `approved` and a return comment.
/// Those are gone with the workflow (client decision): a project is saved
/// directly and there is no review to record.
///
/// ── IT IS NOT AN AUDIT FRAMEWORK ──────────────────────────────────────────
/// One flat table, appended by the two write endpoints and read by one. §7 asks
/// that every edit be attributable — «باسم منفّذها وصفته وجهته وتاريخها» — and
/// that is exactly the four columns below, no more.
/// `Data/Entities/AuditEvent.cs` remains the unregistered starting point if a
/// general audit substrate is ever wanted.
///
/// FLAT, like everything else: ProjectId is a plain column, and
/// `db.ProjectActivityEvents.Where(e => e.ProjectId == id)` IS the relationship.
/// </summary>
public class ProjectActivityEvent
{
    public int Id { get; set; }

    /// <summary>→ Project.Id</summary>
    public string ProjectId { get; set; } = "";

    /// <summary>
    /// created · updated. Labelled client-side from `lang.ts` — these are verbs,
    /// not business value lists, so they are NOT in the Lookups table (06).
    /// </summary>
    public string Action { get; set; } = "";

    /// <summary>§7's four attribution facts, captured at the moment of the edit.</summary>
    public string ActorId { get; set; } = "";

    /// <summary>اسم منفّذها — copied, not joined: a persona list can change and the record may not.</summary>
    public string ActorName { get; set; } = "";

    /// <summary>صفته — the persona's role at the time.</summary>
    public string ActorRole { get; set; } = "";

    /// <summary>جهته — the persona's party.</summary>
    public string ActorParty { get; set; } = "";

    public DateOnly At { get; set; }
}

namespace Epm.Api.Data.Entities;

/// <summary>
/// قراءة إنجاز نشاط — المسار 6 «تحديث الإنجاز واعتماده».
///
/// ── WHY THIS TABLE EXISTS ────────────────────────────────────────────────
/// `Activity.ProgressPct` is the reading IN FORCE. It used to be what a person
/// typed: `EP-PRG-02` wrote it straight through, which made steps 5, 6 and 7 of
/// the track — «حفظ التحديث وإرساله للمراجعة» → «قرار المراجعة» → «اعتماد
/// القراءة» — one keystroke with nobody's signature on it. المسار 6 draws two
/// lanes either side of that decision, and `03 §7` asks in as many words that
/// «يُفصل صراحةً بين صلاحية الإدخال وصلاحية الاعتماد».
///
/// So a submission writes a READING and touches `Activities` not at all.
/// Approving one is a separate act with its own capacity — exactly what
/// `ScheduleImportVersion` is to `Activities.BaselineStart`, and this table is
/// deliberately shaped like it so the two review flows read the same way.
///
/// ── WHY IT IS NOT A COLUMN ON `Activity` ─────────────────────────────────
/// A reading carries a submitter, a reviewer, a note either way, a date on each
/// side and its own evidence rows. Five of those are null while nothing is
/// pending, and the sixth — «القراءة السابقة» — has to survive the approval
/// that replaces it (step 6أ: «إعادة بملاحظات — القراءة السابقة محفوظة»).
///
/// ── ONE PENDING PER ACTIVITY ─────────────────────────────────────────────
/// Not one per contract, which is `EP-SCD-05`'s rule: a baseline is one
/// document for the whole schedule, while a reading is one activity's own and
/// four departments may have four in review at once. Submitting a second on the
/// SAME activity lapses the first — the correction of a typo before anyone has
/// looked at it, and the same resolution EP-SCD-05 makes for the same reason.
///
/// FLAT: `db.ProgressReadings.Where(r => r.ContractId == id)` IS the
/// relationship, and `db.ProgressReadingEvidence.Where(e => e.ReadingId == r.Id)`
/// is the other one.
/// </summary>
public class ProgressReading
{
    public int Id { get; set; }

    /// <summary>→ Contract.Id. An activity belongs to exactly one contract (01 §1).</summary>
    public string ContractId { get; set; } = "";

    /// <summary>
    /// → Activity.ActivityId, the Primavera id — NOT `Activity.Id`.
    ///
    /// The surrogate key would be the tighter join, and it is the wrong one
    /// here: `EP-SCD-06` upserts activities BY `ActivityId` on a re-baseline,
    /// and a reading has to survive that the way progress itself does. The pair
    /// (ContractId, ActivityId) is the identity every other endpoint addresses
    /// an activity by, and it is what this table stores.
    /// </summary>
    public string ActivityId { get; set; } = "";

    /// <summary>Sequential within the contract. «القراءة رقم N».</summary>
    public int No { get; set; }

    /// <summary>
    /// Lookup `progress-reading-state`: submitted · approved · returned · lapsed.
    ///
    /// `returned` is step 6أ — a decision was made and it was "not yet", with
    /// the reason on the row. `lapsed` is a reading nobody ever decided on,
    /// overtaken by a newer submission on the same activity. They are different
    /// facts and the register shows them differently: one is a review outcome,
    /// the other is a submission that was withdrawn by being replaced.
    /// </summary>
    public string State { get; set; } = "submitted";

    /// <summary>
    /// The percentage being proposed. It is NOT `Activity.ProgressPct` until an
    /// approval makes it so.
    /// </summary>
    public decimal ProgressPct { get; set; }

    /// <summary>
    /// The reading in force at the moment this one was submitted — «القراءة
    /// السابقة محفوظة».
    ///
    /// STORED, not re-derived. Once a later reading is approved the activity's
    /// percentage has moved, and a returned reading whose «before» silently
    /// followed it would misdescribe the decision that was made on it.
    /// </summary>
    public decimal PreviousPct { get; set; }

    /// <summary>What the source department says it did. Optional.</summary>
    public string Note { get; set; } = "";

    // ── who submitted ────────────────────────────────────────────────────
    // §7 again: «باسم منفّذها وصفته وجهته وتاريخها».

    public string ActorId { get; set; } = "";
    public string ActorName { get; set; } = "";
    public string ActorRole { get; set; } = "";

    /// <summary>
    /// القسم المصدر. Step 7 of the track is «اعتماد القراءة وتسجيلها باسم
    /// القسم المصدر» — so the contract-log event an approval writes is
    /// attributed to THIS party, never to the reviewer who released it.
    /// </summary>
    public string ActorParty { get; set; } = "";
    public DateOnly At { get; set; }

    // ── who decided, and what they decided ───────────────────────────────

    /// <summary>Empty until reviewed. Never the submitter — see EP-PRG-03.</summary>
    public string ReviewerId { get; set; } = "";
    public string ReviewerName { get; set; } = "";
    public string ReviewerRole { get; set; } = "";
    public string ReviewerParty { get; set; } = "";
    public DateOnly? ReviewedAt { get; set; }

    /// <summary>
    /// «إعادة بملاحظات» — the reason, and REQUIRED on a return. A reading sent
    /// back with no reason cannot be acted on, so `EP-PRG-04` refuses one.
    /// </summary>
    public string ReviewNote { get; set; } = "";
}

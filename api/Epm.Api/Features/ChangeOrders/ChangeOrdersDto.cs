namespace Epm.Api.Features.ChangeOrders;

/// <summary>
/// Member names are IDENTICAL to
/// web/src/app/features/change-orders/change-orders.types.ts (CLAUDE.md §2).
///
/// SCR-W8's register, ported from the v1.1 change-order module —
/// ../epm@design/system-revamp app/vo-record.jsx `DModVO` :454.
/// (ROADMAP's `project-modules.jsx:1142` is the PRE-v1.1 component; v1.1 moved
/// the module into its own file and `vo-record.jsx:4` says so: *"Loaded after
/// project-modules.jsx so this DModVO replaces the earlier one."*)
///
/// ── THE RELATION IS RESOLVED ON THE SERVER ───────────────────────────────
/// BR-14 is the whole authorisation model for a change order (`03 §7`), and it
/// is computed here from the persona header, never in the browser. A relation
/// the client could compute is a relation the client could change.
/// </summary>

/// <param name="Key">
/// `awaiting` · `recorder` · `acted` · `upcoming` · `none` — exactly one, per
/// BR-14.
/// </param>
/// <param name="CanAct">
/// `03 §7`'s gating rule, decided server-side: approve / reject / return /
/// cancel / resubmit / apply / advance render ONLY for `awaiting` or
/// `recorder`. Anything else gets the explicit locked note, never a bare
/// disabled button.
/// </param>
public record ViewerRelationDto(string Key, bool CanAct, string? StageNameAr, string? StageNameEn);

/// <param name="Code">
/// `overdue` · `sla-breached` · `apply-failed` · `awaiting-rate-fixing`.
/// EXCEPTIONS, not lifecycle: `03 §10` puts them in the status column beside
/// the pill rather than replacing it, because an order can be pending AND late
/// AND waiting on the rate committee at once.
/// </param>
public record ExceptionChip(string Code, string LabelAr, string LabelEn);

/// <param name="Value">
/// The figure that GOVERNS: the approved value once there is one, the RE
/// department's proposal until then (`02 §6` — the RE department's figure
/// governs display, and only the pricing committee sets the approved one).
/// </param>
/// <param name="ValueIsApproved">
/// Which of the two <paramref name="Value"/> is, so the row can say so rather
/// than leaving a reader to assume the larger number is binding.
/// </param>
/// <param name="Days">Approved days once approved, requested days until then.</param>
/// <param name="LeadDays">
/// BR-12 — days since the incoming letter, measured from the project DATA DATE
/// (D-06). A hard-coded "today" made every order look years late.
/// </param>
public record ChangeOrderRow(
    int Id,
    string No,
    string ContractId,
    string TitleAr,
    string TitleEn,
    string Type,
    string Lifecycle,
    string Justification,
    string ResponsibleParty,
    string IncomingNo,
    string? IncomingDate,
    decimal Value,
    bool ValueIsApproved,
    int Days,
    int LeadDays,
    int? CurrentStageNo,
    string? CurrentStageNameAr,
    string? CurrentStageNameEn,
    string? CurrentOwner,
    string? LastActionDate,
    int Attachments,
    ViewerRelationDto Relation,
    IReadOnlyList<ExceptionChip> Exceptions);

/// <param name="Key">`draft` · `pending` · `returned` · `applying` · `closed` · `rejected`.</param>
public record ChangeOrderGroup(string Key, int Count);

/// <summary>
/// `03 §10`: **five compact indicators only — no large cards, no charts.**
/// </summary>
/// <param name="NetApproved">Σ approved value over approved / applying / closed orders.</param>
/// <param name="Pending">Orders still in the approval chain.</param>
/// <param name="NeedsAction">Pending orders whose current stage has breached its SLA (BR-12).</param>
/// <param name="Overdue">
/// Pending orders past the whole-order lead-time ceiling. DIFFERENT from
/// NeedsAction on purpose — `06 §12` seeds VO-02 and VO-06 precisely to prove
/// "pending" and "overdue" are not the same set.
/// </param>
/// <param name="AvgCycleDays">
/// BR-12's mean over CLOSED orders only. Null when none has closed — an average
/// of nothing is not zero (P-09).
/// </param>
public record ChangeOrderIndicators(
    decimal NetApproved,
    int Pending,
    int NeedsAction,
    int Overdue,
    decimal? AvgCycleDays);

/// <param name="AwaitingMe">
/// How many orders this viewer owns right now — the «بانتظار إجرائي» filter,
/// driven by the relation and therefore by who is looking.
/// </param>
public record ChangeOrdersResponse(
    string ProjectId,
    string ProjectNameAr,
    string ProjectNameEn,
    string? DataDate,
    string ViewerId,
    string ViewerParty,
    bool ViewerIsDelegate,
    int AwaitingMe,
    ChangeOrderIndicators Indicators,
    IReadOnlyList<ChangeOrderGroup> Groups,
    IReadOnlyList<ChangeOrderRow> Rows);

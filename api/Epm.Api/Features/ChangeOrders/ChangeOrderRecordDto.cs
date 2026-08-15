namespace Epm.Api.Features.ChangeOrders;

/// <summary>
/// Member names are IDENTICAL to
/// web/src/app/features/change-orders/change-order-record.types.ts (CLAUDE.md §2).
///
/// SCR-W8's RECORD — `03 §9` and ملحق الأشكال 30–34. One response per order,
/// carrying all six tabs: an approver reading this page must not have to wait
/// for a second request to learn what they are approving, and the register
/// already proved that a relation resolved anywhere but the server is a
/// relation the client can change (BR-14).
///
/// ── EVERY FIGURE ARRIVES DERIVED ─────────────────────────────────────────
/// Resulting quantities, values, impacts, weights and finish dates all come
/// from Domain/ChangeOrderRecord. Angular formats and nothing else
/// (CLAUDE.md §3.1).
/// </summary>

/// <param name="QtyAfter">Null when this party has not proposed — «بانتظار القرار», never 0.</param>
/// <param name="RateShown">
/// الشكل 31's «سعر الزائد»: the rate for the quantity beyond 20%, and only
/// that. Null on a line inside the limit — the original rate is already on the
/// item row above.
/// </param>
public record RecordColumn(
    decimal? QtyAfter,
    decimal? RateShown,
    decimal? AmountAfter,
    decimal? Impact,
    decimal AtRateQty,
    decimal ExcessQty,
    bool TripsThreshold,
    decimal? Weight);

/// <param name="Threshold">20% of the ORIGINAL quantity (D-01) — the plate's «حد 20% = …».</param>
/// <param name="ApplyStatus">na · todo · wip · done · fail, per line (`03 §9` tab 2).</param>
public record RecordLine(
    string Code,
    string DescriptionAr,
    string DescriptionEn,
    string Unit,
    string ChangeType,
    decimal ContractedQty,
    decimal BeforeQty,
    decimal BeforeRate,
    decimal BeforeAmount,
    decimal BeforeWeight,
    decimal Threshold,
    string ApplyStatus,
    RecordColumn Contractor,
    RecordColumn ReDept,
    RecordColumn Approved,
    RecordColumn Applied);

/// <param name="Delta">Approved − before once approved, proposed − before until then.</param>
public record RecordWeightRow(
    string Code,
    string DescriptionAr,
    string DescriptionEn,
    decimal Before,
    decimal? Proposed,
    decimal? ApprovedWeight,
    decimal? Applied,
    decimal Delta);

/// <param name="Valid">الشكل 31's «التحقق من 100%» — recomputed, not asserted.</param>
/// <param name="State">none · review · approved · applied · failed (`03 §6`).</param>
public record RecordWeightImpact(
    decimal SumBefore,
    decimal SumAfter,
    bool Valid,
    string? LastRecalculated,
    string State,
    IReadOnlyList<RecordWeightRow> Rows);

/// <param name="Money">Always 0 — a redistribution that moved money would not be one.</param>
public record RecordRedistribution(
    string SourceCode,
    string SourceDescriptionAr,
    string SourceDescriptionEn,
    string? TargetCode,
    string? TargetDescriptionAr,
    string? TargetDescriptionEn,
    decimal Drawn,
    decimal Distributed,
    decimal Difference,
    decimal Money,
    string ApplyStatus);

/// <param name="AnalysisDays">
/// What the schedule analysis concluded. NOT the requested days and NOT the
/// approved ones — الشكل 32 prints the three side by side.
/// </param>
public record RecordActivity(
    string ActivityId,
    string NameAr,
    string NameEn,
    string ChangeType,
    decimal ProgressPct,
    int RemainingBefore,
    int? RequestedDeltaDays,
    int? AnalysisDays,
    int? ApprovedDeltaDays,
    int? RemainingApproved,
    string? StartBefore,
    string? FinishBefore,
    string? FinishApproved,
    bool IsCritical,
    string ApplyStatus);

public record RecordTimeImpact(
    int AffectedActivities,
    int RequestedDays,
    int? AnalysisDays,
    int? ApprovedDays,
    string? FinishBefore,
    string? FinishForecast,
    string? FinishApproved,
    bool AffectsCriticalPath,
    bool AffectsFinish,
    IReadOnlyList<RecordActivity> Activities);

/// <param name="State">wait بانتظار الجهة · in وردت · back أُعيد · na غير مطلوب (`03 §3`).</param>
/// <param name="RecordedBy">
/// The DELEGATE who wrote it down. The decision belongs to <paramref name="PartyAr"/>;
/// this name is the recorder, and the two are never merged (`03 §4`).
/// </param>
public record RecordExternalParty(
    int Id,
    string PartyAr,
    string PartyEn,
    string State,
    bool CanCancel,
    string? LetterNo,
    string? LetterDate,
    string? RecordedBy,
    string? Note);

/// <param name="Applicable">
/// False ⇒ the stage is SKIPPED and <paramref name="SkipReason"/> says why.
/// `03 §2` requires it listed, never silently omitted.
/// </param>
/// <param name="ElapsedDays">
/// Days the stage has been open — measured to its action date, or to the DATA
/// DATE while it is still open (D-06).
/// </param>
public record RecordStage(
    int StageNo,
    string NameAr,
    string NameEn,
    string OwnerParty,
    string OwnerPartyEn,
    string Status,
    bool Applicable,
    string? SkipReason,
    string? SentAt,
    string? ActionedAt,
    int ElapsedDays,
    int SlaDays,
    bool Breached,
    string? Decision,
    string? DecisionNote,
    string NoteAr,
    string NoteEn,
    int ExternalReceived,
    int ExternalRequired,
    IReadOnlyList<RecordExternalParty> External);

/// <param name="LeadTimeDays">Σ of the stages that have actually run — الشكل 33's «معدل دوران المعاملة».</param>
/// <param name="StalledAtAr">The stage it is sitting at, or null when the chain is complete.</param>
public record RecordTransaction(
    string? ReferredOn,
    int DaysElapsed,
    bool Breached,
    int LeadTimeDays,
    string? StalledAtAr,
    string? StalledAtEn);

/// <param name="SpecStep">Its number in `03 §6`'s seven, or null for the two الشكل 30 adds.</param>
public record RecordApplyStep(
    int No,
    int? SpecStep,
    string NameAr,
    string NameEn,
    string Status,
    string? Message,
    string? CompletedAt);

/// <param name="State">Always `in` — these are letters that ARRIVED before entry (`03 §1`).</param>
public record RecordPreInput(
    string PartyAr,
    string PartyEn,
    string ActAr,
    string ActEn,
    string LetterNo,
    string? LetterDate,
    string State);

public record RecordAttachment(
    string FileName,
    string Category,
    int Version,
    string? UploadedAt,
    string UploadedByAr,
    string UploadedByEn,
    int? StageNo,
    string? StageNameAr,
    string? StageNameEn);

/// <param name="ActorAr">
/// The party that acted. On a delegated record this is the RECORDER and the
/// note names the deciding party (`03 §4`).
/// </param>
public record RecordAuditEntry(
    string At,
    string ActorAr,
    string ActorEn,
    string Action,
    int? StageNo,
    string? StageNameAr,
    string? StageNameEn,
    string? Field,
    string? PreviousValue,
    string? NewValue,
    string? Note,
    int Version);

/// <param name="ExcessRateState">fixed · awaiting · na — who has settled the rate beyond 20%.</param>
public record RecordImpactSummary(
    decimal? ContractorValue,
    decimal? ReDeptValue,
    decimal? ApprovedValue,
    int LinesOverTier,
    string ExcessRateState,
    int RequestedDays,
    int? ApprovedDays,
    int AffectedLines,
    int AffectedActivities);

/// <param name="AmendmentState">issued · pending · none — `02 §9`'s whole point.</param>
/// <param name="PenaltyState">recalculated · unchanged — BR-10's baseline moves only with days.</param>
public record RecordContractImpact(
    decimal ValueBefore,
    decimal? OrderValue,
    decimal? ValueAfter,
    string AmendmentState,
    int? AmendmentNo,
    string? FinishAfter,
    string PenaltyState);

/// <param name="DifferenceValue">Approved − the RE department's proposal (`02 §6`).</param>
public record RecordDecision(
    decimal? ContractorValue,
    int? ContractorDays,
    decimal? ReDeptValue,
    int? ReDeptDays,
    decimal? ApprovedValue,
    int? ApprovedDays,
    decimal? DifferenceValue,
    int? DifferenceDays,
    string? Reason,
    string? DecisionDate,
    string? Authority,
    string? ExcessRateAuthority);

/// <summary>
/// الشكل 30's «بطاقة الأمر» rail — the facts an approver must not have to leave
/// the decision to look up.
/// </summary>
public record RecordCard(
    string Lifecycle,
    string? StageNameAr,
    string? StageNameEn,
    int AgeDays,
    decimal? RequestedValue,
    decimal? ApprovedValue,
    decimal? DifferenceValue,
    decimal? ContractValueAfter,
    int RequestedDays,
    int? ApprovedDays,
    string? ContractualFinish);

/// <summary>
/// One entry of الشكل 30's «منتقي الأمر» — every other order on this PROJECT,
/// so a reader can move between records without going back to the register.
///
/// Deliberately thin: a number, a title and a lifecycle. The picker is a way
/// to navigate, not a second register, and sending each sibling's relation and
/// figures would be sending a register nobody asked for.
/// </summary>
public record RecordSibling(string No, string TitleAr, string TitleEn, string Lifecycle, bool IsCurrent);

public record ChangeOrderRecordResponse(
    string ProjectId,
    string ProjectNameAr,
    string ProjectNameEn,
    string? DataDate,
    string ViewerId,
    string ViewerParty,
    bool ViewerIsDelegate,

    string No,
    string ContractId,
    string ContractNameAr,
    string ContractNameEn,
    string TitleAr,
    string TitleEn,
    string Type,
    string Lifecycle,
    string Justification,
    string ResponsibleParty,
    string IncomingNo,
    string? IncomingDate,

    ViewerRelationDto Relation,
    IReadOnlyList<ExceptionChip> Exceptions,
    RecordCard Card,

    IReadOnlyList<RecordPreInput> PreInputs,
    RecordImpactSummary Impact,
    RecordContractImpact Contract,
    RecordDecision Decision,
    IReadOnlyList<RecordApplyStep> ApplySteps,

    IReadOnlyList<RecordLine> Lines,
    decimal? NetContractor,
    decimal? NetReDept,
    decimal? NetApproved,
    RecordWeightImpact Weights,
    IReadOnlyList<RecordRedistribution> Redistribution,

    RecordTimeImpact Time,

    IReadOnlyList<RecordStage> Stages,
    RecordTransaction Transaction,

    IReadOnlyList<RecordAttachment> Attachments,
    IReadOnlyList<RecordAuditEntry> Audit,

    /// <summary>الشكل 30's «منتقي الأمر» — the project's other orders.</summary>
    IReadOnlyList<RecordSibling> Siblings);

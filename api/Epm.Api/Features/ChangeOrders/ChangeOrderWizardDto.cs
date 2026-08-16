namespace Epm.Api.Features.ChangeOrders;

/// <summary>
/// Member names are IDENTICAL to
/// web/src/app/features/change-orders/change-order-wizard.types.ts (CLAUDE.md §2).
///
/// المسار 9's creation wizard — `03 §8` and ملحق الأشكال 37–42.
///
/// ── THE CONTRACT IS SELECTED FIRST AND SCOPES EVERYTHING ─────────────────
/// `03 §8` opens with it and non-negotiable #1 makes it the working context: a
/// change order may never contain lines or activities from two contracts. So
/// the source payload is a LIST OF CONTRACTS, each carrying its own items and
/// activities — the client cannot assemble a cross-contract order because it is
/// never given one to assemble.
///
/// ── THE WIZARD COMPUTES NOTHING ──────────────────────────────────────────
/// الشكل 39 recalculates as the two proposals are typed, and every one of those
/// figures comes from <c>EP-WIZ-02</c> — the same Domain/ChangeOrderRecord the
/// RECORD page reads. What a user saw when they submitted is therefore what the
/// record shows afterwards, by construction rather than by care.
/// </summary>

/// <param name="Weight">BR-01, already a share of THIS contract — fetched, never entered (`03 §8`).</param>
/// <param name="ExecutedQty">Feeds the decrease-exceeds-remaining gate (BR-07).</param>
public record WizardBoqLine(
    string Code,
    string DescriptionAr,
    string DescriptionEn,
    string Unit,
    string Division,
    string DivisionName,
    decimal ContractedQty,
    decimal ExecutedQty,
    decimal UnitRate,
    decimal Amount,
    decimal Weight,
    string Status);

public record WizardActivity(
    string ActivityId,
    string NameAr,
    string NameEn,
    string WbsNames,
    string? Start,
    string? Finish,
    decimal ProgressPct,
    int RemainingDuration,
    bool IsCritical,
    string Status);

/// <param name="CurrentValue">
/// The value IN FORCE (BR-09) — original plus APPLIED amendments only. What the
/// wizard's context bar prints, and the base every projected figure is added to.
/// </param>
public record WizardContract(
    string Id,
    string NameAr,
    string NameEn,
    string Status,
    decimal CurrentValue,
    string? Finish,
    int DurationDays,
    IReadOnlyList<WizardBoqLine> Lines,
    IReadOnlyList<WizardActivity> Activities);

/// <param name="Parties">`03 §1`'s originators — who the official letter came from.</param>
public record WizardSourceResponse(
    string ProjectId,
    string ProjectNameAr,
    string ProjectNameEn,
    string? DataDate,
    string ViewerId,
    string ViewerParty,
    IReadOnlyList<string> Parties,
    IReadOnlyList<WizardContract> Contracts);

// ── what the browser sends back ──────────────────────────────────────────

/// <param name="ChangeType">inc · dec · rate · del · redist (`06 §7`).</param>
/// <param name="ContractorExcessRate">
/// Proposed rate for the quantity beyond 20%. BOTH parties merely PROPOSE it —
/// `02 §5` gives the binding rate to لجنة تثبيت الأسعار, so no approved rate is
/// accepted here at all.
/// </param>
public record WizardLineInput(
    string Code,
    string ChangeType,
    decimal? ContractorDeltaQty,
    decimal? ContractorNewRate,
    decimal? ContractorExcessRate,
    decimal? ReDeptDeltaQty,
    decimal? ReDeptNewRate,
    decimal? ReDeptExcessRate,
    string? TargetCode,
    decimal? DrawnQty,
    decimal? DistributedQty);

public record WizardActivityInput(
    string ActivityId,
    string ChangeType,
    int? RequestedDeltaDays,
    string? RequestedStart,
    string? RequestedFinish);

public record WizardAttachmentInput(string FileName, string Category, long SizeBytes);

/// <param name="Kind">`draft` or `submit` — `03 §8` step 5's two buttons, and nothing else.</param>
public record WizardDraft(
    string ContractId,
    string Type,
    string Justification,
    string ResponsibleParty,
    string IncomingNo,
    string? IncomingDate,
    IReadOnlyList<WizardLineInput> Lines,
    IReadOnlyList<WizardActivityInput> Activities,
    IReadOnlyList<WizardAttachmentInput> Attachments);

// ── EP-WIZ-02, the preview ───────────────────────────────────────────────

/// <param name="AtRateQty">The part at the ORIGINAL rate — الشكل 39's «ضمن 20%» row.</param>
/// <param name="ExcessQty">The part that may carry a proposed rate — «أكثر من 20%».</param>
public record PreviewParty(
    decimal? QtyAfter,
    decimal? RateApplied,
    decimal? AmountAfter,
    decimal? Impact,
    decimal AtRateQty,
    decimal AtRateCost,
    decimal ExcessQty,
    decimal ExcessCost,
    bool TripsThreshold);

/// <param name="Remaining">ContractedQty − ExecutedQty — what a decrease may not exceed.</param>
public record PreviewLine(
    string Code,
    string DescriptionAr,
    string DescriptionEn,
    string Unit,
    string ChangeType,
    decimal ContractedQty,
    decimal UnitRate,
    decimal AmountBefore,
    decimal Threshold,
    decimal Remaining,
    decimal Weight,
    PreviewParty Contractor,
    PreviewParty ReDept,
    bool Diverges);

/// <param name="WeightDelta">
/// الشكل 40's «تغيّر تراكمي 0.00%» — Σ|after − before| over the affected lines,
/// under the RE department's proposal. The plate states in the same breath that
/// the weights are RE-APPROVED after the final approval, not before it.
/// </param>
public record PreviewWeights(
    decimal SumBefore,
    decimal SumAfter,
    decimal WeightDelta,
    bool Valid);

/// <param name="RevisedValueIsIndicative">
/// Always true here (`02 §6`, D-08): no approved value exists until the pricing
/// committee rules at financial review, so the revised contract value the wizard
/// shows is تقديرية and the screen says so.
/// </param>
public record PreviewSummary(
    int SelectedLines,
    int SelectedActivities,
    decimal ContractValue,
    decimal? ContractorNet,
    decimal? ReDeptNet,
    decimal? RevisedValueContractor,
    decimal? RevisedValueReDept,
    bool RevisedValueIsIndicative,
    int LinesOverTier,
    string ExcessRateState,
    int RequestedDays,
    string ApprovedValueState);

/// <param name="Blocking">true ⇒ submission is REFUSED, not warned (BR-07 · `02 §7`).</param>
public record PreviewIssue(string Gate, string? Ref, string MessageAr, string MessageEn, bool Blocking);

/// <param name="ExpectedPath">
/// `03 §8` step 5 — rendered from the ACTUAL conditions: the rate-fixing stage
/// appears only if a line trips 20%, المصادقة والتخصيص only if the order needs
/// endorsement or funding. A skipped stage carries its reason (`03 §2`).
/// </param>
public record PreviewStage(
    int StageNo,
    string NameAr,
    string NameEn,
    string OwnerParty,
    string OwnerPartyEn,
    bool Applicable,
    string? SkipReasonAr,
    string? SkipReasonEn);

public record WizardPreviewResponse(
    IReadOnlyList<PreviewLine> Lines,
    PreviewSummary Summary,
    PreviewWeights Weights,
    IReadOnlyList<PreviewStage> ExpectedPath,
    IReadOnlyList<PreviewIssue> Issues,
    bool CanSubmit);

/// <param name="No">The number the order was given — the register's own column.</param>
public record WizardCreateResponse(string No, string Lifecycle, int Id);

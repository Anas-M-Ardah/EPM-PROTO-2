namespace Epm.Api.Features.Financials;

/// <summary>
/// Member names are IDENTICAL to web/src/app/features/financials/financials.types.ts
/// (CLAUDE.md §2).
///
/// SCR-W7, ported from the v1.1 financial module — ../epm@design/system-revamp
/// app/project-modules.jsx `DModFinancialNew` :907.
///
/// ── GROSS IS NOT NET, AND NEITHER IS DISBURSED ───────────────────────────
/// A payment certificate carries FOUR figures and the screen shows all four:
/// gross certified, retention withheld, advance recovered, and the net that
/// actually left the treasury. Collapsing them to one "amount" is what makes a
/// retention balance impossible to find later — and the retention held IS a
/// liability the ministry still owes the contractor.
///
///     net = gross − retention − advanceRecovery
///
/// ── DISBURSED COUNTS `paid`, NEVER `certified` (P-26) ────────────────────
/// The gap between the two is where a delayed project's money sits, and it is
/// the figure this screen exists to make visible. `CNT-0279`'s third
/// certificate is certified and unpaid on purpose.
/// </summary>

/// <param name="Approved">Σ ORIGINAL contract values — the cost as awarded (BR-00).</param>
/// <param name="ApprovedChanges">
/// Σ APPLIED amendment deltas (BR-09). Approved-but-unapplied is a projection
/// and enters nothing here (02 §9); it travels separately as
/// <see cref="FinancialsTotals.PendingChanges"/> so the screen can say what is
/// coming without folding it into a total.
/// </param>
/// <param name="Revised">Approved + ApprovedChanges — the value IN FORCE.</param>
/// <param name="Disbursed">Σ net of PAID certificates.</param>
/// <param name="Certified">
/// Σ net of certificates certified but NOT yet paid. Money the ministry has
/// agreed it owes and has not released.
/// </param>
/// <param name="RetentionHeld">
/// Σ retention withheld from PAID certificates. Released by a
/// `retention-release` payment, which is why the kind exists in the lookup.
/// A certified-and-unpaid certificate has withheld nothing yet — no money has
/// moved for anything to be held back from.
/// </param>
/// <param name="AdvanceOutstanding">
/// Advances paid, less what PAID certificates have recovered. It is what the
/// contractor still owes back. Same rule as retention and for the same reason:
/// a recovery happens when the money moves, not when the works are certified.
/// </param>
/// <param name="Balance">Revised − Disbursed — the budget still uncommitted in cash.</param>
public record FinancialsTotals(
    decimal Approved,
    decimal ApprovedChanges,
    decimal PendingChanges,
    decimal Revised,
    decimal Disbursed,
    decimal Certified,
    decimal RetentionHeld,
    decimal AdvanceOutstanding,
    decimal Balance,
    decimal SpendPct,
    /// <summary>مصروف السنة across every contract, for the filtered year.</summary>
    decimal SpentYear,
    /// <summary>
    /// «أساسا القياس» — الشكل 14's note box sets the project's APPROVED BUDGET
    /// against Σ of its contracts' effective values, and the gap is the point:
    /// commitments above budget need a cost revision or a transfer before
    /// spending stalls. Two different questions, so two figures and never one.
    /// </summary>
    /// <summary>NULL when المسار 1 recorded no cost for the project — «لا موازنة
    /// معتمدة مسجّلة» is a real state and not a gap of zero (P-09).</summary>
    decimal? ProjectBudget,
    decimal ContractCommitments,
    decimal? BudgetGap);

/// <summary>
/// One of `01 §2.3`'s "three expense items". They are NOT a partition of the
/// contract value and are deliberately not rendered as one (P-57):
/// `original_value` is defined as *"the awarded value"* and `award_amount` is
/// the same money seen again, so award + reserve + supervision exceeds the
/// contract by exactly the two allowances. A tree whose children out-total
/// their parent is worse than no tree — the reference builds one and its own
/// message bar then explains why the numbers disagree.
///
/// So the sheet keeps the contract row, and these travel beside it under their
/// own heading with their own total.
/// </summary>
/// <param name="Chg">
/// An applied change order moves the AWARD, never the reserve and never the
/// supervision allowance.
/// </param>
/// <param name="SpentYear">مصروف السنة — PAID certificates whose money moved in the filtered year.</param>
/// <param name="SpentToDate">مصروف تراكمي — every PAID certificate, whatever the year.</param>
/// <param name="Forecast">
/// عند الإنجاز. NULL on a component, and deliberately: BR-11 forecasts from
/// a CPI, a component has no earned value of its own to form one, and
/// apportioning the contract's forecast across three lines would be an
/// allocation rule no document states (P-90).
/// </param>
public record FinancialsComponentDto(
    string Key,
    string LabelAr,
    string LabelEn,
    decimal Original,
    decimal Chg,
    decimal Revised,
    decimal SpentYear,
    decimal SpentToDate,
    decimal? Forecast,
    decimal? Variance);

public record FinancialsContractDto(
    string Id,
    string NameAr,
    string NameEn,
    string Status,
    decimal Original,
    decimal Chg,
    decimal Revised,
    decimal Disbursed,
    decimal Certified,
    decimal RetentionHeld,
    decimal AdvanceOutstanding,
    decimal Balance,
    int PaymentCount,
    /// <summary>مصروف السنة — the filtered year only.</summary>
    decimal SpentYear,
    /// <summary>
    /// عند الإنجاز — BR-11's EAC on THIS contract: revised ÷ CPI, where CPI is
    /// its own earned value over its own disbursement. Null when the contract
    /// has spent nothing, because a CPI needs a denominator (P-09).
    /// </summary>
    decimal? Forecast,
    /// <summary>Revised − forecast. Negative means the forecast overruns the budget.</summary>
    decimal? Variance,
    IReadOnlyList<FinancialsComponentDto> Components);

/// <param name="Kind">`interim` · `advance` · `final` · `retention-release` (lookup `payment-kind`).</param>
/// <param name="Status">`pending` · `certified` · `paid` (lookup `payment-status`).</param>
/// <param name="CertifiedDate">When the works were certified.</param>
/// <param name="PaidDate">
/// When the money actually left. NULL is not "today" and not an error — it is
/// the certified-but-unpaid state, and it is the one this screen is for.
/// </param>
public record FinancialsPaymentDto(
    int Id,
    string ContractId,
    string ContractNameAr,
    string ContractNameEn,
    int No,
    string Kind,
    string Status,
    string FinanceLetterNo,
    string? FinanceLetterDate,
    decimal GrossAmount,
    decimal RetentionAmount,
    decimal AdvanceRecovery,
    decimal NetAmount,
    string? CertifiedDate,
    string? PaidDate,
    string Note);

/// <summary>
/// BR-11, as DIAGNOSTICS (`02 §11`, `05 §7.9`): 13px, `--on-surface-variant`,
/// never coloured by threshold. Identical inputs to SCR-W6's, from the same
/// `Domain/EarnedValue` call, so the two screens cannot print different indices
/// for one project.
/// </summary>
public record FinancialsEvm(
    decimal Budget,
    decimal Pv,
    decimal Ev,
    decimal Ac,
    decimal? Cpi,
    decimal? Spi,
    decimal? Eac,
    decimal? Vac);

/// <summary>
/// One desk on a certificate's route — الشكل 17's «بطاقة لكل مرحلة».
/// </summary>
/// <param name="State">
/// done · current · overdue · waiting. Derived from BR-12 against the
/// project's DATA DATE, never a clock (D-06): `overdue` is a `current` stage
/// that has been sitting longer than its own cap.
/// </param>
/// <param name="ElapsedDays">
/// Days at this desk — to its finish if it let the file go, to the data date
/// if it still has it. Null before it ever received it.
/// </param>
public record FinancialsAuditStageDto(
    int No,
    string StageKey,
    string PartyAr,
    string PartyEn,
    int CapDays,
    string? StartedAt,
    string? FinishedAt,
    int? ElapsedDays,
    string State);

/// <summary>
/// مهلة تدقيق السلفة الجارية — الشكل 17.
///
/// ONE certificate: the one in flight. «السلفة الجارية» is the certificate
/// that has been certified and not yet paid — the transaction whose delay
/// this screen exists to locate («تُظهر موضع تعثّر المعاملة ومدة بقائها في كل
/// جهة»). A paid certificate has no lead time left to watch.
/// </summary>
/// <param name="OverallState">within · overdue — «ضمن المهلة» or past a cap.</param>
/// <param name="DaysToDue">
/// Legal due date − data date. NEGATIVE when the date has passed, and that
/// is the number the box exists to show.
/// </param>
public record FinancialsAuditSlaDto(
    string ContractId,
    string ContractNameAr,
    string ContractNameEn,
    int PaymentNo,
    string LetterNo,
    string OverallState,
    string? LegalDueDate,
    int? DaysToDue,
    string? CurrentStageAr,
    string? CurrentStageEn,
    IReadOnlyList<FinancialsAuditStageDto> Stages);

/// <summary>
/// One contract's share of a funding letter, split across the three expense
/// items — the inner half of الشكل 16's «توزيع الدفعة على العقود».
/// </summary>
public record FinancialsLetterShareDto(
    string ContractId,
    string ContractNameAr,
    string ContractNameEn,
    string Status,
    decimal Award,
    decimal Reserve,
    decimal Supervision,
    decimal Net);

/// <summary>
/// الشكل 16 — «عرض دفعات المشروع وتفصيل توزيع كل دفعة على العقود وعلى بنود
/// الكلفة داخل كل عقد».
///
/// ── ONE LETTER, SEVERAL CONTRACTS ────────────────────────────────────
/// The plate's PAY-102 covers «عقدان» — «تتيح دفعة واحدة تشمل أكثر من عقد مع
/// توزيع معلن». Nothing new is stored to say so: a payment already carries the
/// official letter it was released against (`Payment.FinanceLetterNo`), which
/// is what the ministry's files are indexed by, and a letter covering two
/// contracts is two payment rows sharing it. This record is that GROUPING,
/// derived at projection time (P-94).
/// </summary>
/// <param name="Statuses">
/// The distinct payment statuses inside the letter. Usually one; two when a
/// letter has been paid on one contract and only certified on the other, and
/// that is exactly the case a single status would hide (P-26).
/// </param>
public record FinancialsLetterDto(
    string LetterNo,
    string? LetterDate,
    int ContractCount,
    decimal Net,
    IReadOnlyList<string> Statuses,
    IReadOnlyList<FinancialsLetterShareDto> Shares);

/// <summary>
/// One fiscal year on الشكل 15 — «متابعة التخصيص المالي السنوي ونسبة استهلاكه
/// مقابل المصروف والمتبقي لكل سنة مالية».
///
/// The allocation is RECORDED (`ProjectAllocations`); everything else here is
/// derived from it and from the payments whose money moved in that year, so
/// this screen cannot disagree with الشكل 14 about what a year cost.
/// </summary>
/// <param name="Spent">Σ net of PAID certificates whose `PaidDate` falls in this year.</param>
/// <param name="Remaining">Allocated − spent. Negative means the year overspent its release.</param>
/// <param name="ConsumptionPct">
/// نسبة الاستهلاك. Null when the year has an allocation of zero — a year with
/// nothing released has no consumption to report, which is not 0% (P-09).
/// </param>
/// <param name="Closed">
/// «السنوات السابقة سجلّ مقفل»: a closed year moves only through an approved
/// transfer, never by editing it in place.
/// </param>
public record FinancialsAllocationDto(
    int Year,
    decimal Allocated,
    decimal Spent,
    decimal Remaining,
    decimal? ConsumptionPct,
    bool Closed,
    string ActorName,
    string ActorRole,
    string ActorParty,
    string? At);

/// <summary>
/// A headline figure this system cannot derive. Same shape and reason as
/// SCR-E1's and SCR-E5's: "never render 0 for a missing input — show
/// unavailable + reason" (P-09).
/// </summary>
public record FinancialsUnavailable(string Key, string NeedsAr, string NeedsEn);

public record FinancialsResponse(
    string ProjectId,
    string ProjectNameAr,
    string ProjectNameEn,
    string? DataDate,
    FinancialsTotals Totals,
    FinancialsEvm Evm,
    IReadOnlyList<FinancialsContractDto> Contracts,
    IReadOnlyList<FinancialsPaymentDto> Payments,
    IReadOnlyList<FinancialsUnavailable> Unavailable,
    /// <summary>التخصيص السنوي — one row per fiscal year, newest first (الشكل 15).</summary>
    IReadOnlyList<FinancialsAllocationDto> Allocations,
    /// <summary>سجل الدفعات — one row per funding letter, newest first (الشكل 16).</summary>
    IReadOnlyList<FinancialsLetterDto> Letters,
    /// <summary>مهل التدقيق — the certificate in flight, or null (الشكل 17).</summary>
    FinancialsAuditSlaDto? AuditSla,
    /// <summary>Years that actually carry a paid certificate, newest first — the filter's options.</summary>
    IReadOnlyList<int> Years,
    /// <summary>The year in force, or null for «كل السنوات».</summary>
    int? Year);

// ── EP-FIN-02 · ملحق الشكل 20 — «تسجيل دفعة» ─────────────────────────────

/// <summary>
/// One document behind a certificate. الشكل 20's fourth step — «ذرعات الأعمال»
/// — and at least one is required: «ربط الدفعة إلزاميًا بكتاب مالية وبذرعات
/// الأعمال يجعل الصرف مستندًا إلى إنجاز موثّق».
///
/// METADATA ONLY, as everywhere else in this prototype. The row is what الشكل 9
/// prints; no bytes are stored.
/// </summary>
public record PaymentAttachmentInput(
    string? TitleAr,
    string? TitleEn,
    string? FileName,
    long SizeBytes);

/// <summary>
/// الشكل 20's five steps, as one payload: العقود المشمولة · المبالغ والبنود ·
/// كتاب المالية · ذرعات الأعمال · مراجعة.
///
/// ── THE NET IS NOT SENT ──────────────────────────────────────────────────
/// It is `gross − retention − advanceRecovery`, computed on the server. A
/// client-sent net is a figure that can disagree with its own components, and
/// this one decides how much money leaves the ministry.
/// </summary>
/// <param name="Kind">Lookup `payment-kind` — advance · interim · final.</param>
/// <param name="AwardPortion">
/// الشكل 9's split across the contract's three expense items. Σ must equal the
/// net: the person decides the split and the server checks it adds up.
/// </param>
public record PaymentRegisterInput(
    string ContractId,
    string? Kind,
    decimal GrossAmount,
    decimal RetentionAmount,
    decimal AdvanceRecovery,
    decimal AwardPortion,
    decimal ReservePortion,
    decimal SupervisionPortion,
    string? FinanceLetterNo,
    DateOnly? FinanceLetterDate,
    string? Note,
    IReadOnlyList<PaymentAttachmentInput>? Attachments);

/// <param name="No">
/// «دفعة N» — the next sequential number on this contract. NOT an official
/// payment code: P-79 is still open and nothing here invents one.
/// </param>
public record PaymentRegisterResult(
    int Id,
    int No,
    string ContractId,
    decimal NetAmount);

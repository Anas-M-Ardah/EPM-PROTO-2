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
/// <param name="Balance">BudgetRevised − Disbursed — «المتبقي», the equation's last term.</param>
/// <param name="BudgetApproved">
/// «الكلفة المقررة» — the RECORDED budget, and the first term of الشكل 14's
/// header equation. NOT <see cref="FinancialsTotals.Approved"/>: the plate runs
/// its equation on 1,374,210,115 while its own table footer totals
/// 2,156,653,454, and «أساسا القياس» exists to set the two against each other.
/// </param>
/// <param name="BudgetChanges">BudgetRevised − BudgetApproved, signed.</param>
/// <param name="BudgetRevised">
/// «الكلفة المعدلة» — the denominator of <see cref="FinancialsTotals.SpendPct"/>
/// and of الإنجاز المالي everywhere: العرض الفني §23-1 defines it as «المصروف
/// التراكمي نسبةً إلى الكلفة المعدلة», which is what fixes P-44.
/// </param>
/// <param name="BudgetSource">
/// `recorded` when الشكل 18 holds the pair, `commitments` when it does not and
/// Σ contract effective values stood in. The screen NAMES the basis rather than
/// implying it — a headline on a fallback that does not say so is worse than no
/// headline (P-09).
/// </param>
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
    /// <summary>
    /// نسبة الصرف — Disbursed over BudgetRevised (§23-1). NULL on a zero basis:
    /// a zero there would assert the project has spent nothing when the truth
    /// is that nobody has recorded a budget to spend against.
    /// </summary>
    decimal? SpendPct,
    decimal BudgetApproved,
    decimal BudgetChanges,
    decimal BudgetRevised,
    string BudgetSource,
    /// <summary>مصروف السنة across every contract, for the filtered year.</summary>
    decimal SpentYear,
    /// <summary>
    /// «أساسا القياس» — الشكل 14's note box sets the recorded budget against
    /// Σ of the contracts' effective values, and the gap is the point:
    /// commitments above budget need a cost revision or a مناقلة before
    /// spending stalls. Two different questions, so two figures and never one.
    /// </summary>
    decimal ContractCommitments,
    /// <summary>
    /// BudgetRevised − ContractCommitments, signed. NULL on the `commitments`
    /// basis, where the two figures are the same number and there is no
    /// comparison to draw — «لا موازنة معتمدة مسجّلة» is a real state and not a
    /// gap of zero (P-09).
    /// </summary>
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
/// عند الإنجاز, per component — `Domain/EarnedValue` on this component's own
/// budget and its own spend, at the CONTRACT's actual percentage. Null when
/// the component has spent nothing, as the contract row is null then (P-09).
///
/// This was NULL on every component until P-190: the reasoning was that
/// apportioning the contract's forecast across three lines would be an
/// allocation rule no document states (P-90). It is not an apportionment —
/// each line carries its own budget and its own recorded spend, so BR-11
/// runs on the line rather than being divided into it, and `DModFinancialNew`
/// does exactly that. The three components sum to the contract.
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
    /// <summary>«سجّلتها …» — الشكل 16's attribution, copied onto the row at registration.</summary>
    string RecordedByName,
    string RecordedByRole,
    string RecordedByParty,
    string Note);

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
/// <param name="CanRelease">
/// Whether THIS viewer may let the file go from THIS desk — `EP-FIN-03`'s gate,
/// mirrored so the card draws a button or the reason (P-96). False on every
/// desk but the one holding the file.
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
    string State,
    bool CanRelease);

/// <summary>
/// مهلة تدقيق السلفة الجارية — الشكل 17.
///
/// ONE certificate: the one in flight — the certificate with an OPEN DESK, and
/// the transaction whose delay this screen exists to locate («تُظهر موضع تعثّر
/// المعاملة ومدة بقائها في كل جهة»). A paid certificate has no lead time left
/// to watch. Certified before pending (P-99): the money the ministry has
/// already agreed it owes is the one whose clock matters most.
/// </summary>
/// <param name="PaymentId">`EP-FIN-03`'s target — the desk is released on this certificate.</param>
/// <param name="Status">pending · certified — what the route has made of it so far.</param>
/// <param name="OverallState">within · overdue — «ضمن المهلة» or past a cap.</param>
/// <param name="Escalated">
/// مسار 8 step 6 — «تصعيد تلقائي إلى المستوى الإداري الأعلى». Derived from an
/// overdue desk, never recorded, so the banner and the desk cannot disagree.
/// </param>
/// <param name="DaysToDue">
/// Legal due date − data date. NEGATIVE when the date has passed, and that
/// is the number the box exists to show.
/// </param>
public record FinancialsAuditSlaDto(
    int PaymentId,
    string ContractId,
    string ContractNameAr,
    string ContractNameEn,
    int PaymentNo,
    string Status,
    string LetterNo,
    string OverallState,
    bool Escalated,
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
/// <param name="RecordedByName">
/// «سجّلتها محللة موازنة في قسم الحسابات» — the letter's own attribution, from
/// the certificates it covers. Empty where none was recorded, and the panel
/// then says nothing rather than naming somebody.
/// </param>
public record FinancialsLetterDto(
    string LetterNo,
    string? LetterDate,
    int ContractCount,
    decimal Net,
    IReadOnlyList<string> Statuses,
    IReadOnlyList<FinancialsLetterShareDto> Shares,
    string RecordedByName,
    string RecordedByRole,
    string RecordedByParty);

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

public record FinancialsResponse(
    string ProjectId,
    string ProjectNameAr,
    string ProjectNameEn,
    string? DataDate,
    FinancialsTotals Totals,
    IReadOnlyList<FinancialsContractDto> Contracts,
    IReadOnlyList<FinancialsPaymentDto> Payments,
    /// <summary>التخصيص السنوي — one row per fiscal year, newest first (الشكل 15).</summary>
    IReadOnlyList<FinancialsAllocationDto> Allocations,
    /// <summary>سجل الدفعات — one row per funding letter, newest first (الشكل 16).</summary>
    IReadOnlyList<FinancialsLetterDto> Letters,
    /// <summary>مهل التدقيق — the certificate in flight, or null (الشكل 17).</summary>
    FinancialsAuditSlaDto? AuditSla,
    /// <summary>Years that actually carry a paid certificate, newest first — the filter's options.</summary>
    IReadOnlyList<int> Years,
    /// <summary>The year in force, or null for «كل السنوات».</summary>
    int? Year,
    /// <summary>البيانات المالية المسجّلة — الشكل 18's card.</summary>
    FinancialsRecordsDto Records,
    /// <summary>سجل التغييرات المالية — الشكل 19's timeline, newest first.</summary>
    IReadOnlyList<FinancialsChangeDto> Changes);

// ── الشكل 18 — «البيانات المالية المسجّلة» ────────────────────────────────

/// <summary>
/// «القيم المالية الرسمية المعتمدة من الدائرة المالية».
///
/// NOTHING HERE IS NEW ARITHMETIC. Every figure is one this endpoint already
/// computed for جدول الكلف or التخصيص السنوي, gathered into the card الشكل 18
/// draws so the two screens cannot print different numbers for one name.
///
/// <param name="ApprovedCost">
/// «كلفة المشروع المقررة» — `Projects.PlannedCost`, the RECORDED budget, not
/// Σ contract original values. Null until one is recorded.
/// </param>
/// <param name="RevisedCost">«كلفة المشروع المعدلة» — `Projects.RevisedCost`.</param>
/// <param name="TransferState">
/// «حالة المناقلة» — lookup `transfer-state`. Null means none has been
/// recorded, which is not the same statement as «لا يوجد» (P-09).
/// </param>
/// <param name="PlannedProgressPct">
/// «نسبة الإنجاز المخطط» — P-53's planned curve, the same figure الشكل 4 reads.
/// Null before a schedule exists to derive it from.
/// </param>
/// <param name="Suggested">
/// Which keys wear الشكل 18's «مقترح» tag. A list rather than a bool per field,
/// for the same reason `ProjectsEndpoints.SuggestedFields` is one: the set is
/// the statement, and it is read in one place.
/// </param>
/// <param name="Year">Which fiscal year <see cref="AnnualAllocation"/> belongs to.</param>
/// <param name="Editable">
/// The keys `EP-FIN-04` will accept. The other four figures are derived — spend
/// is Σ payments (P-92), retention is paid-only (P-26), planned % is P-53's
/// curve — and the form renders them read-only rather than offering a control
/// the save would ignore.
/// </param>
/// <param name="CanEdit">
/// Whether THIS viewer holds `CanEditFinancialRecords`. The server checks it
/// again; this decides whether «تعديل» is drawn, and the reason is printed
/// where it would be.
/// </param>
/// <param name="YearLocked">
/// «السنوات السابقة سجل مقفل لا يُغيَّر إلا بإجراء مناقلة معتمد» (الشكل 15).
/// True when the year in view is closed or earlier than the data date's year
/// and no approved transfer has reopened it — the allocation field is then
/// read-only even for the finance directorate.
/// </param>
/// </summary>
public record FinancialsRecordsDto(
    decimal? ApprovedCost,
    decimal? RevisedCost,
    decimal? AnnualAllocation,
    decimal? SpentYear,
    decimal SpentToDate,
    decimal RetentionHeld,
    string? TransferState,
    decimal? PlannedProgressPct,
    IReadOnlyList<string> Suggested,
    int? Year,
    IReadOnlyList<string> Editable,
    bool CanEdit,
    bool YearLocked);

// ── الشكل 19 — «سجل التغييرات المالية» ────────────────────────────────────

/// <summary>
/// One financial event. «توثيق كل تغيير مالي على المشروع — دفعة مسجّلة أو أمر
/// تغييري معتمد أو تعديل كلفة أو تخصيص — بصاحب الإجراء وصفته وجهته وتاريخه».
///
/// TWO OF THE FOUR KINDS ARE HERE, AND THE OTHER TWO CANNOT BE (P-179).
/// ALL FOUR KINDS ARE HERE. `payment`, `amendment` and `allocation` are stored
/// events with a date, an amount and an actor. The fourth — `record`, «تعديل
/// كلفة أو تخصيص» — is an EDIT to a column, and it exists because
/// `FinancialEdits` now keeps what the column held before. «من 1,332,903,812
/// إلى 1,374,210,115» is read, not reconstructed (P-179).
///
/// <param name="Before">Populated only where a before/after pair is real.</param>
/// <param name="BeforeText">
/// The same pair for a value that is not a number — a `transfer-state` code.
/// Two fields rather than one stringly-typed pair: money must render as money.
/// </param>
/// </summary>
public record FinancialsChangeDto(
    string Kind,
    string Ref,
    string At,
    string TitleAr,
    string TitleEn,
    decimal? Amount,
    decimal? Before,
    decimal? After,
    string ActorName,
    string ActorRole,
    string ActorParty,
    string? BeforeText = null,
    string? AfterText = null);

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

// ── EP-FIN-03 · المسار 8 steps 5–9 — releasing a desk ────────────────────

/// <param name="StageNo">
/// The desk being released. Sent rather than assumed: the client shows one
/// button on one card, and a request that named no desk would be a request to
/// advance whatever the server happened to think was current.
/// </param>
/// <param name="Note">Optional — recorded on the certificate, never required.</param>
public record PaymentReleaseInput(int StageNo, string? Note);

/// <param name="Status">The certificate's status AFTER the release.</param>
/// <param name="Certified">This release certified the works (المسار 8 step 5).</param>
/// <param name="Disbursed">This release moved the money (المسار 8 step 9).</param>
/// <param name="NextStageKey">The desk that now holds the file, or null at the end of the route.</param>
public record PaymentReleaseResult(
    int Id,
    int No,
    string ContractId,
    string Status,
    bool Certified,
    bool Disbursed,
    string? NextStageKey);

// ── EP-FIN-04 · ملحق الشكل 18 — «تعديل» ──────────────────────────────────

/// <summary>
/// «القيم المالية الرسمية المعتمدة من الدائرة المالية، وهي مدخل التحرير الوحيد
/// للبيانات المالية للمشروع».
///
/// ── EVERY FIELD IS OPTIONAL, AND OMITTED IS NOT NULL ─────────────────────
/// The form sends only what the person changed. A field left out is untouched;
/// a field sent as null CLEARS the recorded figure, which is a different act
/// and one the log records as such. That distinction is why these are
/// `Patch<T>` wrappers rather than bare nullables.
/// </summary>
/// <param name="Year">
/// Which fiscal year <see cref="AnnualAllocation"/> belongs to. Required when
/// an allocation is sent: an allocation with no year is money released against
/// nothing, and الشكل 15's locked-ledger rule has no year to check.
/// </param>
public record FinancialRecordsInput(
    Patch<decimal?>? ApprovedCost,
    Patch<decimal?>? RevisedCost,
    Patch<decimal?>? AnnualAllocation,
    Patch<string?>? TransferState,
    int? Year);

/// <summary>
/// One field the caller actually sent. Present with a null <see cref="Value"/>
/// means «clear it»; absent from the payload altogether means «leave it».
/// </summary>
public record Patch<T>(T Value);

/// <param name="Changed">The field keys that moved — one `FinancialEdits` row each.</param>
public record FinancialRecordsResult(string ProjectId, IReadOnlyList<string> Changed);

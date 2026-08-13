namespace Epm.Api.Features.ContractTab;

/// <summary>
/// Member names are IDENTICAL to
/// web/src/app/features/contract-tab/contract.types.ts (CLAUDE.md §2).
///
/// SCR-W3, ported from DModContractNew + DContractAmendments — the v1.1 branch,
/// ../epm@design/system-revamp app/project-modules.jsx:363 and
/// app/contract-amendments.jsx:301.
/// </summary>

// ── EP-CON-01 · the project's contract register ──────────────────────────

/// <param name="EffectiveValue">Original + Σ APPLIED deltas (BR-09).</param>
/// <param name="Addenda">Applied amendments — the ones in force.</param>
/// <param name="Pending">
/// Approved but NOT applied. Counted separately everywhere, never folded in.
/// </param>
/// <param name="Disbursed">Σ net of PAID payments. Certified-not-paid is not spend.</param>
/// <param name="Component">المكوّن — الشكل 6's card prints it under the contractor.</param>
/// <param name="PhysicalPct">
/// الإنجاز المادي — BR-04, rolled up from this contract's BOQ. Null when the
/// contract has no bill to roll up, which is not the same as zero.
/// </param>
/// <param name="SpentPct">
/// المصروف as a share of **كلفة العقد الكلية** — الإحالة + الاحتياط + الإشراف
/// (Domain/ContractRollup). NOT of the effective value: الشكل 7 states the
/// denominator in as many words — «22 % من كلفة العقد الكلية» — and the same
/// spend against the effective value reads 19%, which is the figure الشكل 6's
/// card would then contradict. **This resolves P-44 at the CONTRACT level
/// only**; the project bar in <see cref="ContractRegisterTotals"/> keeps the
/// effective value, because الشكل 6 labels that one «الصرف من القيمة النافذة».
/// Null when the contract has no amounts entered yet.
/// </param>
public record ContractRow(
    string Id,
    string NameAr,
    string NameEn,
    string Status,
    decimal OriginalValue,
    decimal EffectiveValue,
    string Start,
    string OriginalFinish,
    string EffectiveFinish,
    int Addenda,
    int Pending,
    decimal Disbursed,
    string Contractor,
    string Component,
    decimal? PhysicalPct,
    decimal? SpentPct);

/// <summary>
/// The reconciliation the register leads with: **original + addenda impact =
/// effective**. Sent as three figures rather than one, because the whole point
/// of the strip is that the reader can see the middle term.
/// </summary>
/// <param name="AddendaImpact">
/// Effective − original. Signed: a decrease is a real outcome and must not be
/// rendered as an absolute value with a lost minus.
/// </param>
/// <param name="ProjectionValue">
/// Effective + Σ approved-but-unapplied deltas. Its own figure (02 §9).
/// </param>
/// <param name="Remaining">
/// القيمة النافذة − المصروف. الشكل 6 prints it beside المصروف under the spend
/// bar: 2,099,751,046 − 622,697,487 = 1,477,053,559.
/// </param>
/// <param name="SpentPct">
/// «الصرف من القيمة النافذة» — disbursed ÷ EFFECTIVE value, which is the
/// denominator الشكل 6 names on the bar itself and العرض الفني §11-1 words as
/// «ونسبة الصرف منها». Deliberately a different denominator from
/// <see cref="ContractRow.SpentPct"/>; see that member's note.
/// </param>
/// <param name="WeightedPhysicalPct">
/// «الإنجاز المادي المرجّح بقيمة كل عقد» — Domain/ContractRollup. Null when no
/// contract on the project has a bill to roll up, so the bar can say so rather
/// than draw 0% (P-09).
/// </param>
/// <param name="DataDate">
/// The project's own data date (D-06), for الشكل 6's footer «البيانات حتى». Never
/// DateTime.Now.
/// </param>
public record ContractRegisterTotals(
    int ContractCount,
    decimal OriginalValue,
    decimal AddendaImpact,
    decimal EffectiveValue,
    decimal ProjectionValue,
    int Addenda,
    int Pending,
    decimal Disbursed,
    decimal Certified,
    decimal Remaining,
    decimal? SpentPct,
    decimal? WeightedPhysicalPct,
    string? PeriodStart,
    string? PeriodFinish,
    string? DataDate);

public record ContractRegisterResponse(
    string ProjectId,
    string ProjectNameAr,
    string ProjectNameEn,
    IReadOnlyList<ContractRow> Rows,
    ContractRegisterTotals Totals,
    IReadOnlyDictionary<string, int> CountByStatus);

// ── EP-CON-02 · one contract ─────────────────────────────────────────────

/// <summary>
/// One link in the version chain (`02 §9`). Row 0 is the original contract;
/// rows 1..n are amendments, each carrying the order it came from.
/// </summary>
/// <param name="State">
/// original · superseded · effective · pending · partial — from
/// Domain/Amendments.VersionState. **`original` is keyed to the NUMBER, not to
/// whether it is still in force** (P-16): amendment 0 stays «العقد الأصلي» after
/// amendment 1 is applied, and the "which version is in force" question is
/// answered by `effective`.
/// </param>
/// <param name="DeltaValue">The approved change this link applied. 0 on row 0.</param>
/// <param name="Value">The running contract value AFTER this link.</param>
/// <param name="Applied">
/// False means approved-but-unapplied — the link is in `Pending`, not in
/// `Versions`, and its figures are nowhere in the effective chain.
/// </param>
public record AmendmentVersion(
    int No,
    string State,
    string? SourceChangeOrderId,
    string? Date,
    decimal DeltaValue,
    int DeltaDays,
    decimal Value,
    string Finish,
    int DurationDays,
    bool Applied);

/// <summary>
/// The delay penalty before and after the applied amendments, and what they
/// waived — `Domain/Penalty.Compare` (BR-10).
///
/// A time extension is often the entire point of a change order, and the
/// waived penalty is what it bought. Showing only the current figure hides
/// the most consequential thing an amendment did.
/// </summary>
/// <param name="Waived">Before − after, floored at zero.</param>
/// <param name="Unavailable">
/// True when the contract carries no recorded forecast finish. Then nothing is
/// known about lateness and the panel says so instead of showing 0 (P-09).
/// </param>
public record PenaltyImpact(
    int DaysBefore,
    decimal AmountBefore,
    decimal CapBefore,
    int DaysAfter,
    decimal AmountAfter,
    decimal CapAfter,
    decimal Waived,
    decimal PerDayPct,
    decimal CapPct,
    bool Unavailable);

/// <param name="Status">pending · certified · paid.</param>
/// <param name="NetAmount">gross − retention − advance recovery.</param>
/// <summary>المرفقات — one file behind a payment (الشكل 9). Metadata only.</summary>
public record PaymentFile(string TitleAr, string TitleEn, string FileName, long SizeBytes);

/// <param name="Portions">
/// تفصيل الدفعة لهذا العقد — الشكل 9's side panel splits one payment across the
/// contract's three cost items. `CostLine.Amount` carries the portion and
/// `Spent` is null: on a payment the portion IS the spend, so a second number
/// would be the same figure twice.
/// </param>
/// <param name="Files">المرفقات — usually the finance letter and the measurement sheet.</param>
public record ContractPayment(
    int No,
    string Kind,
    string FinanceLetterNo,
    string? FinanceLetterDate,
    decimal GrossAmount,
    decimal RetentionAmount,
    decimal AdvanceRecovery,
    decimal NetAmount,
    string? CertifiedDate,
    string? PaidDate,
    string Status,
    string Note,
    IReadOnlyList<CostLine> Portions,
    IReadOnlyList<PaymentFile> Files);

/// <summary>
/// The three expense items of `01 §2.3`, each with what has been spent against
/// it — الشكل 7's «تفصيل كلفة العقد» and الشكل 8's «المصروف» section.
///
/// `Spent` is the sum of the matching `Payment` portion over the contract's PAID
/// payments. It is NOT a column and never was: apportioning a contract-level
/// payment would have been an allocation nobody authorised, which is why this
/// used to be null with a printed reason. الشكل 9 records the apportionment on
/// the payment itself, so the figure is now a sum rather than a guess.
/// </summary>
public record CostLine(string Key, decimal Amount, decimal? Spent);

public record ContractDetail(
    string Id,
    string ProjectId,
    string ProjectNameAr,
    string ProjectNameEn,
    string NameAr,
    string NameEn,
    string Status,
    string Contractor,
    string Consultant,
    string Start,
    string OriginalFinish,
    string EffectiveFinish,
    string? ForecastFinish,
    int? DelayDays,
    int OriginalDurationDays,
    int EffectiveDurationDays,
    decimal OriginalValue,
    decimal EffectiveValue,
    decimal ProjectionValue,
    string IncomingNo,
    string? IncomingDate,
    // ── الشكل 8's own fields ─────────────────────────────────────────────
    // The details card names these and the card had no way to read them: they
    // were on the entity and on the definition endpoint, and nowhere on the
    // record the tab renders.
    string Component,
    string ExecutingParty,
    string ContactInfo,
    decimal AwardAmount,
    decimal ReserveAmount,
    decimal SupervisionAmount,
    decimal MonitoringAmount);

/// <param name="Disbursed">Σ net of PAID payments.</param>
/// <param name="Certified">Σ net of certified-or-paid payments.</param>
/// <param name="Retention">Σ retention withheld across all payments.</param>
/// <param name="Remaining">Effective value − disbursed.</param>
public record ContractMoney(
    decimal Disbursed,
    decimal Certified,
    decimal Retention,
    decimal AdvanceRecovery,
    decimal Remaining,
    IReadOnlyList<CostLine> CostLines);

public record ContractUnavailable(string Key, string NeedsAr, string NeedsEn);

/// <param name="Events">
/// سجل النشاط — الشكل 11's tab, newest first. The SAME `ContractActivityEvents`
/// rows `EP-CON-05` returns and `EP-CON-03/04` write.
/// </param>
/// <param name="Can">
/// Resolved server-side from the persona. الشكل 8's «زر تعديل» renders from this
/// and never decides for itself, so the button and `EP-CON-04` cannot disagree.
/// </param>
public record ContractDetailResponse(
    ContractDetail Contract,
    ContractMoney Money,
    IReadOnlyList<AmendmentVersion> Versions,
    IReadOnlyList<AmendmentVersion> Pending,
    PenaltyImpact Penalty,
    IReadOnlyList<ContractPayment> Payments,
    IReadOnlyList<ContractUnavailable> Unavailable,
    IReadOnlyList<ContractEvent> Events,
    ContractPermissions Can);

// ─────────────────────────────────────────────────────────────────────────
// المسار 2 — إنشاء العقود وربطها بالمشروع
//
// MEMBER NAMES MATCH web/src/app/features/contract-tab/contract.types.ts.
// ─────────────────────────────────────────────────────────────────────────

/// <summary>
/// What the specialist enters — المسار 2 steps 2-4, in their order:
/// هوية العقد والمكوّن وحالته · المبالغ · التواريخ وبيانات المقاول.
///
/// Nullable at this layer so a missing field arrives as null and is reported by
/// Domain/ContractDefinition with a message the user can act on, rather than
/// being rejected by the JSON binder with one that says nothing.
///
/// `OriginalDurationDays` is absent ON PURPOSE: it is derived from the two
/// dates (ContractDefinition.DurationDays). Asking for it would invite a third
/// number that contradicts the two it comes from.
/// </summary>
public record ContractDefinitionInput(
    // هوية العقد
    string? Id,
    string? NameAr,
    string? NameEn,
    string? Component,
    string? Status,
    // المبالغ
    decimal? AwardAmount,
    decimal? ReserveAmount,
    decimal? SupervisionAmount,
    decimal? MonitoringAmount,
    // التواريخ
    string? Start,
    string? Finish,
    // المقاول والجهة المنفذة
    string? Contractor,
    string? ExecutingParty,
    string? Consultant,
    string? ContactInfo,
    // كتاب الإحالة
    string? IncomingNo,
    string? IncomingDate
);

/// <inheritdoc cref="Epm.Api.Features.Projects.ProjectViolation"/>
public record ContractViolation(string Field, string MessageAr, string MessageEn);

/// <summary>سجل النشاط — one row of الشكل 7's fifth tab.</summary>
public record ContractEvent(
    int Id,
    string Action,
    string ActorName,
    string ActorRole,
    string ActorParty,
    string At
);

/// <param name="Edit">
/// «المستخدم المختص» — §23 gives contract entry to the specialist, the same
/// capacity المسار 1 gives project definition to.
/// </param>
public record ContractPermissions(bool Edit);

/// <summary>
/// GET …/contracts/{id}/definition — the editable record, its activity log and
/// what the CURRENT capacity may do with it.
/// </summary>
public record ContractDefinitionResponse(
    string ProjectId,
    string ProjectNameAr,
    string ProjectNameEn,
    ContractDefinitionInput Definition,
    IReadOnlyList<ContractEvent> Events,
    ContractPermissions Can
);

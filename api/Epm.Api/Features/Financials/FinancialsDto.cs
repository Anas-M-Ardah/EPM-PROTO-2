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
    decimal SpendPct);

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
public record FinancialsComponentDto(
    string Key,
    string LabelAr,
    string LabelEn,
    decimal Original,
    decimal Chg,
    decimal Revised);

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
    IReadOnlyList<FinancialsUnavailable> Unavailable);

namespace Epm.Api.Features.Boq;

/// <summary>
/// Member names are IDENTICAL to web/src/app/features/boq/boq.types.ts
/// (CLAUDE.md §2). One grep — `EP-BOQ-03` — crosses both stacks.
///
/// SCR-W4, ported from the v1.1 BOQ module,
/// ../epm@design/system-revamp app/boq-workspace.jsx:16 (the shell and the
/// contract context), app/boq-register.jsx:435 (the register grid) and
/// app/boq-assign.jsx:11 (the activity-assignment screen).
///
/// ── NOTHING BELOW IS STORED ──────────────────────────────────────────────
/// Weight, share, assigned amount, progress, achieved amount, distribution
/// state and coverage are all derived at projection time (01 §3). What IS
/// stored is the line, the link, the distribution row and the activity —
/// four flat tables and the ID columns that join them.
/// </summary>

// ── EP-BOQ-01 · the contract gate ────────────────────────────────────────

/// <summary>
/// One option in the contract selector. `04 §4`: the BOQ tab is contract-scoped
/// and nothing renders until a contract is chosen, because a BOQ item belongs to
/// exactly one contract (non-negotiable #1) and a list spanning two of them
/// would be a bill of quantities for no contract at all.
/// </summary>
/// <param name="ItemCount">
/// How many lines this contract has. Shown on the option so the choice is not
/// blind, and it is what tells the empty state which of its two messages to use.
/// </param>
public record BoqContractOption(
    string Id,
    string NameAr,
    string NameEn,
    string Status,
    int ItemCount);

public record BoqGateResponse(
    string ProjectId,
    string ProjectNameAr,
    string ProjectNameEn,
    IReadOnlyList<BoqContractOption> Contracts);

// ── EP-BOQ-02 · the register ─────────────────────────────────────────────

/// <summary>
/// One BOQ line as the register shows it.
///
/// NO PROJECT COLUMN AND NO WBS COLUMN (`01 §2.4`). The project is derived from
/// the contract and never asked for again; WBS belongs to the activity, and a
/// BOQ line reaches it only THROUGH a link, which is a different question from
/// "what is on this line".
/// </summary>
/// <param name="Qty">
/// The EFFECTIVE quantity — Σ rate-band quantities when the line has been
/// re-priced, otherwise the contracted one. `OriginalQty` persists beside it
/// and is never overwritten (non-negotiable #6).
/// </param>
/// <param name="Rate">
/// The effective rate: `Domain/TierSplit.BlendedRate` over the bands when there
/// are any (02 §5), otherwise the contract rate.
/// </param>
/// <param name="Weight">
/// BR-01. This line's share of its CONTRACT's total, largest-remainder rounded
/// so the column sums to exactly 100.00.
/// </param>
/// <param name="Progress">
/// BR-04. The allocation-weighted mean of the linked activities' progress —
/// NOT a stored figure, and not enterable here.
/// </param>
/// <param name="Coverage">
/// 06 §11 — unassigned · full · partial · over, from Σ shares (BR-03). It is a
/// comparison against 100%, never against `Weight`.
/// </param>
/// <param name="AssignedWeight">
/// Weight × Σ shares ÷ 100 — the part of the contract this line actually earns
/// against. It equals `Weight` only when coverage is full, and the gap is the
/// point of the column.
/// </param>
/// <param name="DistributionState">06 §10 — none · partial · full · over (BR-08).</param>
/// <param name="Banded">
/// `Domain/TierSplit.MultiRate` — the line carries MORE THAN ONE RATE, so
/// `Rate` above is a blend. NOT merely "an order has been applied to it": a
/// line moved inside the 20% threshold has one band at the contract rate, and
/// «سعر مركّب» over it would claim a rate-fixing decision nobody took.
/// </param>
public record BoqRow(
    string Code,
    string DescriptionAr,
    string DescriptionEn,
    string Unit,
    string Division,
    string DivisionName,
    string Source,
    decimal OriginalQty,
    decimal Qty,
    decimal Rate,
    decimal Amount,
    decimal Weight,
    decimal SharesTotal,
    decimal AssignedWeight,
    int Links,
    string Coverage,
    decimal Progress,
    decimal AchievedAmount,
    decimal AchievedQty,
    decimal Distributed,
    decimal Remaining,
    string DistributionState,
    bool Banded,
    /// <summary>
    /// The SUPPLY sub-type's half of the line, or null on a works bill (D-14).
    /// Null rather than a zeroed object: a works line has no supplied quantity,
    /// and sending 0 would let the register print a receipt column against it.
    /// </summary>
    BoqSupplyDetail? Supply,
    /// <summary>
    /// `04 §6` — the amendment badge and the cell delta, or null when no
    /// approved order has ever touched this line. Null rather than a zeroed
    /// object for the same reason as `Supply`: an untouched row must print no
    /// badge, and a count of 0 is a badge.
    /// </summary>
    BoqAmendmentMark? Amendment);

/// <param name="No">The order's number, e.g. "VO-01".</param>
/// <param name="IsApplied">
/// From the LINE's own `AppliedDeltaQty`, not the order's lifecycle: a
/// partially applied order has moved some of its lines and not others.
/// </param>
public record BoqAmendmentSource(string No, bool IsApplied);

/// <summary>
/// ROADMAP 4.5 · `04 §6` — the row-level disclosure. `Domain/AmendmentDisclosure`
/// decides the state; this carries it and the two deltas the cell prints.
/// </summary>
/// <param name="State">applied · pending · mixed — `Domain/AmendmentDisclosure`.</param>
/// <param name="DeltaQty">
/// Effective − original. SETTLED: it is already inside the row's own `Qty`.
/// Rendered as a compact signed delta beside the figure, never as a
/// strikethrough over the original (`04 §6`).
/// </param>
/// <param name="PendingDeltaQty">
/// What the approved-but-unapplied orders WOULD add, measured from the
/// effective figure. Null when nothing is awaiting application — which is a
/// different fact from a pending delta of zero.
/// </param>
public record BoqAmendmentMark(
    int Count,
    int AppliedCount,
    int PendingCount,
    string State,
    decimal OriginalQty,
    decimal OriginalAmount,
    decimal DeltaQty,
    decimal DeltaAmount,
    decimal? PendingDeltaQty,
    decimal? PendingDeltaAmount,
    IReadOnlyList<BoqAmendmentSource> Sources);

/// <summary>
/// EP-BOQ-17 — one step of the drawer's chain. Each step records where the line
/// STOOD when that order reached it, because several orders can hit one line
/// and each applies to the running figure rather than to the original.
/// </summary>
/// <param name="ExcessQty">
/// BR-05's re-priced portion, attributed to the order that introduced it — so
/// the drawer can say which decision gave the line a second rate. Zero on every
/// order that stayed inside the 20% threshold.
/// </param>
public record BoqAmendmentStep(
    string No,
    string? At,
    bool IsApplied,
    decimal QtyFrom,
    decimal QtyTo,
    decimal AmountFrom,
    decimal AmountTo,
    decimal ExcessQty,
    decimal? ExcessRate);

/// <param name="Bands">
/// The line's rate bands as they stand — the contracted quantity at the
/// contract rate, and the excess at the rate لجنة تثبيت الأسعار fixed (02 §5).
/// Empty on a line that carries one rate.
/// </param>
/// <param name="BlendedRate">
/// `Domain/TierSplit.BlendedRate`. Equal to the contract rate on an unbanded
/// line, which is why the drawer only labels it «السعر المكافئ» when `Banded`
/// — which here, as on the row, means MORE THAN ONE RATE.
/// </param>
public record BoqAmendmentBand(decimal Qty, decimal Rate, decimal Amount, bool IsExcess, string? SourceNo);

public record BoqAmendmentDetail(
    string Code,
    string DescriptionAr,
    string DescriptionEn,
    string Unit,
    int Count,
    int AppliedCount,
    int PendingCount,
    string State,
    decimal OriginalQty,
    decimal OriginalAmount,
    decimal EffectiveQty,
    decimal EffectiveAmount,
    decimal BlendedRate,
    bool Banded,
    decimal? PendingQty,
    decimal? PendingAmount,
    IReadOnlyList<BoqAmendmentStep> Chain,
    IReadOnlyList<BoqAmendmentBand> Bands);

/// <summary>
/// الفقرة التجهيزية's own fields (الأشكال 50–52) — the sub-type half of a row
/// whose shared half is `BoqRow`. Contracted quantity, rate, amount and weight
/// are NOT here: they are the base line's, so a supply bill weighs and prices
/// itself through exactly the same rules a works bill does.
/// </summary>
public record BoqSupplyDetail(
    string Manufacturer,
    string Country,
    string Model,
    string SerialFrom,
    string SerialTo,
    decimal SuppliedQty,
    decimal ReceivedQty,
    /// <summary>DERIVED — Domain/SupplyStatus. received · partial · supplied · pending.</summary>
    string Status,
    /// <summary>DERIVED — نسبة الاستلام.</summary>
    decimal ReceivedPct,
    /// <summary>DERIVED — contracted less received, never negative.</summary>
    decimal RemainingQty,
    int WarrantyMonths,
    string? WarrantyExpiry,
    string Notes);

/// <summary>
/// A division header row. The register groups into an expandable
/// division → item hierarchy; a division has no record of its own, it is a
/// label on the lines filed under it, so its figures are sums of its children.
/// </summary>
public record BoqDivision(
    string Key,
    string Name,
    int ItemCount,
    decimal Amount,
    decimal Weight,
    decimal AchievedAmount,
    decimal Progress,
    int Links,
    bool HasOver);

/// <param name="Weight">
/// Always exactly 100.00 when there are rows — that is BR-01's whole promise,
/// and it is sent rather than assumed so the footer cannot quietly disagree
/// with the column above it.
/// </param>
public record BoqTotals(
    int ItemCount,
    decimal Amount,
    decimal Weight,
    decimal AchievedAmount,
    decimal Progress,
    int Links,
    decimal ContractOriginalValue,
    decimal ProjectAmount);

public record BoqRegisterResponse(
    string ProjectId,
    string ProjectNameAr,
    string ProjectNameEn,
    string ContractId,
    string ContractNameAr,
    string ContractNameEn,
    IReadOnlyList<BoqRow> Rows,
    IReadOnlyList<BoqDivision> Divisions,
    BoqTotals Totals,
    IReadOnlyDictionary<string, int> CountByCoverage,
    IReadOnlyDictionary<string, int> CountByDistribution,
    string AsOf,
    /// <summary>
    /// `works` · `supply` · `none` (D-14) — which shape this bill takes, from
    /// the PROJECT's type. Sent so the register renders one column set rather
    /// than guessing from whether `Supply` happens to be null on the first row:
    /// an empty supply bill has no rows to guess from and still needs its own
    /// columns and its own empty state.
    /// </summary>
    string Kind,
    /// <summary>Counts by supply status — empty on a works bill.</summary>
    IReadOnlyDictionary<string, int> CountBySupplyStatus);

// ── EP-BOQ-12 · add one line by hand ─────────────────────────────────────

/// <summary>
/// «الإدخال اليدوي» (الشكل 12) — المسار 3 step 3ب, the branch that enters items
/// one by one instead of importing a sheet.
///
/// ONE SHAPE, TWO KINDS. The shared fields are required whatever the bill is;
/// `Supply` is required on a supply bill and REFUSED on a works one, rather
/// than quietly ignored — a caller sending warranty months to a works contract
/// has misunderstood something, and silently dropping it hides that.
/// </summary>
public record BoqItemCreate(
    string Code,
    string DescriptionAr,
    string DescriptionEn,
    string Unit,
    decimal Qty,
    decimal Rate,
    string? Division,
    string? DivisionName,
    BoqSupplyInput? Supply);

/// <summary>The sub-type half of a create. Quantities only — status is derived.</summary>
public record BoqSupplyInput(
    string? Manufacturer,
    string? Country,
    string? Model,
    string? SerialFrom,
    string? SerialTo,
    decimal SuppliedQty,
    // NO ReceivedQty. المسار 11 records receipts as events, and a new item has
    // received nothing by construction. `EP-SUP-04` is the only way a received
    // quantity moves, and it moves by recording a محضر.
    int WarrantyMonths,
    string? WarrantyExpiry,
    string? Notes);

// ── EP-BOQ-03 · edit one line ────────────────────────────────────────────

/// <summary>
/// The inline row edit (`04 §4`). Only these four fields move: the code is the
/// line's identity, the contract is its scope, and the amount is derived.
/// </summary>
public record BoqItemEdit(
    string DescriptionAr,
    string DescriptionEn,
    string Unit,
    decimal Qty,
    decimal Rate);

// ── EP-BOQ-05 / EP-BOQ-06 · the distribution drawer ──────────────────────

/// <param name="Cap">
/// The most this row may hold: the line's quantity less every OTHER row
/// (`Domain/Distribution.CapFor`). `02 §8` prevents an invalid entry by capping
/// the input and explaining the cap, rather than flagging it afterwards — so
/// the cap is sent per row, not left to the client to work out.
/// </param>
public record BoqDistributionRow(
    string BeneficiaryCode,
    string BeneficiaryNameAr,
    string BeneficiaryNameEn,
    string? SiteCode,
    decimal Qty,
    decimal Cap);

/// <param name="Beneficiaries">
/// THE PROJECT'S beneficiaries only, resolved from `Projects.BeneficiaryCodes`
/// and filtered to the active ones (02 §8, import gate 2) — never the master
/// list.
/// </param>
public record BoqDistributionResponse(
    string ContractId,
    string Code,
    string DescriptionAr,
    string DescriptionEn,
    string Unit,
    decimal Qty,
    decimal Distributed,
    decimal Remaining,
    decimal Excess,
    string State,
    IReadOnlyList<BoqDistributionRow> Rows,
    IReadOnlyList<BoqContractBeneficiary> Beneficiaries);

public record BoqContractBeneficiary(string Code, string NameAr, string NameEn);

public record BoqDistributionInput(string BeneficiaryCode, string? SiteCode, decimal Qty);

public record BoqDistributionSave(IReadOnlyList<BoqDistributionInput> Rows);

// ── EP-BOQ-07 · the activity-assignment view ─────────────────────────────

/// <param name="AbsoluteWeightCost">BR-02 on the cost basis, EXACT — not rounded (P-14).</param>
/// <param name="AbsoluteWeightManHours">
/// BR-02 on the man-hours basis. Null when the P6 file carried no man-hours for
/// this activity, which is what makes the toggle fall back to cost.
/// </param>
public record BoqActivity(
    string ActivityId,
    string NameAr,
    string NameEn,
    string WbsPath,
    string WbsNames,
    string Status,
    decimal Progress,
    decimal AbsoluteWeightCost,
    decimal? AbsoluteWeightManHours,
    bool IsMilestone);

/// <param name="SharePct">
/// The share in force. COMPUTED from the activity's absolute weight (BR-03)
/// unless the line is overridden, in which case it is the stored value.
/// </param>
/// <param name="ComputedPct">
/// What BR-03 says the share would be. Equal to `SharePct` on a computed line;
/// on an overridden one it is what a reset restores, which is why it travels
/// even when it is not what the screen is showing.
/// </param>
/// <param name="Assigned">Amount × share ÷ 100 (BR-03).</param>
/// <param name="AbsoluteWeight">
/// The line's contract weight × this share — what this one link contributes to
/// the contract as a whole.
/// </param>
public record BoqAllocationRow(
    string ActivityId,
    string ActivityNameAr,
    string ActivityNameEn,
    string WbsNames,
    decimal ActivityWeight,
    decimal ActivityProgress,
    decimal SharePct,
    decimal ComputedPct,
    decimal Assigned,
    decimal AbsoluteWeight,
    bool IsDuplicate);

/// <param name="IsManual">
/// The override is per BOQ ITEM, not per link (02 §3: "manually overridable per
/// BOQ item and persisted"). Mixing a stored share with a computed one on the
/// same line gives a total nobody chose — see P-47.
/// </param>
public record BoqAllocation(
    string Code,
    string DescriptionAr,
    string DescriptionEn,
    string Unit,
    decimal Qty,
    decimal Amount,
    decimal Weight,
    decimal SharesTotal,
    string Coverage,
    bool IsManual,
    IReadOnlyList<BoqAllocationRow> Rows);

public record BoqAssignmentResponse(
    string ContractId,
    string Basis,
    bool ManHoursAvailable,
    IReadOnlyList<BoqActivity> Activities,
    IReadOnlyList<BoqAllocation> Items,
    IReadOnlyDictionary<string, int> CountByCoverage);

// ── EP-BOQ-08 · save one line's allocation ───────────────────────────────

public record BoqAllocationInput(string ActivityId, decimal SharePct);

/// <param name="Reset">
/// True discards the override and restores BR-03's computed shares for every
/// link on the line. `Rows` is then ignored.
/// </param>
public record BoqAllocationSave(bool Reset, IReadOnlyList<BoqAllocationInput> Rows);

// ── EP-BOQ-14 / 15 / 16 · «العروض» saved views (ملحق الشكل 12) ────────────

/// <summary>
/// What a saved view restores. `VisibleColumns` is a LIST here and a CSV in the
/// table — the wire shape matches what the client actually holds (a set of
/// column keys), so neither side parses a string the other built.
/// </summary>
/// <param name="SortKey">
/// The sorted column, or empty for the bill's own order (code within division).
/// Stored as two flat columns rather than the reference's `{ k, d }` object,
/// for the same reason `VisibleColumns` is a CSV.
/// </param>
public record BoqSavedViewDto(
    int Id,
    string Name,
    string Query,
    string Coverage,
    IReadOnlyList<string> VisibleColumns,
    string SortKey,
    string SortDir);

/// <summary>
/// Saving a view. `Name` identifies it within the caller's own set, so posting
/// a name that already exists UPDATES it rather than failing — that is how a
/// view is edited, and the reference does the same.
/// </summary>
public record BoqSavedViewInput(
    string? Name,
    string? Query,
    string? Coverage,
    IReadOnlyList<string?>? VisibleColumns,
    string? SortKey,
    string? SortDir);

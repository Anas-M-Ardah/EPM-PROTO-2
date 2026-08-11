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
/// <param name="Banded">True when rate bands exist, so `Rate` is a blend of several.</param>
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
    bool Banded);

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
    string AsOf);

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

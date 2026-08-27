namespace Epm.Api.Features.Progress;

/// <summary>
/// Member names are IDENTICAL to web/src/app/features/progress/progress.types.ts
/// (CLAUDE.md §2).
///
/// SCR-W6, ported from the v1.1 progress module — ../epm@design/system-revamp
/// app/project-modules.jsx `DModProgress` :1391.
///
/// ── THE SCREEN 02 §4 IS ABOUT ────────────────────────────────────────────
/// Every other tab shows progress; this one is where it MOVES. An activity's
/// percentage is edited here and BR-04 reflects it straight onto the BOQ lines
/// the activity is linked to — which is why the reflection table sits directly
/// under the editor rather than on another screen (P-55).
/// </summary>

// ── the headline ─────────────────────────────────────────────────────────

/// <param name="Physical">
/// The project's physical %, weight-rolled from the BOQ lines (02 §4's
/// "contract executed value ÷ contract value", then across contracts).
/// </param>
/// <param name="Financial">
/// Disbursed ÷ effective value. Counts PAID only, never merely certified —
/// P-26's rule, and the gap between the two is where a delayed project's money
/// sits.
/// </param>
/// <param name="Planned">
/// What the baseline requires at the data date, from the same cost weights
/// physical % uses. An ASSUMPTION, not a numbered rule — see P-53.
/// </param>
/// <param name="DelayDays">
/// BR-10's own figure, so this screen and SCR-E5 can never disagree about how
/// late the project is. Null when no forecast has been recorded.
/// </param>
public record ProgressHeadline(
    decimal Physical,
    decimal Financial,
    decimal Planned,
    int? DelayDays,
    string? BaselineFinish,
    string? ForecastFinish);

/// <summary>
/// BR-11, as DIAGNOSTICS. `02 §11` and `05 §7.9`: 13px, `--on-surface-variant`,
/// and NEVER coloured by threshold — `cpi &lt; 1 ? error : success` is a defect.
/// Every member is nullable because P-09 forbids rendering a 0 that asserts a
/// failure the data cannot support.
/// </summary>
public record ProgressEvm(
    decimal Budget,
    decimal Pv,
    decimal Ev,
    decimal Ac,
    decimal? Cpi,
    decimal? Spi,
    decimal? Eac,
    decimal? Vac);

// ── the editor, and what it moves ────────────────────────────────────────

/// <param name="BoqCodes">
/// The BOQ lines this activity feeds, so a person can see what a drag is about
/// to move BEFORE moving it. Empty means the activity is linked to no line —
/// its progress is real work that earns nothing, which the screen says out loud.
/// </param>
/// <param name="PlannedPct">
/// This activity's own planned figure (P-53), so the row explains its share of
/// the project-level gap rather than only contributing to it.
/// </param>
public record ProgressActivityDto(
    string ActivityId,
    string NameAr,
    string NameEn,
    string ContractId,
    string WbsPath,
    string Status,
    decimal ProgressPct,
    decimal PlannedPct,
    decimal AbsoluteWeight,
    int OriginalDuration,
    int RemainingDuration,
    bool IsMilestone,
    bool IsCritical,
    string? BaselineStart,
    string? BaselineFinish,
    IReadOnlyList<string> BoqCodes);

/// <param name="Progress">BR-04 — the allocation-weighted mean of the linked activities.</param>
/// <param name="AchievedAmount">`02 §4`: amount × progress ÷ 100.</param>
/// <param name="AchievedQty">Effective quantity × progress ÷ 100.</param>
/// <param name="Contributors">
/// Which activity contributes what to this line's percentage — share × its
/// progress. It is the arithmetic printed rather than asserted, because this is
/// the one table whose figure a person is about to change by hand.
/// </param>
public record ProgressBoqDto(
    string Code,
    string DescriptionAr,
    string DescriptionEn,
    string ContractId,
    string Unit,
    decimal EffectiveQty,
    decimal Amount,
    decimal Progress,
    decimal AchievedQty,
    decimal AchievedAmount,
    decimal RemainingValue,
    string Coverage,
    IReadOnlyList<ProgressContributorDto> Contributors);

public record ProgressContributorDto(
    string ActivityId,
    string NameAr,
    string NameEn,
    decimal SharePct,
    decimal ProgressPct);

/// <param name="Executed">Σ achieved amount over the contract's BOQ lines (02 §4's rollup).</param>
public record ProgressContractDto(
    string Id,
    string NameAr,
    string NameEn,
    string Status,
    decimal EffectiveValue,
    decimal Executed,
    decimal Physical,
    decimal Planned,
    int Activities,
    int BoqLines);

// ── الشكل 26 — «الإنجاز حسب هيكل التجزئة» ────────────────────────────────

/// <summary>
/// One WBS node's rollup. The plate's own standing note is the contract this
/// record keeps: «محسوب صعودًا من الأنشطة، لا يُدخل يدويًا» — there is no write
/// path to any figure here, and there is no `ProgressPct` on a WBS node in the
/// schema to write to.
/// </summary>
/// <param name="Progress">
/// `Domain/ProgressReflection.Rollup` over the activities beneath it, weighted
/// by cost — the plate's «محسوبة صعودًا من الأنشطة المرجّحة بالكلفة».
/// </param>
/// <param name="Gap">
/// Progress − planned, SIGNED. Negative is behind. Never coloured by its sign
/// (CLAUDE.md §6) — the sign carries it.
/// </param>
/// <param name="IsComplete">
/// Everything beneath it is at 100. Counted into الشكل 26's «مستويات مكتملة
/// N من M», which is why it is sent rather than compared in the browser.
/// </param>
public record ProgressWbsDto(
    string Path,
    string NameAr,
    string NameEn,
    int Level,
    string ContractId,
    decimal Progress,
    decimal Planned,
    decimal Gap,
    decimal Weight,
    int Activities,
    bool IsComplete);

// ── الشكل 27 — «الأثر والكلفة» ───────────────────────────────────────────

/// <summary>
/// الشكل 27's six cards. Every figure here already exists elsewhere in this
/// response or in `Domain/`; the tab is a READING of them, and nothing on it is
/// computed twice.
/// </summary>
/// <param name="DelayCostImpact">
/// `Domain/ScheduleImpact` over the activities that slipped — the same estimate
/// الشكل 23 draws. The plate is explicit that it is «تقدير غير تعاقدي لا
/// يُطالَب به», and the card says so.
/// </param>
/// <param name="ApprovedOrders">
/// Σ APPLIED amendment deltas — what is already inside `RevisedCost`.
/// </param>
/// <param name="PendingOrders">
/// Σ approved-but-unapplied. The plate's governing note: «المعتمد وحده يدخل
/// الكلفة المعدلة؛ وما هو قيد الاعتماد لا يُرحَّل» (02 §9).
/// </param>
/// <param name="ApprovedCost">
/// «الكلفة المقررة» — الشكل 27 prints it UNDER the revised cost as that card's
/// comparison, which is the only place on this screen the two can be seen to
/// differ. `BudgetBasis.Approved`, so it is the same recorded pair الشكل 18
/// writes and SCR-W7 reads.
/// </param>
public record ProgressCostImpactDto(
    decimal Disbursed,
    decimal RevisedCost,
    decimal ApprovedCost,
    decimal DisbursedPct,
    decimal? Eac,
    decimal? Vac,
    int DelayDays,
    decimal DelayCostImpact,
    decimal ApprovedOrders,
    int ApprovedOrderCount,
    decimal PendingOrders,
    int PendingOrderCount);

// ── الشكل 28 — «مخاطر الجدول» ────────────────────────────────────────────

/// <param name="SlipDays">Forecast − baseline. Only activities OVER the threshold are listed.</param>
public record ProgressAtRiskDto(
    string ActivityId,
    string NameAr,
    string NameEn,
    string ContractId,
    string Status,
    bool IsCritical,
    decimal TotalFloat,
    int SlipDays,
    string? BaselineFinish,
    string? ForecastFinish);

/// <param name="AtRiskThresholdDays">
/// الشكل 28 prints «الحد: أكثر من 10 أيام» on the card itself. Sent rather than
/// hard-coded in the template so the card states the threshold the list was
/// actually filtered by.
/// </param>
/// <param name="NegativeFloat">
/// Activities that cannot be finished on time without acceleration — the
/// plate's own words for what a negative total float means.
/// </param>
public record ProgressScheduleRiskDto(
    int DelayDays,
    int CriticalCount,
    int ActivityCount,
    int NegativeFloat,
    int AtRiskCount,
    int AtRiskThresholdDays,
    IReadOnlyList<ProgressAtRiskDto> AtRisk);

// ── الشكل 25 — «تحديثات الإنجاز (واردة من الأقسام)» ──────────────────────

/// <summary>
/// One READING of the whole project, which is what الشكل 25's table draws:
/// التاريخ · المادي · المالي · المصدر · المستخدم, one row per date.
///
/// ── IT IS PROJECT-LEVEL, NOT PER CONTRACT ────────────────────────────────
/// This table used to print one row per `ContractActivityEvents` row, with the
/// contract and a before→after pair. That is the AUDIT's shape, and the plate
/// sends a reader there for it — «التفصيل في سجل التدقيق» is the section's own
/// footer. What the plate shows here is the pair of percentages the project
/// stood at on each date, which is the same series the tiles measure their
/// deltas against (`Domain/ComparisonPeriod.Reading`) and the same one SCR-W1's
/// curve is drawn from. One source, read three ways.
///
/// The plate's own note is the rule: «كل سطر معتمد من قسم مصدره — لا يُحرَّر
/// هنا». There is no write path to this list on this screen.
/// </summary>
/// <param name="Source">
/// The party that endorsed the reading — «الموقف المالي» · «الجدول الزمني» in
/// the plate. RECORDED, from the event's own `ActorParty`: the reference
/// alternates the two by row index (`i % 2`), which is a label, not a fact.
/// Several contracts logging on one date are joined.
/// </param>
/// <param name="By">Who recorded it. Joined the same way.</param>
public record ProgressUpdateDto(
    string At,
    decimal Physical,
    decimal Financial,
    string Source,
    string By);

// ── الشكل 25 — «مرشح مرجع المقارنة» ──────────────────────────────────────

/// <summary>
/// One resolved span of `Domain/ComparisonPeriod` — الشكل 25's «المقارنة مع»,
/// which all four plates name in their function list and again under
/// «الإجراءات المتاحة للمستخدم» as «تغيير مرجع المقارنة».
///
/// SENT RESOLVED, all three of them, rather than sending the readings and
/// letting the browser subtract. A delta in points is arithmetic and §3.1
/// gives Angular none: the page picks an id and renders what came back.
/// Three rows is the whole vocabulary, so there is nothing to round-trip.
/// </summary>
/// <param name="Available">
/// False when the record cannot support the span — a project logged twice has
/// no last quarter. The option is still rendered, disabled, carrying
/// <paramref name="WhyAr"/>: CLAUDE.md §6 asks that a cap be explained, not
/// hidden, and SCR-W5's weight basis makes the same call.
/// </param>
/// <param name="PriorAt">
/// The reading compared against, so «مقارنة مع القراءة السابقة» is checkable.
/// Null for بداية المشروع, which compares against zero rather than a reading.
/// </param>
public record ProgressPeriodDto(
    string Id,
    bool Available,
    string? WhyAr,
    string? WhyEn,
    string? PriorAt,
    decimal PriorPhysical,
    decimal PriorFinancial,
    decimal PhysicalDelta,
    decimal FinancialDelta);

/// <summary>
/// One month end on الملخص's «منحنى الإنجاز — المخطط مقابل الفعلي (تراكمي)».
///
/// `Domain/ProgressSeries.Monthly`, which is the function SCR-W1's own curve
/// comes from — the two screens cannot draw different lines for one project.
/// The reference builds its curve with `f => f * f * (3 - 2 * f)` over eight
/// invented periods; nothing here is a shape.
///
/// EMPTY when the series is not `Drawable` — fewer than two months, or nothing
/// on them. The tile is then not rendered at all rather than rendered flat
/// along its axis, which is the client's own call (P-144).
/// </summary>
/// <param name="ActCum">
/// Null before the first RECORDED update: the actual line starts where the log
/// does, never at a zero nobody wrote.
/// </param>
public record ProgressCurvePeriodDto(
    string At,
    decimal PlanCum,
    decimal? ActCum,
    decimal PlanPeriod,
    decimal ActPeriod);

/// <summary>
/// The threshold band on each of الأشكال 25–28's KPI cards, resolved by
/// `Domain/TileThreshold`. One member per tile that has a band; the tiles that
/// hold a MAGNITUDE — revised cost, cumulative spend, critical count, levels
/// complete — have none and are absent from this record entirely.
///
/// Sent rather than compared in the browser for the same reason the deltas are:
/// «more than five points behind plan is bad» is a judgement about ministry
/// projects, and §3.1 leaves Angular nothing but display formatting.
/// </summary>
public record ProgressTileStates(
    string Physical,
    string Financial,
    string Delay,
    string Indices,
    string WbsRollup,
    string WbsGap,
    string Eac,
    string Vac,
    string PendingOrders,
    string DelayCost,
    string NegativeFloat,
    string AtRisk);

/// <param name="Periods">
/// All three spans, resolved. <paramref name="DefaultPeriod"/> is the one
/// الشكل 25 draws selected.
/// </param>
/// <param name="LastUpdateAt">
/// «آخر تحديث للإنجاز», the fourth figure الشكل 25's Z10 bar carries. The
/// newest recorded reading's date — not the data date beside it, which is when
/// the FIGURES were read, and the gap between the two is the point: a project
/// whose last endorsed update is three months behind its data date is telling
/// a reader something the percentages cannot.
/// </param>
public record ProgressResponse(
    string ProjectId,
    string ProjectNameAr,
    string ProjectNameEn,
    string? DataDate,
    ProgressHeadline Headline,
    ProgressEvm Evm,
    IReadOnlyList<ProgressContractDto> Contracts,
    IReadOnlyList<ProgressActivityDto> Activities,
    IReadOnlyList<ProgressBoqDto> BoqLines,
    IReadOnlyList<ProgressWbsDto> Wbs,
    ProgressCostImpactDto CostImpact,
    ProgressScheduleRiskDto ScheduleRisk,
    IReadOnlyList<ProgressUpdateDto> Updates,
    IReadOnlyList<ProgressPeriodDto> Periods,
    string DefaultPeriod,
    string? LastUpdateAt,
    ProgressTileStates TileStates,
    IReadOnlyList<ProgressCurvePeriodDto> Curve);

/// <param name="ProgressPct">0…100. Anything outside it is refused, not clamped (04 §9).</param>
public record UpdateProgressRequest(decimal ProgressPct);

namespace Epm.Api.Domain;

/// <summary>
/// The documented rule registry, ported from the prototype's
/// `prototype-lite/core/domain.js` RULES array.
///
/// Each entry carries its spec text, its worked example INPUT, what the spec
/// says the answer is, and a Run() that computes it through the REAL function.
/// EP-DOCS-01 serves this, so the /docs route shows the rule and its live
/// result side by side — the running system and the specification cannot drift
/// apart without it being visible on that page.
///
/// This is documentation, not a second implementation. Every Run() must call
/// the same Domain function the endpoints call; inlining the arithmetic here
/// would defeat the entire point.
/// </summary>
public static class RuleCatalog
{
    /// <param name="Source">
    /// The Domain file <see cref="Run"/> calls. The /docs page links it, so a
    /// reader who doubts a result can open the function that produced it —
    /// which is the whole point of showing the result at all.
    /// </param>
    public record Rule(
        string Id,
        string Br,
        string Section,
        string Title,
        string Spec,
        object Example,
        string Expect,
        string Source,
        Func<object> Run);

    public static IReadOnlyList<Rule> All =>
    [
        new("BOQ-WEIGHT", "BR-01", "02.1",
            "BOQ weight (largest-remainder to 100.00%)",
            "An item's weight is its share of its CONTRACT's total BOQ value. Weights sum to " +
            "exactly 100.00% using largest-remainder rounding — toFixed(2) produces 100.01% and " +
            "is a bug. The denominator is the contract's BOQ rows, never the whole project.",
            new { amounts = new[] { 56_131_000m, 43_869_000m } },
            "56.13% / 43.87%, sum exactly 100.00%",
            "Domain/BoqWeights.cs",
            () =>
            {
                var w = BoqWeights.ForContract([56_131_000m, 43_869_000m]);
                return new { weights = w, sum = w.Sum() };
            }),

        new("ACT-WEIGHT", "BR-02", "02.2",
            "Activity absolute & relative weight",
            "Basis is budgeted cost or man-hours, chosen at import. absolute = value / Σ(all); " +
            "relative = value / Σ(parent WBS node). Milestones (zero basis) get 0 and are excluded " +
            "from allocation. Absolute drives BOQ allocation and earned value.",
            new { value = 36m, allTotal = 100m, parentTotal = 60m },
            "A1 absolute 36%, relative 60%",
            "Domain/ScheduleWeights.cs",
            () => ScheduleWeights.For(36m, 100m, 60m)),

        new("ALLOC-SHARE", "BR-03", "02.3",
            "BOQ↔Activity allocation share",
            "The user never types an allocation %. share = absoluteWeight / Σ(absolute weights of " +
            "the activities linked to this BOQ) × 100. Manually overridable per item and persisted; " +
            "reset restores the computed value. Coverage compares Σ shares to 100%, NOT to the BOQ weight.",
            new { absWeights = new[] { 5.8m, 5.2m }, amount = 26_730_000m },
            "A5 share 52.7%, A8 47.3%; assigned 14,094,000 / 12,636,000; coverage full",
            "Domain/Allocation.cs",
            () =>
            {
                var s = Allocation.Shares([5.8m, 5.2m], 26_730_000m);
                return new { shares = s, coverage = Allocation.CoverageStatus(s.Select(x => x.Pct).ToList()) };
            }),

        new("BOQ-PROGRESS", "BR-04", "02.4",
            "Progress reflection (schedule → BOQ)",
            "BOQ progress is the allocation-weighted mean of its linked activities' progress. " +
            "achievedAmount = amount × progress/100; achievedQty = effectiveQty × progress/100; " +
            "remainingValue = amount − achievedAmount.",
            new { links = new[] { new { share = 52.6m, progress = 100m }, new { share = 47.4m, progress = 0m } }, amount = 26_730_000m, effectiveQty = 100m },
            "progress 52.6% → achievedAmount 14,059,980",
            "Domain/ProgressReflection.cs",
            () => ProgressReflection.For([new(52.6m, 100m), new(47.4m, 0m)], 26_730_000m, 100m)),

        new("TIER-20", "BR-05", "02.5",
            "The 20% rule (quantity-change pricing tier)",
            "For a quantity increase OR decrease, the portion up to 20% of the ORIGINAL quantity is " +
            "valued at the original unit rate. Only the excess may carry a new rate. Applies per BOQ " +
            "line, to increase/decrease only. The binding excess rate is fixed by لجنة تثبيت الأسعار, " +
            "never in the wizard; a line that trips the threshold inserts that stage into the chain.",
            new { kind = "inc", originalQty = 100m, deltaQty = 30m, originalRate = 1000m, newRate = 1200m, before = 100_000m },
            "threshold 20; 20 at the original rate; 10 excess at the new rate; newAmount 132,000; trips",
            "Domain/TierSplit.cs",
            () => TierSplit.Split(new("inc", 100m, 30m, 1000m, 1200m, 100_000m))),

        new("PROPOSALS", "BR-06", "02.6",
            "Two proposals, one approved value",
            "Each line carries the contractor's and the RE department's proposals. The RE department's " +
            "figure GOVERNS display once entered; before that the contractor's is shown and labelled. " +
            "Neither is the approved value — that comes only from the pricing committee at financial " +
            "review, and until then the revised contract value is تقديرية (indicative).",
            new { contractor = 12_000_000m, reDept = 11_400_000m, approved = (decimal?)null },
            "governing 11,400,000 from the RE dept, divergence −600,000, indicative",
            "Domain/Proposals.cs",
            () => Proposals.Which(new(12_000_000m, 11_400_000m, null))),

        new("CO-GATES", "BR-07", "02.7",
            "Change-order validation gates",
            "Submission is BLOCKED (not warned) when: a decrease exceeds remaining (contracted − " +
            "executed), for each proposal separately; a redistribution has no target; a redistribution " +
            "is unbalanced; the order is empty; or any line/activity is outside the selected contract.",
            new { contractId = "CNT-0279-EM", line = new { code = "BQ-002", changeType = "dec", contractedQty = 100m, executedQty = 90m, deltaQty = 30m } },
            "1 blocker: decrease 30 exceeds remaining 10",
            "Domain/ChangeOrderGates.cs",
            () => new
            {
                blockers = ChangeOrderGates.Validate(new(
                    "CNT-0279-EM",
                    [new("BQ-002", "CNT-0279-EM", "dec", 100m, 90m, 30m, 30m)],
                    []))
            }),

        new("DISTRIB", "BR-08", "02.8",
            "Quantity distribution to beneficiaries",
            "A BOQ item's quantity may be split across the beneficiaries assigned to that PROJECT " +
            "(never the whole master list). distributed = Σ rows; remaining = max(0, qty − distributed); " +
            "excess = max(0, distributed − qty). Inputs are capped at qty − (sum of the other rows).",
            new { qty = 120m, rows = new[] { 40m, 50m } },
            "distributed 90, remaining 30, state partial",
            "Domain/Distribution.cs",
            () => Distribution.For(120m, [40m, 50m])),

        new("AMEND", "BR-09", "02.9",
            "Contract amendment & effective values",
            "An approved change order does NOT change the contract; applying it does. On apply: " +
            "no = last.no + 1; value = previous.value + approvedValue; finish = previous.finish + " +
            "approvedDays. The last applied amendment is the effective contract. Approved-unapplied " +
            "orders are shown as a projection, never folded into effective figures.",
            new { previous = new { no = 0, value = 100_000_000m, finish = "2026-06-30", duration = 365 }, approvedValue = 5_000_000m, approvedDays = 45 },
            "no 1, value 105,000,000, finish 2026-08-14",
            "Domain/Amendments.cs",
            () => Amendments.Apply(new(0, 100_000_000m, new DateOnly(2026, 6, 30), 365), 5_000_000m, 45)),

        new("PENALTY", "BR-10", "02.10",
            "Delay penalty (0.1%/day, cap 10%)",
            "days = max(0, forecastFinish − contractualFinish); perDay = value × 0.001; cap = value × " +
            "0.10; amount = min(perDay × days, cap). An applied order moves BOTH terms (value and " +
            "finish); show before vs after and the waived amount.",
            new { value = 100_000_000m, contractualFinish = "2026-06-30", forecastFinish = "2026-08-30" },
            "61 days × 100,000 = 6,100,000 (below the 10,000,000 cap)",
            "Domain/Penalty.cs",
            () => Penalty.For(100_000_000m, new DateOnly(2026, 6, 30), new DateOnly(2026, 8, 30))),

        new("EVM", "BR-11", "02.11",
            "Earned value (CPI/SPI/EAC/VAC)",
            "PV = budget × plannedProgress; EV = budget × actualProgress; AC = actual cost. " +
            "CPI = EV/AC; SPI = EV/PV; EAC = budget/CPI; VAC = budget − EAC. These are diagnostics — " +
            "never headline figures, never coloured by threshold.",
            new { budget = 100_000_000m, planned = 0.60m, actual = 0.52m, ac = 55_000_000m },
            "CPI ≈ 0.945, SPI ≈ 0.867",
            "Domain/EarnedValue.cs",
            () => EarnedValue.For(100_000_000m, 0.60m, 0.52m, 55_000_000m)),

        new("SLA", "BR-12", "02.12",
            "Transaction lead time & SLA",
            "leadDays = dataDate − officialIncomingDate, measured against the project data date " +
            "(never the wall clock). Per-stage SLA is 5 days; a stage past SLA is overdue, raises " +
            "needs-action, and auto-escalates.",
            new { dataDate = "2026-08-02", incomingDate = "2026-07-11", sla = 5 },
            "leadDays 22, overdue true",
            "Domain/SlaLeadTime.cs",
            () => SlaLeadTime.For(new DateOnly(2026, 8, 2), new DateOnly(2026, 7, 11))),

        new("WORKFLOW", "BR-13", "03.2",
            "Six-stage workflow with conditional stages",
            "Exactly six system-owned stages. Rate fixing applies only if a line trips 20%; " +
            "endorsement & allocation only if endorsement or funding is needed. Skipped stages are " +
            "listed explicitly with the reason — never silently omitted.",
            new { tripsThreshold = false, needsEndorsement = false, decideAt = 2, decision = "approve" },
            "stages 3 and 4 skipped with reasons; approving at stage 2 advances to stage 5",
            "Domain/WorkflowMachine.cs",
            () =>
            {
                var plan = WorkflowMachine.Plan(false, false);
                return new
                {
                    stages = plan.Select(p => new { p.Def.No, p.Def.En, p.Active, p.SkipEn }),
                    next = WorkflowMachine.Decide(2, "approve", plan),
                };
            }),

        new("RELATION", "BR-14", "03.7",
            "Viewer relation & action gating",
            "For any order and any viewer, resolve exactly one relation: awaiting · recorder · acted · " +
            "upcoming · none. Actions render ONLY for awaiting or recorder; otherwise show an explicit " +
            "locked note, never a bare disabled button.",
            new { viewer = "لجنة تثبيت الأسعار", currentStageOwner = "لجنة أوامر الغيار", lifecycle = "pending" },
            "upcoming — read-only, because the viewer owns a later stage",
            "Domain/ViewerRelation.cs",
            () =>
            {
                var rel = ViewerRelation.For(
                    "لجنة تثبيت الأسعار", false, "pending",
                    "لجنة أوامر الغيار", "دائرة المهندس المقيم",
                    ["دائرة المهندس المقيم"],
                    ["لجنة تثبيت الأسعار"],
                    false);
                return new { relation = rel, canAct = ViewerRelation.CanAct(rel) };
            }),

        new("SCOPE", "BR-15", "07 §24",
            "Workspace visibility & access",
            "A user sees only the workspaces assigned to them, and their scope is the UNION of those " +
            "assignments — «نطاق رؤية المستخدم هو اتحاد تكليفاته حسب دوره ونطاقه؛ ولا يرى بيانات خارج " +
            "تشكيله». A ministry-centre user is the one documented exception (§7 «اطلاع شامل»). " +
            "Requesting a workspace outside the assignment is refused, not silently emptied; requesting " +
            "no workspace means all of the user's own, never the whole portfolio.",
            new { all = new[] { "ub", "nu", "tu" }, assigned = new[] { "ub", "tu" }, ministryWide = false },
            "visible = [ub, tu]; nu is refused",
            "Domain/WorkspaceAccess.cs",
            () =>
            {
                string[] all = ["ub", "nu", "tu"];
                string[] assigned = ["ub", "tu"];

                return new
                {
                    visible = WorkspaceAccess.Visible(all, assigned, false),
                    ubAllowed = WorkspaceAccess.Allowed("ub", assigned, false),
                    nuAllowed = WorkspaceAccess.Allowed("nu", assigned, false),
                    nuAllowedForMinistry = WorkspaceAccess.Allowed("nu", [], true),
                };
            }),
    ];
}

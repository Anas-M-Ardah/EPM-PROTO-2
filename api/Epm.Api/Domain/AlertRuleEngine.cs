namespace Epm.Api.Domain;

/// <summary>
/// P-254 — الشكل 47's own words are explicit that evaluation does not exist in
/// this prototype: *"the condition is recorded, not evaluated... storing it as
/// a parsed expression would claim an engine that does not exist."* That is
/// still true of the CONDITION TEXT (`AlertRule.TriggerAr` stays prose, and
/// there is still no parser). What this module adds is narrower: for the
/// subset of the 14 rules whose condition is already computable from data this
/// codebase derives elsewhere, evaluate that specific, named computation — not
/// the prose — against already-loaded rows.
///
/// ── PURE, LIKE EVERY OTHER Domain/ MODULE (CLAUDE.md §3.1) ────────────────
/// No DB access here. `Features/ProjectAlerts/ProjectAlertsEndpoints.cs` loads
/// the rows each function needs and find-or-creates a real `Alert` for every
/// `Firing` this returns — the alert is the output of the rule, exactly as
/// `Features/Alerts/AlertsEndpoints.cs`'s own doc comment already states the
/// architecture should be.
///
/// ── SIX OF FOURTEEN STAY FIXTURE-ONLY ─────────────────────────────────────
/// R10/R11 (extension-of-time claim window / committee decision date) — no
/// `Extension`/`Eot` entity exists anywhere in this codebase; there is nothing
/// to compute. Recorded here rather than silently guessed at.
/// </summary>
public static class AlertRuleEngine
{
    /// <param name="TargetRef">What the alert points at — an activity id, a
    /// BOQ item code, a change-order no. Null for a project-wide condition.</param>
    /// <param name="DueOn">
    /// When this needs action. A rule with no natural future date (an
    /// already-true condition, not a countdown) uses the data date itself —
    /// that is what makes it read as "needs action now" in the inbox rather
    /// than a notice with no deadline (`Domain/AlertInbox.Bucket`).
    /// </param>
    public record Firing(string RuleCode, string? TargetRef, string TitleAr, string TitleEn, DateOnly? DueOn);

    public record ActivityRow(
        string ActivityId, string NameAr, string NameEn, bool IsCritical, bool IsMilestone,
        DateOnly? BaselineFinish, DateOnly? ForecastFinish);

    /// <summary>R1 — «انزياح ≥ 5 أيام» on the critical path.</summary>
    public static IEnumerable<Firing> CriticalPathSlip(IReadOnlyList<ActivityRow> activities, DateOnly dataDate)
        => activities
            .Where(a => a.IsCritical && a.BaselineFinish is not null)
            .Select(a => (a, slip: ((a.ForecastFinish ?? a.BaselineFinish!.Value).DayNumber - a.BaselineFinish!.Value.DayNumber)))
            .Where(x => x.slip >= 5)
            .Select(x => new Firing("R1", x.a.ActivityId,
                $"تأخر النشاط الحرج {x.a.NameAr} — انزياح {x.slip} يوماً",
                $"Critical activity {x.a.NameEn} slipped {x.slip} days", dataDate));

    /// <summary>R3 — معلم يقترب خلال 45 يوماً ولم يُنجز بعد.</summary>
    public static IEnumerable<Firing> MilestoneApproaching(IReadOnlyList<ActivityRow> activities, DateOnly dataDate)
        => activities
            .Where(a => a.IsMilestone && a.BaselineFinish is { } finish
                && finish.DayNumber - dataDate.DayNumber is >= 0 and <= 45)
            .Select(a => new Firing("R3", a.ActivityId,
                $"المعلم {a.NameAr} خلال 45 يوماً", $"Milestone {a.NameEn} within 45 days", a.BaselineFinish));

    /// <summary>
    /// R2 / R9 — spend ratio ≥90%, warning and critical readings of the one
    /// figure this codebase already derives (`BudgetBasis.SpendPct`) — there is
    /// no separate "period" vs "cumulative" spend in this data model, so both
    /// rules read the same percentage.
    /// </summary>
    public static IEnumerable<Firing> SpendRatio(decimal? spendPct, DateOnly dataDate)
    {
        if (spendPct is not { } pct || pct < 90m) yield break;

        yield return new Firing("R2", null,
            $"الصرف بلغ {pct:0.#}% من التخصيص", $"Spend reached {pct:0.#}% of the allocation", dataDate);
        yield return new Firing("R9", null,
            $"الصرف التراكمي بلغ {pct:0.#}% من الكلفة", $"Cumulative spend reached {pct:0.#}% of cost", dataDate);
    }

    public record ContractProgressRow(string ContractId, DateOnly? LastReadingAt);

    /// <summary>R4 — لا تحديث منذ 40 يوماً.</summary>
    public static IEnumerable<Firing> StaleProgress(IReadOnlyList<ContractProgressRow> contracts, DateOnly dataDate)
        => contracts
            .Where(c => c.LastReadingAt is null || dataDate.DayNumber - c.LastReadingAt.Value.DayNumber >= 40)
            .Select(c => new Firing("R4", c.ContractId,
                $"لا تحديث إنجاز على العقد {c.ContractId} منذ 40 يوماً",
                $"No progress update on {c.ContractId} for 40 days", dataDate));

    public record DocumentRow(string Code, string TitleAr, string TitleEn, string CurrentStatus);

    /// <summary>R5 — وثيقة إلزامية بانتظار الاعتماد (current revision ≠ معتمدة).</summary>
    public static IEnumerable<Firing> DocumentsAwaitingApproval(IReadOnlyList<DocumentRow> docs, DateOnly dataDate)
        => docs.Where(d => d.CurrentStatus != "approved" && d.CurrentStatus != "none")
            .Select(d => new Firing("R5", d.Code,
                $"الوثيقة {d.Code} بانتظار الاعتماد", $"Document {d.Code} awaiting approval", dataDate));

    public record MeetingActionRow(string Code, string TitleAr, string TitleEn, string Status);

    /// <summary>
    /// R6 — إجراء اجتماع متأخر. Keys off the RECORDED status only —
    /// `MeetingAction.cs`'s own doc comment (P-116) rules out deriving lateness
    /// from the due date against the data date for this entity.
    /// </summary>
    public static IEnumerable<Firing> OverdueMeetingActions(IReadOnlyList<MeetingActionRow> actions, DateOnly dataDate)
        => actions.Where(a => a.Status == "overdue")
            .Select(a => new Firing("R6", a.Code,
                $"الإجراء {a.Code} متأخر — {a.TitleAr}", $"Action {a.Code} overdue — {a.TitleEn}", dataDate));

    public record RiskRow(string Code, string TitleAr, string TitleEn, string Status, int Probability, int Impact);

    /// <summary>R7 — خطر مرتفع مفتوح (شدة عالية + مفتوح).</summary>
    public static IEnumerable<Firing> OpenHighRisks(IReadOnlyList<RiskRow> risks, DateOnly dataDate)
        => risks.Where(r => r.Status == "open" && RiskSeverity.For(r.Probability, r.Impact) == "high")
            .Select(r => new Firing("R7", r.Code,
                $"خطر مرتفع مفتوح: {r.TitleAr}", $"Open high risk: {r.TitleEn}", dataDate));

    public record ChangeOrderRow(string No, string TitleAr, string TitleEn, string Lifecycle);

    /// <summary>R8 — أمر تغييري بانتظار القرار (قيد الاعتماد).</summary>
    public static IEnumerable<Firing> ChangeOrdersAwaitingDecision(IReadOnlyList<ChangeOrderRow> orders, DateOnly dataDate)
        => orders.Where(o => o.Lifecycle == "pending")
            .Select(o => new Firing("R8", o.No,
                $"الأمر التغييري {o.No} بانتظار القرار", $"Change order {o.No} awaiting a decision", dataDate));

    public record AuditStageRow(string PaymentNo, string PartyAr, string PartyEn, DateOnly? StartedAt, DateOnly? FinishedAt, int CapDays);

    /// <summary>R12 — تجاوز مهلة تدقيق المعاملة (BR-12, per-stage SLA).</summary>
    public static IEnumerable<Firing> AuditSlaBreached(IReadOnlyList<AuditStageRow> stages, DateOnly dataDate)
        => stages
            .Where(s => s.FinishedAt is null && s.StartedAt is not null
                && SlaLeadTime.For(dataDate, s.StartedAt!.Value, s.CapDays).Overdue)
            .Select(s => new Firing("R12", s.PaymentNo,
                $"تجاوزت المعاملة {s.PaymentNo} سقف {s.PartyAr}", $"{s.PaymentNo} past {s.PartyEn}'s SLA", dataDate));

    public record BoqItemSharesRow(string Code, IReadOnlyList<decimal> SharePcts);

    /// <summary>R13 / R14 — تغطية التخصيص: غير مخصَّص · تجاوز في التخصيص.</summary>
    public static IEnumerable<Firing> AllocationCoverage(IReadOnlyList<BoqItemSharesRow> items, DateOnly dataDate)
    {
        foreach (var i in items)
        {
            var status = Allocation.CoverageStatus(i.SharePcts);
            if (status == "unassigned")
                yield return new Firing("R13", i.Code,
                    $"البند {i.Code} غير مخصَّص على أنشطة", $"{i.Code} not assigned to activities", dataDate);
            else if (status == "over")
                yield return new Firing("R14", i.Code,
                    $"تجاوز في تخصيص البند {i.Code}", $"{i.Code} over-allocated to activities", dataDate);
        }
    }
}

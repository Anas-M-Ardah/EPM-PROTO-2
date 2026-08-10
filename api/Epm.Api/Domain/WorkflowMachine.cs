namespace Epm.Api.Domain;

/// <summary>
/// BR-13 · 03 §2, §5, §6 — the six-stage change-order workflow.
///
/// rule: exactly six system-owned stages, each with one owning party. Two are
///       CONDITIONAL: rate fixing only if a line trips 20% (BR-05), endorsement
///       only if endorsement or funding is needed.
/// spec: skipped stages are LISTED EXPLICITLY WITH THE REASON, never silently
///       omitted (03 §2). Four decisions: approve advances · reject terminates ·
///       return goes back with history retained · cancel terminates.
/// example: no line over 20%, no endorsement needed → 6 stages of which 2 are
///          marked skipped, and approving at stage 2 advances to stage 5.
///
/// External parties are STATUSES INSIDE a stage, not stages (D-10, 03 §3). A
/// stage with a pending external party cannot be completed.
/// </summary>
public static class WorkflowMachine
{
    /// <param name="Condition">always · exceeds20 · needsEndorsement.</param>
    public record StageDef(int No, string Ar, string En, string Owner, string Condition, string NoteAr, string NoteEn);

    public static readonly IReadOnlyList<StageDef> Stages =
    [
        new(1, "دراسة الطلب", "Request study", "دائرة المهندس المقيم", "always",
            "يُدخله المهندس المقيم بعد طلب المقاول ورأي الاستشاري، ثم يُراجع؛ يُعاد إلى المقاول إن كان ناقصاً.",
            "Entered by the resident engineer after the contractor's request and the consultant's opinion; returned to the contractor if incomplete."),

        new(2, "لجنة أوامر الغيار", "Change-order committee", "لجنة أوامر الغيار", "always",
            "تراجع الطلب وتعدّ الاستمارات؛ تُعيده إلى المهندس المقيم إن كان ناقصاً.",
            "Reviews the request and prepares the forms; returns it to the resident engineer if incomplete."),

        new(3, "تثبيت الأسعار", "Rate fixing", "لجنة تثبيت الأسعار", "exceeds20",
            "تثبّت سعر الكمية الزائدة عن 20%، ثم تعيد القرار إلى لجنة أوامر الغيار.",
            "Fixes the rate for quantity beyond 20%, then returns the decision to the change-order committee."),

        new(4, "المصادقة والتخصيص", "Endorsement & allocation", "لجنة أوامر الغيار", "needsEndorsement",
            "يُرفع محضر إلى الوزير مع الموافقات الخارجية المطلوبة.",
            "Minute raised to the Minister, with the required external approvals."),

        new(5, "الأمر الوزاري وملحق العقد", "Ministerial order & addendum", "لجنة أوامر الغيار", "always",
            "يصدر الأمر الوزاري ثم ملحق العقد.",
            "Ministerial order issued, then the contract addendum."),

        new(6, "التنفيذ", "Execution", "دائرة المهندس المقيم", "always",
            "تحديث العقد وجدول الكميات والجدول الزمني.",
            "Contract, BOQ and schedule updated."),
    ];

    public record PlannedStage(StageDef Def, bool Active, string? SkipAr, string? SkipEn);

    /// <summary>
    /// The chain for one order. Returns ALL SIX — a skipped stage is marked
    /// with its reason, never dropped (03 §2).
    /// </summary>
    public static IReadOnlyList<PlannedStage> Plan(bool tripsThreshold, bool needsEndorsement)
        => Stages.Select(s => s.Condition switch
        {
            "exceeds20" when !tripsThreshold =>
                new PlannedStage(s, false, "لم يتجاوز أي بند 20%", "No line exceeded 20%"),

            "needsEndorsement" when !needsEndorsement =>
                new PlannedStage(s, false, "لا حاجة للمصادقة أو التخصيص", "No endorsement or funding needed"),

            _ => new PlannedStage(s, true, null, null),
        }).ToList();

    /// <summary>03 §3 — the endorsement review committee is required only when
    /// the added duration exceeds a quarter of the contract duration.</summary>
    public static bool ExceedsQuarterDuration(int requestedDays, int contractDurationDays)
        => requestedDays > contractDurationDays * 0.25m;

    /// <summary>03 §3 — a stage with a pending external party cannot complete.</summary>
    public static bool CanCompleteStage(IReadOnlyList<string> externalStates)
        => externalStates.All(s => s is "in" or "na");

    /// <summary>03 §3 — the n / m received counter on the stage.</summary>
    public static (int Received, int Required) ExternalProgress(IReadOnlyList<string> states)
        => (states.Count(s => s == "in"), states.Count(s => s != "na"));

    public record Transition(string Lifecycle, int? StageNo);

    /// <summary>
    /// 03 §5 — one decision at the current stage. `return` moves the pointer
    /// back; the caller APPENDS an audit entry, since full history and prior
    /// versions are preserved.
    /// </summary>
    public static Transition Decide(int currentStageNo, string decision, IReadOnlyList<PlannedStage> plan)
    {
        var active = plan.Where(p => p.Active).Select(p => p.Def.No).OrderBy(n => n).ToList();

        switch (decision)
        {
            case "approve":
                var next = active.FirstOrDefault(n => n > currentStageNo, -1);
                // Past the last stage the order is APPROVED — which changes
                // nothing about the contract until it is applied (D-09).
                return next == -1 ? new Transition("approved", null) : new Transition("pending", next);

            case "reject": return new Transition("rejected", currentStageNo);
            case "cancel": return new Transition("cancelled", currentStageNo);

            // At the first stage there is nowhere earlier to go; it stays,
            // returned to its author.
            case "return": return new Transition("returned", active.LastOrDefault(n => n < currentStageNo, currentStageNo));

            default: return new Transition("pending", currentStageNo);
        }
    }

    public record ApplyStep(int No, string Ar, string En, bool Required);

    /// <summary>
    /// 03 §6 — the seven application steps. Step 3 applies only if a rate
    /// changed. Step 4 is genuinely failable: a failure keeps the order in
    /// applied_partial and raises فشل التطبيق in the register.
    /// </summary>
    public static IReadOnlyList<ApplyStep> ApplyChecklist(bool anyRateChanged) =>
    [
        new(1, "تحديث قيمة العقد",     "Update the contract value", true),
        new(2, "تحديث كميات البنود",   "Update BOQ quantities",     true),
        new(3, "تحديث أسعار الوحدات",  "Update unit rates",         anyRateChanged),
        new(4, "إعادة احتساب الأوزان", "Recalculate weights",       true),
        new(5, "تحديث الأنشطة",        "Update activities",         true),
        new(6, "تحديث الجدول الزمني",  "Update the schedule",       true),
        new(7, "التحقق النهائي",       "Final verification",        true),
    ];

    /// <summary>03 §6 — everything done or not-required → closed.</summary>
    public static string ApplyLifecycle(IReadOnlyList<string> stepStatuses)
        => stepStatuses.All(s => s is "done" or "na") ? "closed" : "applied_partial";

    /// <summary>03 §10 — raises the فشل التطبيق chip.</summary>
    public static bool ApplyFailed(IReadOnlyList<string> stepStatuses) => stepStatuses.Contains("fail");
}

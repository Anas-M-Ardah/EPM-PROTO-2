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
    /// <param name="Owner">
    /// The owning party's name AS STORED — BR-14 matches a persona's Party
    /// against this string, so it is the Arabic one and stays that way.
    /// </param>
    /// <param name="OwnerEn">
    /// The same party for an English reader. A LABEL, never a key: nothing
    /// matches on it, and no rule may read it.
    /// </param>
    public record StageDef(int No, string Ar, string En, string Owner, string OwnerEn,
        string Condition, string NoteAr, string NoteEn);

    public static readonly IReadOnlyList<StageDef> Stages =
    [
        new(1, "دراسة الطلب", "Request study", "دائرة المهندس المقيم", "RE department", "always",
            "يُدخله المهندس المقيم بعد طلب المقاول ورأي الاستشاري، ثم يُراجع؛ يُعاد إلى المقاول إن كان ناقصاً.",
            "Entered by the resident engineer after the contractor's request and the consultant's opinion; returned to the contractor if incomplete."),

        new(2, "لجنة أوامر الغيار", "Change-order committee", "لجنة أوامر الغيار", "Change-order committee", "always",
            "تراجع الطلب وتعدّ الاستمارات؛ تُعيده إلى المهندس المقيم إن كان ناقصاً.",
            "Reviews the request and prepares the forms; returns it to the resident engineer if incomplete."),

        new(3, "تثبيت الأسعار", "Rate fixing", "لجنة تثبيت الأسعار", "Rate-fixing committee", "exceeds20",
            "تثبّت سعر الكمية الزائدة عن 20%، ثم تعيد القرار إلى لجنة أوامر الغيار.",
            "Fixes the rate for quantity beyond 20%, then returns the decision to the change-order committee."),

        new(4, "المصادقة والتخصيص", "Endorsement & allocation", "لجنة أوامر الغيار", "Change-order committee", "needsEndorsement",
            "يُرفع محضر إلى الوزير مع الموافقات الخارجية المطلوبة.",
            "Minute raised to the Minister, with the required external approvals."),

        new(5, "الأمر الوزاري وملحق العقد", "Ministerial order & addendum", "لجنة أوامر الغيار", "Change-order committee", "always",
            "يصدر الأمر الوزاري ثم ملحق العقد.",
            "Ministerial order issued, then the contract addendum."),

        new(6, "التنفيذ", "Execution", "دائرة المهندس المقيم", "RE department", "always",
            "تحديث العقد وجدول الكميات والجدول الزمني.",
            "Contract, BOQ and schedule updated."),
    ];

    public record PlannedStage(StageDef Def, bool Active, string? SkipAr, string? SkipEn);

    /// <summary>
    /// الشكل 60 · `02 §5` — the SIX stages as a supply order sees them.
    ///
    /// A تجهيز contract has no resident engineer, so the party that owns
    /// «دراسة الطلب» and «التنفيذ» on a works order does not exist on this one.
    /// لجنة الفحص والاستلام owns them instead — it is the party that signs every
    /// محضر استلام on المسار 11 and the one `EPM.voTerms`'s supply branch names.
    ///
    /// BR-14 matches a persona's Party against `Owner`, so this swap is what
    /// decides who may act; leaving it out makes a supply order UNACTIONABLE
    /// rather than merely mislabelled, because no persona carries the missing
    /// party. Stage 3 (تثبيت الأسعار) needs no swap: it is conditioned on a line
    /// tripping 20%, which a supply order never does (`02 §5`).
    /// </summary>
    public static IReadOnlyList<StageDef> StagesFor(bool supply) =>
        !supply ? Stages : Stages.Select(s => s.Owner == "دائرة المهندس المقيم"
            ? s with { Owner = "لجنة الفحص والاستلام", OwnerEn = "Inspection & receipt committee" }
            : s).ToList();

    /// <summary>
    /// The chain for one order. Returns ALL SIX — a skipped stage is marked
    /// with its reason, never dropped (03 §2).
    /// </summary>
    public static IReadOnlyList<PlannedStage> Plan(
        bool tripsThreshold, bool needsEndorsement, bool supply = false)
        => StagesFor(supply).Select(s => s.Condition switch
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

    /// <param name="Key">approve · return · reject · cancel · resubmit · apply.</param>
    /// <param name="NeedsNote">
    /// `03 §5` — a return or a rejection without a stated reason is a decision
    /// the next reader cannot act on, so the comment is REQUIRED and the record
    /// keeps it.
    /// </param>
    public record Decision(string Key, bool NeedsNote, bool Danger);

    /// <summary>
    /// 03 §5 · §3 · §7 — WHICH decisions this viewer can take on this order,
    /// from where it actually stands. Availability is a rule, not a UI state:
    /// the browser renders what this returns and adds nothing.
    ///
    /// Three things narrow it:
    ///   1. BR-14 — only `awaiting` (the stage's owner) or `recorder` (the
    ///      delegate, and then only for external parties) may act at all.
    ///   2. `03 §3` — a stage with a PENDING external party cannot be
    ///      completed, so `approve` disappears while one is outstanding. The
    ///      order can still be RETURNED: a defective order should not have to
    ///      wait on a ministry reply to be sent back.
    ///   3. The lifecycle — a returned order is resubmitted, an approved one is
    ///      applied, and a closed or rejected one takes nothing.
    /// </summary>
    public static IReadOnlyList<Decision> Available(
        string lifecycle, string relation, IReadOnlyList<string> externalStates)
    {
        var canAct = ViewerRelation.CanAct(relation);
        if (!canAct) return [];

        switch (lifecycle)
        {
            case "pending":
            {
                var list = new List<Decision>();

                // `03 §3` — the stage cannot complete while a party is out.
                if (CanCompleteStage(externalStates))
                    list.Add(new("approve", false, false));

                list.Add(new("return", true, false));
                list.Add(new("reject", true, true));
                // D-04 — only the two stage-4 parties may cancel, and the
                // endpoint checks that; offering it here at all is what makes
                // the check reachable.
                list.Add(new("cancel", true, true));
                return list;
            }

            // `03 §5` — a returned order is with its originator to revise, and
            // the one thing they do with it is send it back in.
            case "returned":
                return [new("resubmit", false, false)];

            // `02 §9` — approving changed nothing; APPLYING is what moves the
            // contract. `applied_partial` is a run that stopped, so it offers
            // the same action again rather than a different one.
            case "approved":
            case "applied_partial":
                return [new("apply", false, false)];

            default:
                return [];
        }
    }

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

    /// <param name="No">Display order, 1..9 — the order الشكل 30 prints them in.</param>
    /// <param name="SpecStep">
    /// The same step's number in `03 §6`'s list of seven, or null for the two
    /// the plate adds. Both numbers travel because both are cited: a reader
    /// checking the written rule counts to seven, and a reader holding الشكل 30
    /// counts to nine.
    /// </param>
    public record ApplyStep(int No, int? SpecStep, string Ar, string En, bool Required);

    /// <summary>
    /// The application checklist. `03 §6` lists SEVEN steps; **الشكل 30 prints
    /// NINE** — «قسم حالة تطبيق الأمر يعرض تسع خطوات» — and names them. The two
    /// it adds are not decoration:
    ///
    ///   إصدار ملحق العقد          — BR-09's amendment row is what MAKES the new
    ///                               figures effective; without it "approved ≠
    ///                               applied" has no step that separates them.
    ///   إعادة احتساب الغرامات     — BR-10 charges the penalty against the
    ///                               contractual finish, so an approved
    ///                               extension moves the baseline it is
    ///                               measured from.
    ///
    /// So the nine are rendered and each carries its `03 §6` number where it
    /// has one. Step 4 (spec 3) applies only if a rate changed; step 8 only if
    /// the order carries approved days; step 5 (spec 4) is the genuinely
    /// failable one — a failure keeps the order in applied_partial and raises
    /// فشل التطبيق in the register.
    /// </summary>
    public static IReadOnlyList<ApplyStep> ApplyChecklist(bool anyRateChanged, bool extendsTime = true) =>
    [
        new(1, null, "إصدار ملحق العقد",              "Issue the contract amendment", true),
        new(2, 1,    "تحديث قيمة العقد النافذة",       "Update the effective contract value", true),
        new(3, 2,    "تحديث كميات البنود",             "Update BOQ quantities",     true),
        new(4, 3,    "تحديث أسعار الوحدات",            "Update unit rates",         anyRateChanged),
        new(5, 4,    "إعادة احتساب الأوزان",           "Recalculate weights",       true),
        new(6, 5,    "تحديث الأنشطة",                  "Update activities",         true),
        new(7, 6,    "تحديث الجدول الزمني",            "Update the schedule",       true),
        new(8, null, "إعادة احتساب الغرامات التأخيرية", "Recalculate delay penalties", extendsTime),
        new(9, 7,    "التحقق النهائي",                 "Final verification",        true),
    ];

    /// <summary>03 §6 — everything done or not-required → closed.</summary>
    public static string ApplyLifecycle(IReadOnlyList<string> stepStatuses)
        => stepStatuses.All(s => s is "done" or "na") ? "closed" : "applied_partial";

    /// <summary>03 §10 — raises the فشل التطبيق chip.</summary>
    public static bool ApplyFailed(IReadOnlyList<string> stepStatuses) => stepStatuses.Contains("fail");
}

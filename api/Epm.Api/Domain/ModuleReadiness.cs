namespace Epm.Api.Domain;

/// <summary>
/// الشكل 4's «خط سير المراحل» — where the project stands across its modules,
/// and «الإجراء التالي المطلوب» that follows from it.
///
/// ── IT READS STATE, IT DOES NOT INVENT IT ─────────────────────────────────
/// الشكل 4 illustrates the strip with an APPROVAL vocabulary — معتمد · قيد
/// الإنجاز · جاهز للمراجعة · مُعاد بملاحظات — and §79 says «خط سير المراحل يقرأ
/// حالة كل وحدة من الوحدة نفسها».
///
/// This system has no per-module approval state: it was removed from المسار 1
/// and المسار 2 at the client's instruction, so nothing could populate «معتمد»
/// truthfully. Labelling a module approved because it merely holds rows would
/// be a fabricated verdict on a screen a manager makes decisions from.
///
/// So the strip reports what IS knowable — whether a module has been started,
/// whether it holds anything, and whether something in it is waiting on
/// someone — and says «غير متاح» for the modules that do not exist yet. The
/// vocabulary is deliberately NOT the document's four approval words.
///
/// No database access: the endpoint counts rows and passes the counts in, so
/// the rule stays testable and a wrong fixture cannot make a test lie.
/// </summary>
public static class ModuleReadiness
{
    // ── THE VOCABULARY ───────────────────────────────────────────────────
    // Four states, none of which claims an approval that does not exist.

    /// <summary>غير متاح — the module is not built. Not a project fact.</summary>
    public const string NotAvailable = "not-available";

    /// <summary>لم يبدأ — built, reachable, and holds nothing for this project.</summary>
    public const string NotStarted = "not-started";

    /// <summary>قيد الإنجاز — holds data. The one word borrowed from الشكل 4.</summary>
    public const string InProgress = "in-progress";

    /// <summary>يتطلب إجراء — something inside is waiting on a person.</summary>
    public const string NeedsAttention = "needs-attention";

    /// <param name="Id">Matches the rail's module id (web/features/workspace/project-modules.ts).</param>
    /// <param name="Built">False for the seven modules no page serves yet.</param>
    /// <param name="Rows">What the module holds for this project. Zero is a real answer.</param>
    /// <param name="Waiting">
    /// Rows inside it that are waiting on a person — an unapplied amendment, a
    /// change order mid-chain. This is what separates «قيد الإنجاز» from
    /// «يتطلب إجراء», and it is the only signal the next action ranks on.
    /// </param>
    public record ModuleFacts(string Id, bool Built, int Rows, int Waiting);

    /// <param name="State">One of the four constants above.</param>
    /// <param name="Waiting">Carried through so the UI can say how many.</param>
    public record ModuleState(string Id, string State, int Rows, int Waiting);

    /// <summary>One module's standing, from facts alone.</summary>
    public static ModuleState Resolve(ModuleFacts f)
    {
        if (!f.Built) return new(f.Id, NotAvailable, 0, 0);
        if (f.Waiting > 0) return new(f.Id, NeedsAttention, f.Rows, f.Waiting);
        if (f.Rows > 0) return new(f.Id, InProgress, f.Rows, 0);
        return new(f.Id, NotStarted, 0, 0);
    }

    public static IReadOnlyList<ModuleState> ResolveAll(IEnumerable<ModuleFacts> facts) =>
        facts.Select(Resolve).ToList();

    /// <summary>
    /// الشكل 4's «4/8 معتمد» counter, honestly renamed.
    ///
    /// The document counts APPROVED modules. With no approval state, the
    /// defensible counter is STARTED out of AVAILABLE — how much of the project
    /// has been begun — and the UI labels it as that, not as approval.
    /// Modules that do not exist are excluded from both halves rather than
    /// counted as incomplete: a phase-6 module is not this project's shortfall.
    /// </summary>
    public static (int Started, int Available) Progress(IEnumerable<ModuleState> states)
    {
        var live = states.Where(s => s.State != NotAvailable).ToList();
        return (live.Count(s => s.State != NotStarted), live.Count);
    }

    /// <summary>
    /// «الإجراء التالي المطلوب» — the one module the project most needs a person
    /// in, or null when nothing is waiting.
    ///
    /// ── THE PRIORITY IS THE PROMPT'S, AND IT IS DELIBERATELY DUMB ─────────
    /// needs-attention → not-started → (nothing). Ties break on RAIL ORDER, so
    /// the answer follows the order the documents already put the modules in
    /// rather than a weighting nobody specified.
    ///
    /// `in-progress` is NOT a next action: a module holding data with nothing
    /// waiting is working as intended, and pointing a manager at it every visit
    /// would train them to ignore the control.
    ///
    /// Returns null — «لا يوجد إجراء مطلوب» — rather than inventing one. A
    /// command centre that always demands something is noise.
    /// </summary>
    public static ModuleState? NextAction(IReadOnlyList<ModuleState> statesInRailOrder) =>
        statesInRailOrder.FirstOrDefault(s => s.State == NeedsAttention)
        ?? statesInRailOrder.FirstOrDefault(s => s.State == NotStarted);
}

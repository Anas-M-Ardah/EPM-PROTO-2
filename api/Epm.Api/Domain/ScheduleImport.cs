namespace Epm.Api.Domain;

/// <summary>
/// المسار 4 · الشكل 24 — استيراد الجدول الزمني.
///
/// «معالج بخمس خطوات: الصيغة والملف · تحليل الملف · التحقق · تحليل الأثر ·
/// تأكيد وتقديم» over «Primavera XER · P6 XML · Excel», with «خيارا أساس احتساب
/// وزن هيكل التجزئة (الكلفة المدرجة أو ساعات العمل المدرجة)».
///
/// This is steps 3 and 4 of that wizard — the validation and the impact — and
/// nothing else. Reading the file is the client's job, writing the version is
/// the endpoint's, exactly as `Domain/BoqImport` splits المسار 3.
///
/// ── THE IMPORT NEVER REPLACES ANYTHING ───────────────────────────────────
/// Same rule as the bill, and for a stronger reason: `Activities.BaselineStart`
/// and `BaselineFinish` are what every slip, every float and every planned
/// percentage in the system is measured from. Replacing them silently would
/// move the meaning of «الانزياح» on every screen at once. So a submission
/// writes a VERSION; approving it is a separate, deliberate act.
///
/// ── WHAT IS CHECKED, AND WHY EACH ────────────────────────────────────────
///   معرّف مكرر        two rows claiming one activity id. P6 guarantees these
///                     unique inside a project; a file where they are not has
///                     been edited by hand or merged from two exports.
///   خط أساس ناقص      an activity with no baseline dates. `PlannedProgress`
///                     returns nothing for it, so it would sit in the schedule
///                     contributing zero planned percent while carrying cost —
///                     which reads as "behind" and is really "not imported".
///   نهاية قبل بداية   a baseline that ends before it starts. Not a warning: it
///                     makes every duration and float derived from it negative.
///   أساس الوزن مفقود  BR-02's basis. On `cost` every assignable activity needs
///                     a positive budgeted cost; on `manhours` it needs hours.
///                     A single zero would let one activity earn nothing while
///                     the weights still sum to 100, so the check is on the SET.
///   سابقة مجهولة      a predecessor that names no activity in the file. The
///                     schedule tab prints these; one that points nowhere is a
///                     dangling reference the person should see before it lands.
///
/// A MILESTONE IS EXEMPT FROM THE BASIS CHECK, and only from that one: `02 §2`
/// gives it zero cost and zero hours by definition and excludes it from every
/// denominator. It is not exempt from needing dates.
/// </summary>
public static class ScheduleImport
{
    public const string BasisCost = "cost";
    public const string BasisManHours = "manhours";

    /// <summary>Primavera XER · P6 XML · Excel — الشكل 24's three format options.</summary>
    public static bool IsKnownFormat(string? f) => f is "xer" or "p6xml" or "excel";

    public static bool IsKnownBasis(string? b) => b is BasisCost or BasisManHours;

    /// <param name="Row">1-based row number IN THE FILE, so a violation can be pointed at.</param>
    /// <param name="WbsPath">Dotted, as `01 §2.5` stores it. Empty is allowed — an unfiled activity is still work.</param>
    /// <param name="Predecessors">Comma-separated activity ids, as P6 exports them.</param>
    public record Candidate(
        int Row,
        string ActivityId,
        string Name,
        string WbsPath,
        string WbsNames,
        DateOnly? BaselineStart,
        DateOnly? BaselineFinish,
        decimal BudgetedCost,
        decimal? BudgetedManHours,
        bool IsMilestone,
        string Predecessors)
    {
        /// <summary>Baseline duration in days. Zero on a milestone, by definition.</summary>
        public int Duration =>
            BaselineStart is null || BaselineFinish is null
                ? 0
                : BaselineFinish.Value.DayNumber - BaselineStart.Value.DayNumber + 1;
    }

    public record Violation(int Row, string Field, string MessageAr, string MessageEn);

    /// <summary>
    /// Every violation, not the first. A wizard that reports one problem per
    /// upload makes a person re-upload once per row (`04 §9`).
    /// </summary>
    public static IReadOnlyList<Violation> Validate(IReadOnlyList<Candidate> rows, string basis)
    {
        var found = new List<Violation>();

        if (rows.Count == 0)
        {
            found.Add(new Violation(0, "file",
                "الملف لا يحتوي على أي نشاط.", "The file contains no activities."));
            return found;
        }

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var ids = new HashSet<string>(rows.Select(r => r.ActivityId), StringComparer.OrdinalIgnoreCase);

        foreach (var r in rows)
        {
            if (string.IsNullOrWhiteSpace(r.ActivityId))
                found.Add(new Violation(r.Row, "activityId",
                    "معرّف النشاط مطلوب.", "The activity id is required."));
            else if (!seen.Add(r.ActivityId))
                found.Add(new Violation(r.Row, "activityId",
                    $"معرّف مكرر: {r.ActivityId}.", $"Duplicate activity id: {r.ActivityId}."));

            if (string.IsNullOrWhiteSpace(r.Name))
                found.Add(new Violation(r.Row, "name",
                    "اسم النشاط مطلوب.", "The activity name is required."));

            if (r.BaselineStart is null || r.BaselineFinish is null)
                found.Add(new Violation(r.Row, "baseline",
                    "خط الأساس ناقص — لا يمكن قياس الانزياح ولا المخطط بدونه.",
                    "The baseline is incomplete — neither slip nor planned progress can be measured without it."));
            else if (r.BaselineFinish.Value < r.BaselineStart.Value)
                found.Add(new Violation(r.Row, "baseline",
                    "نهاية خط الأساس قبل بدايته.", "The baseline finish is before its start."));

            // 02 §2 — a milestone carries no basis BY DEFINITION and is out of
            // every denominator. It is exempt here and nowhere else.
            if (!r.IsMilestone)
            {
                if (basis == BasisCost && r.BudgetedCost <= 0m)
                    found.Add(new Violation(r.Row, "cost",
                        "الكلفة المدرجة مطلوبة وموجبة على أساس الكلفة.",
                        "A positive budgeted cost is required on the cost basis."));

                if (basis == BasisManHours && (r.BudgetedManHours ?? 0m) <= 0m)
                    found.Add(new Violation(r.Row, "manhours",
                        "ساعات العمل المدرجة مطلوبة وموجبة على أساس ساعات العمل.",
                        "Positive budgeted man-hours are required on the man-hours basis."));
            }

            foreach (var pred in (r.Predecessors ?? "")
                         .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                if (!ids.Contains(pred))
                    found.Add(new Violation(r.Row, "predecessors",
                        $"سابقة مجهولة: {pred}.", $"Unknown predecessor: {pred}."));
        }

        return found;
    }

    // ── step 4 — «تحليل الأثر» ────────────────────────────────────────────

    /// <param name="Kind">added · removed · moved · unchanged.</param>
    /// <param name="SlipDays">
    /// The incoming baseline finish minus the one in force, SIGNED. Only
    /// meaningful on `moved`, and it is the whole point of the step: an import
    /// that pushes the last activity out pushes the contract out with it.
    /// </param>
    public record Change(
        string ActivityId,
        string Name,
        string Kind,
        DateOnly? BeforeFinish,
        DateOnly? AfterFinish,
        int SlipDays);

    /// <param name="FinishBefore">The latest baseline finish in the schedule in force.</param>
    /// <param name="FinishAfter">The latest in the incoming file.</param>
    /// <param name="ContractFinishDelta">
    /// After − before, SIGNED. This is what a person is being asked to accept:
    /// a revised programme that ends later than the one in force is a claim on
    /// the contract's own dates, and `03` gives that to a change order — never
    /// to an import. The wizard states it; it does not act on it.
    /// </param>
    public record Impact(
        int Added,
        int Removed,
        int Moved,
        int Unchanged,
        DateOnly? FinishBefore,
        DateOnly? FinishAfter,
        int ContractFinishDelta,
        IReadOnlyList<Change> Changes);

    public record Existing(string ActivityId, string Name, DateOnly? BaselineFinish);

    /// <summary>
    /// What the incoming file would change, if it were approved. DESCRIBES —
    /// it writes nothing and decides nothing.
    /// </summary>
    public static Impact Compare(IReadOnlyList<Candidate> incoming, IReadOnlyList<Existing> current)
    {
        var byId = current.ToDictionary(c => c.ActivityId, StringComparer.OrdinalIgnoreCase);
        var incomingIds = new HashSet<string>(incoming.Select(r => r.ActivityId), StringComparer.OrdinalIgnoreCase);

        var changes = new List<Change>();
        int added = 0, moved = 0, unchanged = 0;

        foreach (var r in incoming)
        {
            if (!byId.TryGetValue(r.ActivityId, out var was))
            {
                added++;
                changes.Add(new Change(r.ActivityId, r.Name, "added", null, r.BaselineFinish, 0));
                continue;
            }

            var slip = was.BaselineFinish is null || r.BaselineFinish is null
                ? 0
                : r.BaselineFinish.Value.DayNumber - was.BaselineFinish.Value.DayNumber;

            if (slip == 0) { unchanged++; continue; }

            moved++;
            changes.Add(new Change(r.ActivityId, r.Name, "moved", was.BaselineFinish, r.BaselineFinish, slip));
        }

        // AN ACTIVITY THAT DISAPPEARS IS THE MOST CONSEQUENTIAL CHANGE OF ALL —
        // it carries BOQ links, progress and earned value, and a file that
        // simply omits it would take them with it. Counted and named.
        var removed = 0;
        foreach (var c in current.Where(c => !incomingIds.Contains(c.ActivityId)))
        {
            removed++;
            changes.Add(new Change(c.ActivityId, c.Name, "removed", c.BaselineFinish, null, 0));
        }

        var before = current.Where(c => c.BaselineFinish is not null)
            .Select(c => c.BaselineFinish!.Value)
            .DefaultIfEmpty()
            .Max();
        var after = incoming.Where(r => r.BaselineFinish is not null)
            .Select(r => r.BaselineFinish!.Value)
            .DefaultIfEmpty()
            .Max();

        var haveBefore = current.Any(c => c.BaselineFinish is not null);
        var haveAfter = incoming.Any(r => r.BaselineFinish is not null);

        return new Impact(
            added, removed, moved, unchanged,
            haveBefore ? before : null,
            haveAfter ? after : null,
            haveBefore && haveAfter ? after.DayNumber - before.DayNumber : 0,
            changes
                .OrderByDescending(c => Math.Abs(c.SlipDays))
                .ThenBy(c => c.ActivityId, StringComparer.Ordinal)
                .ToList());
    }
}

namespace Epm.Api.Domain;

/// <summary>
/// المسار 1 — تعريف المشروع وربطه بالجامعة, validation half.
///
/// WHAT MAKES A PROJECT DEFINITION VALID (المسار 1 step 3). It is a business
/// rule, so it is here rather than in the endpoint — CLAUDE.md §3.1 lets an
/// endpoint filter, join, sort and project, and not much else.
///
/// ── THE TRACK'S APPROVAL HALF IS DELIBERATELY ABSENT ──────────────────────
/// المسار 1 steps 5–8 define a draft → review → approve/return workflow, and it
/// was built. The client then removed it: a project is SAVED, and is live as
/// soon as it is saved. So there is no state machine here, no `draft`, and no
/// «إعادة بملاحظات». This file checks a definition and says nothing about who
/// may bless it.
///
/// What that changes for the rules below: they now run at SAVE rather than at
/// submit. There is no later gate, so this is the only one.
///
/// The practical payoff is CLAUDE.md §4's: these rules are testable without a
/// database, so a wrong fixture cannot make a test lie about whether a project
/// with a zero cost may be saved.
/// </summary>
public static class ProjectDefinition
{
    /// <summary>
    /// المسار 1 step 3 — «تحقق: اكتمال الحقول الإلزامية وصحة سنة الإدراج
    /// والكلفة». One rule per documented clause, each carrying the message the
    /// user will read. Codes are stable; the Arabic is what reaches the screen.
    /// </summary>
    public record Violation(string Field, string MessageAr, string MessageEn);

    /// <summary>
    /// What the caller hands over for checking. A record rather than the entity
    /// so the rule cannot accidentally read a column it has no business reading,
    /// and so the tests can construct a case in one line.
    /// </summary>
    public record Candidate(
        string NameAr,
        string Type,
        int? RegistrationYear,
        string ExecutionStage,
        string FundingType,
        string WorkspaceCode,
        decimal? PlannedCost,
        string BeneficiaryCodes);

    /// <summary>
    /// The earliest سنة إدراج this system will accept.
    ///
    /// ── ASSUMPTION, NOT A DOCUMENTED RULE ────────────────────────────────
    /// المسار 1 requires «صحة سنة الإدراج» and does not say what makes a year
    /// valid. A bound is needed for the rule to mean anything, so this is the
    /// loosest one that still catches the errors the field actually attracts —
    /// a typo'd century, and a project registered against a plan year that has
    /// not been drawn up yet. Reported as an assumption; one constant to change
    /// if the ministry states a real range.
    /// </summary>
    public const int EarliestRegistrationYear = 2000;

    /// <summary>
    /// Every violation, not just the first. A form that reveals one problem per
    /// save makes the specialist save five times to learn five things.
    /// Empty means the definition may be saved.
    /// </summary>
    /// <param name="dataDateYear">
    /// The project data date's year — «now» (D-06), never DateTime.Now. A
    /// project may be registered against next year's plan, so the ceiling is
    /// one year ahead of it.
    /// </param>
    public static IReadOnlyList<Violation> Validate(Candidate c, int dataDateYear)
    {
        var v = new List<Violation>();

        // ── 1. اكتمال الحقول الإلزامية ────────────────────────────────────
        // المسار 1 step 2 names the four groups that must be entered: «الهوية
        // والموقع والتمويل والجهة المستفيدة». These are the fields inside them
        // that the track goes on to depend on.
        //
        // الشكل 5 puts «نجمة على الحقول الإلزامية» but does NOT enumerate which
        // carry the star — so this set is derived from step 2's four groups and
        // is flagged in the report rather than presented as documented.
        if (string.IsNullOrWhiteSpace(c.NameAr))
            v.Add(new("nameAr", "اسم المشروع مطلوب.", "Project name is required."));

        if (string.IsNullOrWhiteSpace(c.Type))
            v.Add(new("type", "نوع المشروع مطلوب.", "Project type is required."));

        if (string.IsNullOrWhiteSpace(c.ExecutionStage))
            v.Add(new("executionStage", "مرحلة التنفيذ مطلوبة.", "Execution stage is required."));

        if (string.IsNullOrWhiteSpace(c.FundingType))
            v.Add(new("fundingType", "نوع التمويل مطلوب.", "Funding type is required."));

        if (string.IsNullOrWhiteSpace(c.BeneficiaryCodes))
            v.Add(new("beneficiaryCodes", "الجهة المستفيدة مطلوبة.", "Beneficiary is required."));

        // ── 2. صحة سنة الإدراج ────────────────────────────────────────────
        if (c.RegistrationYear is null)
            v.Add(new("registrationYear", "سنة الإدراج مطلوبة.", "Registration year is required."));
        else if (c.RegistrationYear < EarliestRegistrationYear || c.RegistrationYear > dataDateYear + 1)
            v.Add(new("registrationYear",
                $"سنة الإدراج يجب أن تقع بين {EarliestRegistrationYear} و{dataDateYear + 1}.",
                $"Registration year must be between {EarliestRegistrationYear} and {dataDateYear + 1}."));

        // ── 3. الكلفة المقررة أكبر من صفر ─────────────────────────────────
        // Stated as an inequality in the documents, so it is checked as one:
        // null and zero are both failures, and so is a negative.
        if (c.PlannedCost is null)
            v.Add(new("plannedCost", "الكلفة المقررة مطلوبة.", "Planned cost is required."));
        else if (c.PlannedCost <= 0)
            v.Add(new("plannedCost",
                "الكلفة المقررة يجب أن تكون أكبر من صفر.",
                "Planned cost must be greater than zero."));

        // ── 4. انتماء المشروع إلى تشكيل واحد ──────────────────────────────
        // ONE workspace, and the column holds one code, so the failure this can
        // actually have is an ABSENT one — a project belonging to no تشكيل at
        // all. That is the case the register would silently drop.
        if (string.IsNullOrWhiteSpace(c.WorkspaceCode))
            v.Add(new("workspaceCode",
                "يجب أن ينتمي المشروع إلى تشكيل واحد.",
                "The project must belong to exactly one entity."));

        return v;
    }
}

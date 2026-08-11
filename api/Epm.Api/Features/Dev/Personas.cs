namespace Epm.Api.Features.Dev;

/// <summary>
/// The seven personas from 03 §7. Held in code rather than a table because they
/// are part of the specification, not data someone maintains.
///
/// `Party` is what matters for the change-order chain: ChangeOrderStage.OwnerParty
/// is compared against it to resolve the viewer relation (BR-14) — awaiting ·
/// recorder · acted · upcoming · none — which drives every action-gating decision
/// in the UI.
///
/// ── `Workspaces` / `MinistryWide` ARE THE ASSIGNMENT MODEL (BR-15) ────────
/// `العرض الفني §24` defines assignment as «إسناد المستخدم أو المجموعة إلى دور
/// ضمن نطاق محدّد (مساحة عمل أو مشروع)» and §7 makes the user's visibility the
/// UNION of those assignments. This prototype models the workspace half of that
/// scope and nothing else: a persona carries the list of workspace codes it is
/// assigned to, and a ministry-level persona carries `MinistryWide = true`,
/// which is §7's «اطلاع شامل» for المركز.
///
/// There is deliberately NO group, role, permission or policy table. The role a
/// persona plays is already `Party`, and the only decision this phase has to
/// demonstrate is WHICH WORKSPACES a user may see and enter. Domain/WorkspaceAccess
/// holds the rule; this file holds the data it reads.
/// </summary>
/// <param name="Workspaces">
/// Workspace codes this persona is assigned to. Matched against Workspace.Code.
/// Ignored when <paramref name="MinistryWide"/> is true.
/// </param>
/// <param name="MinistryWide">
/// §7 — a ministry-centre user whose scope is the whole portfolio. The single
/// documented exception to assignment-by-workspace.
/// </param>
public record Persona(
    string Id,
    string NameAr,
    string NameEn,
    string Party,
    string RoleAr,
    string RoleEn,
    bool IsDelegate,
    IReadOnlyList<string> Workspaces,
    bool MinistryWide);

public static class Personas
{
    /// <summary>
    /// The assignments below are illustrative and match the workspace codes in
    /// Features/Dev/Fixture.cs — ub · nu · tu · spd · cu. They exist so the
    /// documented rule is DEMONSTRABLE: switching persona has to visibly change
    /// which workspaces exist for you.
    ///
    ///   user.re-dept          ub                  one university
    ///   user.project-manager  ub                  one university
    ///   user.co-committee     ub · nu             two
    ///   user.co-rapporteur    ub · nu             two (delegate for the same scope)
    ///   user.rate-committee   ub · tu · spd       three, including a directorate
    ///   user.endorsement      ministry-wide       everything
    ///   user.senior-mgmt      ministry-wide       everything
    /// </summary>
    public static readonly IReadOnlyList<Persona> All =
    [
        new("user.re-dept", "م. علي حسن", "Ali Hasan",
            "دائرة المهندس المقيم", "مهندس مقيم", "Resident engineer", false,
            ["ub"], false),

        new("user.co-committee", "م. زينب عبد الله", "Zainab Abdullah",
            "لجنة أوامر الغيار", "عضو لجنة أوامر الغيار", "Change-order committee member", false,
            ["ub", "nu"], false),

        new("user.co-rapporteur", "م. حيدر كاظم", "Haider Kadhim",
            "لجنة أوامر الغيار", "مقرّر لجنة أوامر الغيار", "Change-order committee rapporteur", true,
            ["ub", "nu"], false),

        new("user.rate-committee", "م. سارة كريم", "Sara Karim",
            "لجنة تثبيت الأسعار", "عضو لجنة تثبيت الأسعار", "Rate-fixing committee member", false,
            ["ub", "tu", "spd"], false),

        new("user.project-manager", "م. مصطفى علي", "Mustafa Ali",
            "مدير المشروع", "مدير مشروع", "Project manager", false,
            ["ub"], false),

        new("user.endorsement", "د. ليلى حسن", "Layla Hasan",
            "لجنة المراجعة المصادقة", "عضو لجنة المراجعة المصادقة", "Endorsement review committee member", false,
            [], true),

        new("user.senior-mgmt", "د. أحمد فؤاد", "Ahmed Fouad",
            "المستوى الإداري الأعلى", "مدير عام", "Senior management", false,
            [], true),
    ];

    public const string DefaultId = "user.re-dept";

    public static Persona Resolve(string? id) =>
        All.FirstOrDefault(p => p.Id == id) ?? All.First(p => p.Id == DefaultId);
}

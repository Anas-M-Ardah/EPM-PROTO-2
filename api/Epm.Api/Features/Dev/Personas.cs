namespace Epm.Api.Features.Dev;

/// <summary>
/// The capacities of 03 §7. Held in code rather than a table because they are
/// part of the specification, not data someone maintains.
///
/// ── ONE USER, EIGHT CAPACITIES ────────────────────────────────────────────
/// There is exactly one identity in this prototype — <see cref="MasterNameAr"/>
/// — and the switcher chooses which CAPACITY that one person is acting in. The
/// rows below are therefore ROLES, not colleagues: they all carry the same name
/// and differ in `Party`, `RoleAr`, `Workspaces` and `MinistryWide`.
///
/// This is what «العرض بصفة» has always meant — *viewing as* — and reading the
/// list as eight different employees was the confusion this collapse removes.
///
/// ── WHY THE IDS AND PARTIES DID NOT CHANGE ────────────────────────────────
/// `Id` is referenced as DATA: Fixture seeds `AcknowledgedByUserId`,
/// `CreatedByUserId` and `UploadedByUserId` with these strings, and renaming
/// them would orphan every one of those rows.
///
/// `Party` is load-bearing for BR-14: `ChangeOrderStage.OwnerParty` is compared
/// against it to resolve the viewer relation (awaiting · recorder · acted ·
/// upcoming · none), which gates every action on SCR-W8. Five of the rows below
/// are the five stage owners the change-order chain seeds. Collapsing them into
/// one would resolve every stage to `none` and silently kill that screen.
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
    /// THE ONE IDENTITY. Every capacity below carries this name, because they
    /// are all the same person acting in a different صفة. The switcher changes
    /// the capacity; it never changes who you are.
    /// </summary>
    public const string MasterNameAr = "م. أحمد الربيعي";
    public const string MasterNameEn = "Ahmed Al-Rubaie";

    /// <summary>
    /// THE CAPACITIES, all of them the same person. The assignments are
    /// illustrative and match the workspace codes in Features/Dev/Fixture.cs —
    /// ub · nu · tu · spd · cu. They exist so the documented rule is
    /// DEMONSTRABLE: changing capacity has to visibly change which workspaces
    /// exist for you and which actions the screens offer.
    ///
    ///   user.univ-specialist  ub                  one university — enters المسار 1
    ///   user.re-dept          ub                  one university
    ///   user.project-manager  ub                  one university
    ///   user.co-committee     ub · nu             two
    ///   user.co-rapporteur    ub · nu             two (delegate for the same scope)
    ///   user.rate-committee   ub · tu · sp       three, including a directorate
    ///   user.endorsement      ministry-wide       everything
    ///   user.senior-mgmt      ministry-wide       everything
    /// </summary>
    public static readonly IReadOnlyList<Persona> All =
    [
        // ── المسار 1's DATA-ENTRY ACTOR ──────────────────────────────────
        // §23 gives project definition to «المستخدم المختص»: «إدخال البيانات في
        // مصدرها: تعريف المشروع…». §7 puts them at the الجامعة/التشكيل level —
        // «إدخال وتحديث المشاريع والعقود والإنجاز».
        //
        // NOT `user.project-manager` below — that is مدير المشروع, a role
        // INSIDE one project, not the entity's data-entry specialist.
        //
        // The track's REVIEWER persona (إدارة المشاريع) was removed with the
        // approval workflow: with no review step there was nothing for it to do.
        new("user.univ-specialist", MasterNameAr, MasterNameEn,
            "الجامعة / التشكيل", "المستخدم المختص في الجامعة", "University specialist", false,
            ["ub"], false),

        new("user.re-dept", MasterNameAr, MasterNameEn,
            "دائرة المهندس المقيم", "مهندس مقيم", "Resident engineer", false,
            ["ub"], false),

        new("user.co-committee", MasterNameAr, MasterNameEn,
            "لجنة أوامر الغيار", "عضو لجنة أوامر الغيار", "Change-order committee member", false,
            ["ub", "nu"], false),

        new("user.co-rapporteur", MasterNameAr, MasterNameEn,
            "لجنة أوامر الغيار", "مقرّر لجنة أوامر الغيار", "Change-order committee rapporteur", true,
            ["ub", "nu"], false),

        new("user.rate-committee", MasterNameAr, MasterNameEn,
            "لجنة تثبيت الأسعار", "عضو لجنة تثبيت الأسعار", "Rate-fixing committee member", false,
            ["ub", "tu", "sp"], false),

        new("user.project-manager", MasterNameAr, MasterNameEn,
            "مدير المشروع", "مدير مشروع", "Project manager", false,
            ["ub"], false),

        new("user.endorsement", MasterNameAr, MasterNameEn,
            "لجنة المراجعة المصادقة", "عضو لجنة المراجعة المصادقة", "Endorsement review committee member", false,
            [], true),

        new("user.senior-mgmt", MasterNameAr, MasterNameEn,
            "المستوى الإداري الأعلى", "مدير عام", "Senior management", false,
            [], true),
    ];

    /// <summary>
    /// The capacity the app opens in. المسار 1 is the phase in build, and its
    /// actor is «المستخدم المختص» — opening in a capacity that cannot define a
    /// project would hide the register's own primary action on first paint.
    /// </summary>
    public const string DefaultId = "user.univ-specialist";

    public static Persona Resolve(string? id) =>
        All.FirstOrDefault(p => p.Id == id) ?? All.First(p => p.Id == DefaultId);

    /// <summary>
    /// «المستخدم المختص» — the capacity §23 gives project definition to.
    ///
    /// Matched on Party rather than on Id so the check reads as the business
    /// rule it is, and so a second university persona would inherit it.
    ///
    /// This is the ONLY project capacity left. Its counterpart —
    /// `CanReviewProjects`, for إدارة المشاريع — went with the approval
    /// workflow, and with it §7's «يُفصل صراحةً بين صلاحية الإدخال وصلاحية
    /// الاعتماد»: there is no approval capacity to separate input from.
    /// </summary>
    public static bool CanDefineProjects(this Persona p) => p.Party == "الجامعة / التشكيل";

    /// <summary>
    /// المسار 3 step 7 — «اعتماد الإصدار الجديد».
    ///
    /// SEPARATION OF DUTIES IS THE POINT. The track has two lanes either side of
    /// the approval: «المستخدم المختص» submits (step 6) and «إدارة المشاريع»
    /// approves (step 7). One capacity doing both would make the approval a
    /// formality, and this bill decides contract value, payments and earned
    /// value — so `CanDefineProjects` is deliberately NOT accepted here.
    ///
    /// ── THE LANE HAS NO EXACT PERSONA, AND THAT IS REPORTED ──────────────
    /// `03 §7`'s list has no party literally called «إدارة المشاريع». The two
    /// project-side capacities are دائرة المهندس المقيم — who supervises the
    /// works the bill measures — and مدير المشروع. Both are accepted; the rate
    /// and change-order committees are not, because their remit is a PRICED
    /// DECISION on a line, not the bill as a document. Flagged in DECISIONS.
    /// </summary>
    public static bool CanApproveBoqImport(this Persona p) =>
        p.Party is "دائرة المهندس المقيم" or "مدير المشروع";
}

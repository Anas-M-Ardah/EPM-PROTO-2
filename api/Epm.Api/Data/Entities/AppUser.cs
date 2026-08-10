namespace Epm.Api.Data.Entities;

/// <summary>
/// Spec 03 §7. There is no authentication in this prototype — the persona
/// middleware reads the X-Epm-User header and looks the user up here.
/// The permission MODEL is real and resolved server-side; the identity is not.
///
/// System-user parties (real accounts):
///   دائرة المهندس المقيم · لجنة تثبيت الأسعار · لجنة أوامر الغيار ·
///   مدير المشروع · لجنة المراجعة المصادقة · المستوى الإداري الأعلى
/// Plus the delegate role: مقرّر لجنة أوامر الغيار (IsDelegate = true).
///
/// NOT system users (recorded via a delegate, see ChangeOrderExternalParty):
///   المقاول · الاستشاري · الوزير/المفوَّض · الدائرة الإدارية والمالية · قسم العقود الحكومية
/// </summary>
public class AppUser
{
    /// <summary>Natural key, e.g. "user.re-dept".</summary>
    public string Id { get; set; } = "";

    public string NameAr { get; set; } = "";
    public string NameEn { get; set; } = "";

    /// <summary>
    /// The party this user acts as. Matches ChangeOrderStage.OwnerParty, which is
    /// how ViewerRelation (BR-14) decides whether the viewer owns the current stage.
    /// </summary>
    public string Party { get; set; } = "";

    public string RoleAr { get; set; } = "";
    public string RoleEn { get; set; } = "";

    /// <summary>
    /// Spec 03 §4 — the change-order committee rapporteur records external-party
    /// outcomes on behalf of non-system parties. Drives the `recorder` relation.
    /// </summary>
    public bool IsDelegate { get; set; }
}

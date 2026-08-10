namespace Epm.Api.Features.Dev;

/// <summary>
/// The seven personas from 03 §7. Held in code rather than a table because they
/// are part of the specification, not data someone maintains.
///
/// `Party` is what matters: ChangeOrderStage.OwnerParty is compared against it
/// to resolve the viewer relation (BR-14) — awaiting · recorder · acted ·
/// upcoming · none — which drives every action-gating decision in the UI.
/// </summary>
public record Persona(string Id, string NameAr, string NameEn, string Party, string RoleAr, string RoleEn, bool IsDelegate);

public static class Personas
{
    public static readonly IReadOnlyList<Persona> All =
    [
        new("user.re-dept", "م. علي حسن", "Ali Hasan",
            "دائرة المهندس المقيم", "مهندس مقيم", "Resident engineer", false),

        new("user.co-committee", "م. زينب عبد الله", "Zainab Abdullah",
            "لجنة أوامر الغيار", "عضو لجنة أوامر الغيار", "Change-order committee member", false),

        new("user.co-rapporteur", "م. حيدر كاظم", "Haider Kadhim",
            "لجنة أوامر الغيار", "مقرّر لجنة أوامر الغيار", "Change-order committee rapporteur", true),

        new("user.rate-committee", "م. سارة كريم", "Sara Karim",
            "لجنة تثبيت الأسعار", "عضو لجنة تثبيت الأسعار", "Rate-fixing committee member", false),

        new("user.project-manager", "م. مصطفى علي", "Mustafa Ali",
            "مدير المشروع", "مدير مشروع", "Project manager", false),

        new("user.endorsement", "د. ليلى حسن", "Layla Hasan",
            "لجنة المراجعة المصادقة", "عضو لجنة المراجعة المصادقة", "Endorsement review committee member", false),

        new("user.senior-mgmt", "د. أحمد فؤاد", "Ahmed Fouad",
            "المستوى الإداري الأعلى", "مدير عام", "Senior management", false),
    ];

    public const string DefaultId = "user.re-dept";

    public static Persona Resolve(string? id) =>
        All.FirstOrDefault(p => p.Id == id) ?? All.First(p => p.Id == DefaultId);
}

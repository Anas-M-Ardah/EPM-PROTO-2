using Epm.Api.Data.Entities;

namespace Epm.Api.Features.ProjectAlerts;

/// <summary>
/// ملحق الشكل 47 — the fourteen project alert rules, as a set any project can
/// be given (P-268).
///
/// ── WHY THIS EXISTS ──────────────────────────────────────────────────────
/// The rules used to exist only as fixture rows on PRJ-0279
/// (`Fixture.AlertRules`), so every project defined through المسار 1 had no
/// rule and therefore could never raise an alert: the live audit of 2026-09-13
/// drove a project through BOQ, schedule, progress, payments and change orders
/// and its inbox stayed at zero. A project now receives this set when it is
/// defined, and any project that still has none receives it the first time
/// its alerts are read.
///
/// The codes, conditions, severities, channels, recurrences and escalation
/// ceilings are the fixture's, unchanged — the fixture is the plate's own list.
/// Illustrative, not ministry data.
/// </summary>
public static class DefaultAlertRules
{
    public static IReadOnlyList<AlertRule> For(string projectId)
    {
        AlertRule R(string code, string ar, string en, string trigAr, string trigEn,
                    string sev, bool email, bool sms, string recurrence, int? escalateHours) => new()
        {
            ProjectId = projectId, Code = code, NameAr = ar, NameEn = en,
            TriggerAr = trigAr, TriggerEn = trigEn, Severity = sev,
            ChannelInApp = true, ChannelEmail = email, ChannelSms = sms,
            Recurrence = recurrence, EscalateAfterHours = escalateHours, Enabled = true,
        };

        return
        [
            R("R1", "تأخر نشاط على المسار الحرج", "Critical-path activity delay",
                "انزياح ≥ 5 أيام", "Slip ≥ 5 days", "critical", true, true, "daily", 48),
            R("R2", "تجاوز الصرف للتخصيص", "Spend exceeds allocation",
                "الصرف ≥ 90%", "Spend ≥ 90%", "warning", true, false, "weekly", 120),
            R("R3", "اقتراب معلم", "Milestone approaching",
                "خلال 45 يوماً", "Within 45 days", "warning", false, false, "once", null),
            R("R4", "تقرير إنجاز شهري مفقود", "Monthly progress report missing",
                "لا تحديث منذ 40 يوماً", "No update for 40 days", "warning", true, false, "daily", 72),
            R("R5", "وثيقة إلزامية بانتظار الاعتماد", "Mandatory document awaiting approval",
                "حالة الوثيقة ≠ معتمدة", "Document status ≠ approved", "info", false, false, "stage-change", null),
            R("R6", "إجراء اجتماع متأخر", "Overdue meeting action",
                "إجراء مفتوح > 21 يوماً", "Open action > 21 days", "warning", true, false, "weekly", 120),
            R("R7", "خطر مرتفع مفتوح", "Open high risk",
                "شدة عالية + مفتوح", "High severity + open", "critical", true, true, "daily", 48),
            R("R8", "أمر تغييري بانتظار القرار", "Change order awaiting a decision",
                "الحالة = قيد الاعتماد", "Status = under approval", "warning", true, false, "weekly", 120),
            R("R9", "تجاوز الصرف التراكمي للكلفة", "Cumulative spend exceeds cost",
                "الصرف التراكمي ≥ 90%", "Cumulative spend ≥ 90%", "critical", true, true, "weekly", 120),
            R("R10", "مهلة تقديم مطالبة التمديد", "Extension claim submission window",
                "خلال 28 يوماً من الإشعار", "Within 28 days of the notice", "warning", true, true, "daily", 168),
            R("R11", "موعد حسم لجنة التمديد", "Extension committee decision date",
                "قبل المهلة القانونية", "Before the statutory deadline", "warning", true, false, "weekly", 240),
            R("R12", "تجاوز مهلة تدقيق المعاملة", "Audit desk SLA breached",
                "تجاوز سقف مرحلة التدقيق", "Past the audit stage ceiling", "critical", true, true, "daily", 48),
            R("R13", "بنود كميات غير مخصَّصة على أنشطة", "BOQ lines not assigned to activities",
                "حالة التخصيص = غير مخصَّص", "Coverage = unassigned", "warning", true, false, "weekly", 120),
            R("R14", "تجاوز في تخصيص بند على الأنشطة", "BOQ line over-allocated to activities",
                "مجموع الحصص > 100%", "Σ shares > 100%", "critical", true, false, "daily", 48),
        ];
    }
}

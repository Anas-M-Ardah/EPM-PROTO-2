namespace Epm.Api.Data.Entities;

/// <summary>
/// قاعدة تنبيه — SCR-W13 · **ملحق الشكل 47**.
///
/// ── THE RULE IS THE SOURCE OF THE ALERT ──────────────────────────────────
/// The plate states it in a notice of its own: *«إيقاف قاعدة يوقف التنبيهات
/// التي أنتجتها فورًا — التنبيه ليس سجلًا مستقلًا يُحرَّر»*. So
/// <see cref="Alert.RuleCode"/> points here, and switching <see cref="Enabled"/>
/// off withdraws that rule's alerts from the inbox the moment it is written —
/// no second column on the alert, nothing to keep in step.
///
/// ── THE CONDITION IS RECORDED, NOT EVALUATED ─────────────────────────────
/// <see cref="TriggerAr"/> is the prose الشكل 47 prints — «انزياح ≥ 5 أيام»,
/// «الصرف ≥ 90%». Nothing in this prototype parses it, and no scheduler fires
/// it; `07 §2` lists the delivery engine as POC work. Storing the condition as
/// a parsed expression would claim an engine that does not exist (P-119).
///
/// ── PER PROJECT ──────────────────────────────────────────────────────────
/// الشكل 47 is «قواعد التنبيه على مستوى المشروع» — the twelve rules belong to
/// PRJ-0170, and a second project can enable a different set. An enterprise
/// default catalogue is not built.
/// </summary>
public class AlertRule
{
    public int Id { get; set; }

    public string ProjectId { get; set; } = "";

    /// <summary>R1 … R12 — «الرمز», and what an alert points at.</summary>
    public string Code { get; set; } = "";

    public string NameAr { get; set; } = "";
    public string NameEn { get; set; } = "";

    /// <summary>«شرط الإطلاق» — prose, deliberately (see the note above).</summary>
    public string TriggerAr { get; set; } = "";
    public string TriggerEn { get; set; } = "";

    /// <summary>Lookup `alert-severity` — critical حرج · warning متوسط · info منخفض.</summary>
    public string Severity { get; set; } = "warning";

    /// <summary>«القنوات» — داخل النظام · بريد · رسالة. None of them dispatch anything yet.</summary>
    public bool ChannelInApp { get; set; } = true;
    public bool ChannelEmail { get; set; }
    public bool ChannelSms { get; set; }

    /// <summary>Lookup `alert-recurrence` — daily · weekly · once · stage-change.</summary>
    public string Recurrence { get; set; } = "once";

    /// <summary>
    /// «التصعيد بعد» in HOURS. Null is the plate's «بلا تصعيد» — a rule that
    /// notifies and stops. Stored as one number so 48 hours and 2 days cannot
    /// be recorded as two different things; the unit shown is display
    /// formatting (`core/format.ts`).
    /// </summary>
    public int? EscalateAfterHours { get; set; }

    /// <summary>«الحالة» — مفعّلة / موقوفة. The switch on every row of الشكل 47.</summary>
    public bool Enabled { get; set; } = true;
}

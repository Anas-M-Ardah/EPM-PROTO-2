using Epm.Api.Data.Entities;

namespace Epm.Api.Features.Lookups;

/// <summary>
/// The twenty value lists of 06-DATA-DICTIONARY.md §1–§11, as code, plus a
/// clearly-marked ADDENDUM of three lists 06 does not define (alert severity,
/// kind and status — see the marker near the bottom of Rows() and P-26).
///
/// ── WHY THIS IS NOT IN Fixture.cs ─────────────────────────────────────────
/// Fixture.cs is illustrative demo data and says so. These lists are not:
/// they are the specification's own enumerations, every stored code in the
/// system comes from one of them, and a wrong row here is a wrong label on
/// every screen. Keeping them beside their endpoint means one grep for
/// "boq-change-type" finds the list, the endpoint and the Angular caller.
/// Fixture.Load() calls Rows() so they land in the database with everything
/// else — nothing is seeded on boot (P-03).
///
/// Each block carries its 06 section. AR is the primary label (06 preamble);
/// where the client's own wording exists in reference/app/data.jsx it is used
/// verbatim rather than re-translated.
///
/// The CODE is what other tables store. Never change a code to fix a label.
/// </summary>
public static class LookupCatalog
{
    /// <summary>Every row of every list, ready for db.Lookups.AddRange().</summary>
    public static IEnumerable<Lookup> Rows()
    {
        var sort = 0;
        Lookup L(string kind, string code, string ar, string en) =>
            new() { Kind = kind, Code = code, NameAr = ar, NameEn = en, Sort = sort++ };

        // ── 06 §1 — project status, the 5-state canonical set ─────────────
        // Also the 5 states a contract shares with a project; the extended
        // 9-state contract list below adds four more on top of these.
        sort = 0;
        yield return L("project-status", "ongoing",   "مستمر",  "Ongoing");
        yield return L("project-status", "completed", "منجز",   "Completed");
        yield return L("project-status", "delayed",   "متأخر",  "Delayed");
        yield return L("project-status", "suspended", "متوقف",  "Suspended");
        yield return L("project-status", "cancelled", "ملغى",   "Cancelled");

        // ── المسار 1 step 4 — الفئة الإنفاقية ─────────────────────────────
        // One of the three values the system SUGGESTS at definition
        // («اشتقاق الرمز والمنطقة والفئة الإنفاقية تلقائيًا»). الشكل 5 shows
        // «صيانة» on its worked example; the rest follow the expenditure split
        // the ministry's own budget lines use. NOT enumerated in `06`, so this
        // list is ours and is flagged as such in the report.
        sort = 0;
        yield return L("expenditure-category", "maintenance",  "صيانة",          "Maintenance");
        yield return L("expenditure-category", "construction", "تشييد",          "Construction");
        yield return L("expenditure-category", "equipment",    "تجهيز",          "Equipment");
        yield return L("expenditure-category", "studies",      "دراسات",         "Studies");
        yield return L("expenditure-category", "operational",  "نفقات تشغيلية",  "Operational");

        // ── الشكل 5 — أولوية المشروع ──────────────────────────────────────
        // A LOOKUP, not free text. الشكل 5 renders it as a value list and the
        // live prototype offers exactly these three; the worked example is
        // «متوسطة». Codes are latin like every other kind, so the Arabic stays
        // a label the ministry can reword without touching a row.
        sort = 0;
        yield return L("priority", "high",   "عالية",  "High");
        yield return L("priority", "medium", "متوسطة", "Medium");
        yield return L("priority", "low",    "منخفضة", "Low");

        // ── الشكل 5 — المنطقة الجغرافية ───────────────────────────────────
        // Also a lookup: الشكل 5's worked example is «ديالى» and المسار 1 step 4
        // derives the value «من الجهة», which it can only do against a list.
        // The eleven governorates the prototype offers — NOT all eighteen: this
        // is the set the system has been shown with, and inventing the rest
        // would put values on screen no document has ever carried.
        sort = 0;
        yield return L("region", "baghdad",   "بغداد",    "Baghdad");
        yield return L("region", "basra",     "البصرة",   "Basra");
        yield return L("region", "nineveh",   "نينوى",    "Nineveh");
        yield return L("region", "diyala",    "ديالى",    "Diyala");
        yield return L("region", "anbar",     "الأنبار",  "Anbar");
        yield return L("region", "karbala",   "كربلاء",   "Karbala");
        yield return L("region", "babil",     "بابل",     "Babil");
        yield return L("region", "wasit",     "واسط",     "Wasit");
        yield return L("region", "qadisiyah", "القادسية", "Qadisiyah");
        yield return L("region", "dhiqar",    "ذي قار",   "Dhi Qar");
        yield return L("region", "kirkuk",    "كركوك",    "Kirkuk");

        // ── 06 §2 — execution stages (12) ─────────────────────────────────
        // The construction-progress list the projects carry. NOT the same as
        // data.jsx's PROJECT_STAGES, which is an administrative lifecycle list
        // (دراسة · إعلان وإحالة · سحب عمل · تسوية حسابات …). See DECISIONS P-12.
        sort = 0;
        yield return L("execution-stage", "design",               "تصميم",                                   "Design");
        yield return L("execution-stage", "tender",               "إعلان ومناقصة",                           "Tender");
        yield return L("execution-stage", "award",                "إحالة",                                   "Award");
        yield return L("execution-stage", "mobilisation",         "تجهيز وتهيئة الموقع",                     "Mobilisation");
        yield return L("execution-stage", "foundations",          "أعمال الأسس",                             "Foundations");
        yield return L("execution-stage", "structure",            "الهيكل الإنشائي",                         "Structure");
        yield return L("execution-stage", "envelope",             "الغلاف الخارجي",                          "Envelope");
        yield return L("execution-stage", "mep-first-fix",        "التمديدات الكهروميكانيكية — المرحلة الأولى", "MEP first fix");
        yield return L("execution-stage", "finishes",             "الإكساء والتشطيبات",                      "Finishes");
        yield return L("execution-stage", "mep-second-fix",       "التمديدات الكهروميكانيكية — المرحلة الثانية", "MEP second fix");
        yield return L("execution-stage", "testing-commissioning","الفحص والتشغيل التجريبي",                 "Testing & commissioning");
        yield return L("execution-stage", "handover",             "الاستلام والتسليم",                       "Handover");

        // ── 06 §3 — project types (3) ─────────────────────────────────────
        // The client's own three-way split (D-13), replacing the earlier eight
        // — new-build · extension · rehabilitation · maintenance ·
        // equipment-supply · infrastructure · studies-design · consultancy.
        // Those eight were a classification we inferred from the documents;
        // these three are the department's actual programme families, so every
        // project falls in exactly one and no code outside the three is valid.
        sort = 0;
        yield return L("project-type", "construction",   "المشاريع الإنشائية",                         "Construction");
        yield return L("project-type", "equipment",      "مشاريع التجهيز",                             "Equipment supply");
        yield return L("project-type", "design-studies", "مشاريع التصنيف (التصاميم والدراسات الفنية)", "Design & technical studies");

        // ── 06 §4 — extended contract status (9) ──────────────────────────
        // The 5-state set plus four contract-only states. Arabic for the four
        // is the client's own wording from data.jsx CONTRACT_STATUS_LIST.
        sort = 0;
        yield return L("contract-status", "ongoing",                "مستمر",                      "Ongoing");
        yield return L("contract-status", "completed",              "منجز",                       "Completed");
        yield return L("contract-status", "delayed",                "متأخر",                      "Delayed");
        yield return L("contract-status", "suspended",              "متوقف",                      "Suspended");
        yield return L("contract-status", "cancelled",              "ملغى",                       "Cancelled");
        yield return L("contract-status", "awarded-not-started",    "لم يباشر به",                "Awarded — not started");
        yield return L("contract-status", "suspended-admin-order",  "موقوف مؤقتاً بأمر إداري",    "Suspended by administrative order");
        yield return L("contract-status", "under-settlement",       "تسوية حسابات",               "Under settlement");
        yield return L("contract-status", "terminated",             "سحب عمل",                    "Terminated");

        // ── 06 §5 — funding types (10) ────────────────────────────────────
        sort = 0;
        yield return L("funding-type", "federal-budget",          "الموازنة الاتحادية",   "Federal budget");
        yield return L("funding-type", "regional-budget",         "تنمية الأقاليم",       "Regional budget");
        yield return L("funding-type", "loan",                    "قرض",                  "Loan");
        yield return L("funding-type", "grant",                   "منحة",                 "Grant");
        yield return L("funding-type", "self-funding",            "تمويل ذاتي",           "Self-funding");
        yield return L("funding-type", "investment",              "استثماري",             "Investment");
        yield return L("funding-type", "reconstruction-fund",     "صندوق الإعمار",        "Reconstruction fund");
        yield return L("funding-type", "emergency-allocation",    "تخصيص طارئ",           "Emergency allocation");
        yield return L("funding-type", "carry-over-allocation",   "تخصيص مُدوَّر",         "Carry-over allocation");
        yield return L("funding-type", "other",                   "أخرى",                 "Other");

        // ── 06 §6 — beneficiary types (6) ─────────────────────────────────
        sort = 0;
        yield return L("beneficiary-type", "university", "جامعة",       "University");
        yield return L("beneficiary-type", "department", "دائرة",       "Department");
        yield return L("beneficiary-type", "campus",     "حرم جامعي",   "Campus");
        yield return L("beneficiary-type", "site",       "موقع",        "Site");
        yield return L("beneficiary-type", "facility",   "منشأة",       "Facility");
        yield return L("beneficiary-type", "other",      "أخرى",        "Other");

        // ── WORKSPACE KINDS (4) — ملحق الشاشات، الشكل 1 ────────────────────
        // The four filter chips the workspace register shows, verbatim from the
        // addendum: «جامعة حكومية · جامعة تقنية · وحدة مركزية · مديرية تجهيز».
        //
        // A workspace kind is NOT a beneficiary type. The register used to label
        // itself from `beneficiary-type`, which shares the word "university" and
        // nothing else — a directorate rendered as the raw code `directorate`
        // because that list has no such entry. Two different vocabularies for
        // two different things (01 §2.1: beneficiaries RECEIVE quantity;
        // workspaces OWN projects — see P-24).
        sort = 0;
        yield return L("workspace-kind", "state-university",     "جامعة حكومية",  "State university");
        yield return L("workspace-kind", "technical-university", "جامعة تقنية",   "Technical university");
        yield return L("workspace-kind", "central-unit",         "وحدة مركزية",   "Central unit");
        yield return L("workspace-kind", "supply-directorate",   "مديرية تجهيز",  "Supply directorate");

        // ── 06 §7 — change-order type. ONLY TWO. ──────────────────────────
        sort = 0;
        yield return L("co-type", "engineering", "هندسي — كلفة / مدة",          "Engineering — cost / duration");
        yield return L("co-type", "supply",      "تجهيز / إعادة توزيع كميات",   "Supply / quantity redistribution");

        // ── 06 §7 — BOQ change type ───────────────────────────────────────
        // "Add new BOQ item" is deliberately ABSENT: new items come from BOQ
        // Management, never from the change-order wizard (06 §7, 03 §8).
        sort = 0;
        yield return L("boq-change-type", "inc",    "زيادة كمية",      "Increase quantity");
        yield return L("boq-change-type", "dec",    "نقص كمية",        "Decrease quantity");
        yield return L("boq-change-type", "rate",   "تعديل السعر",     "Change unit rate");
        yield return L("boq-change-type", "del",    "إلغاء بند",       "Cancel item");
        yield return L("boq-change-type", "redist", "إعادة توزيع",     "Quantity redistribution");

        // ── 06 §7 — activity change type ──────────────────────────────────
        sort = 0;
        yield return L("activity-change-type", "inc",    "زيادة المدة",                   "Increase duration");
        yield return L("activity-change-type", "dec",    "تقليل المدة",                   "Decrease duration");
        yield return L("activity-change-type", "start",  "تعديل تاريخ البداية",           "Change start date");
        yield return L("activity-change-type", "finish", "تعديل تاريخ النهاية",           "Change finish date");
        yield return L("activity-change-type", "both",   "تعديل البداية والنهاية",        "Change start and finish dates");

        // ── 06 §7 — order lifecycle ───────────────────────────────────────
        // 06 §7 lists six keys. 03 §6's lifecycle needs two more — `approved`
        // (agreed, contract NOT yet changed — the whole point of "approved ≠
        // applied") and `cancelled` (03 §5's fourth decision terminates an
        // order). Both are added here and recorded as P-13 in DECISIONS.md.
        sort = 0;
        yield return L("co-lifecycle", "draft",           "مسودة",                 "Draft");
        yield return L("co-lifecycle", "pending",         "قيد الاعتماد",          "Pending");
        yield return L("co-lifecycle", "returned",        "معاد للتعديل",          "Returned");
        yield return L("co-lifecycle", "approved",        "معتمد",                 "Approved");
        yield return L("co-lifecycle", "applied_partial", "معتمد — قيد التطبيق",   "Approved — applying");
        yield return L("co-lifecycle", "closed",          "مغلق",                  "Closed");
        yield return L("co-lifecycle", "rejected",        "مرفوض",                 "Rejected");
        yield return L("co-lifecycle", "cancelled",       "ملغى",                  "Cancelled");

        // ── 06 §7 — decisions (03 §5) ─────────────────────────────────────
        sort = 0;
        yield return L("decision", "approve", "موافقة",           "Approve");
        yield return L("decision", "reject",  "رفض",              "Reject");
        yield return L("decision", "return",  "إعادة للتعديل",    "Return for revision");
        yield return L("decision", "cancel",  "إلغاء الموضوع",    "Cancel");

        // ── 06 §7 — application-step status (03 §6) ───────────────────────
        sort = 0;
        yield return L("apply-step-status", "na",   "غير مطلوب",     "Not required");
        yield return L("apply-step-status", "todo", "لم يبدأ",       "Not started");
        yield return L("apply-step-status", "wip",  "قيد التنفيذ",   "In progress");
        yield return L("apply-step-status", "done", "مكتمل",         "Complete");
        yield return L("apply-step-status", "fail", "فشل",           "Failed");

        // ── 06 §7 — weight-recalculation state ────────────────────────────
        sort = 0;
        yield return L("weight-recalc-state", "none",     "لم يُحتسب",         "Not computed");
        yield return L("weight-recalc-state", "review",   "محسوب للمراجعة",    "Computed for review");
        yield return L("weight-recalc-state", "approved", "معتمد",             "Approved");
        yield return L("weight-recalc-state", "applied",  "مطبق",              "Applied");
        yield return L("weight-recalc-state", "fail",     "فشل التحقق",        "Validation failed");

        // ── 06 §7 — external-party state (03 §3) ──────────────────────────
        sort = 0;
        yield return L("external-party-state", "wait", "بانتظار الجهة", "Awaiting the party");
        yield return L("external-party-state", "in",   "وردت",          "Received");
        yield return L("external-party-state", "back", "أُعيد",         "Returned");
        yield return L("external-party-state", "na",   "غير مطلوب",     "Not required");

        // ── 06 §7 — viewer relation (03 §7) ───────────────────────────────
        // BR-14 resolves exactly one of these per order per viewer, and the
        // whole action-gating UI is driven from it.
        sort = 0;
        yield return L("viewer-relation", "awaiting", "بانتظار إجرائك",                 "Awaiting your action");
        yield return L("viewer-relation", "recorder", "تسجيل نيابة عن جهة خارجية",      "Recording for an external party");
        yield return L("viewer-relation", "acted",    "تم إجراؤك",                      "You have acted");
        yield return L("viewer-relation", "upcoming", "سيصلك لاحقاً",                   "Reaches you later");
        yield return L("viewer-relation", "none",     "للاطلاع",                        "For information");

        // ── 06 §7 — attachment categories (03 §8 step 4) ──────────────────
        // 06 gives the six Arabic labels without keys; these codes are ours.
        sort = 0;
        yield return L("attachment-category", "letter",   "كتاب رسمي",              "Official letter");
        yield return L("attachment-category", "drawing",  "مخطط",                   "Drawing");
        yield return L("attachment-category", "boq",      "كشف كميات",              "Bill of quantities");
        yield return L("attachment-category", "analysis", "تحليل مالي أو زمني",     "Financial or schedule analysis");
        yield return L("attachment-category", "photos",   "صور موقع",               "Site photos");
        yield return L("attachment-category", "support",  "مستند داعم",             "Supporting document");


        // ── ملحق الشكل 43 — سجل المخاطر ───────────────────────────────────
        // The plate's own seven categories. No written section defines a risk
        // taxonomy, so the screen is the specification (see Domain/RiskSeverity).
        sort = 0;
        yield return L("risk-category", "schedule",  "زمني",     "Schedule");
        yield return L("risk-category", "financial", "مالي",     "Financial");
        yield return L("risk-category", "operational", "تشغيلي", "Operational");
        yield return L("risk-category", "legal",     "قانوني",   "Legal");
        yield return L("risk-category", "technical", "فني",      "Technical");
        yield return L("risk-category", "quality",   "جودة",     "Quality");
        yield return L("risk-category", "safety",    "سلامة",    "Safety");

        // Three levels on BOTH axes, and the SAME three on the product — which
        // is what «الخطورة = الاحتمالية × التأثير» means on a screen that shows
        // منخفض · متوسط · عالي in all three columns.
        sort = 0;
        yield return L("risk-level", "low",    "منخفض", "Low");
        yield return L("risk-level", "medium", "متوسط", "Medium");
        yield return L("risk-level", "high",   "عالي",  "High");

        sort = 0;
        yield return L("risk-status", "open",       "مفتوح",        "Open");
        yield return L("risk-status", "mitigating", "تحت المعالجة", "Being mitigated");
        yield return L("risk-status", "suspended",  "معلق",         "On hold");

        // BR-11's four, as the register's «المؤشر» column names them. They are
        // the tie between a risk and a number somebody can check.
        sort = 0;
        yield return L("risk-indicator", "SPI", "SPI", "SPI");
        yield return L("risk-indicator", "CPI", "CPI", "CPI");
        yield return L("risk-indicator", "EAC", "EAC", "EAC");
        yield return L("risk-indicator", "VAC", "VAC", "VAC");


        // ── ملحق الشكل 45 — سجل الإجراءات ─────────────────────────────────
        sort = 0;
        yield return L("action-priority", "high",   "عالية",  "High");
        yield return L("action-priority", "medium", "متوسطة", "Medium");
        yield return L("action-priority", "low",    "منخفضة", "Low");

        // «متأخر» is one of these values and not a derivation — الشكل 45 shows
        // a past-due action still reading «قيد التنفيذ» (P-116).
        sort = 0;
        yield return L("action-status", "open",       "مفتوح",       "Open");
        yield return L("action-status", "inprogress", "قيد التنفيذ", "In progress");
        yield return L("action-status", "overdue",    "متأخر",       "Overdue");
        yield return L("action-status", "closed",     "مغلق",        "Closed");


        // ── ملحق الشكل 46 — الوثائق والمخططات ─────────────────────────────
        sort = 0;
        yield return L("doc-discipline", "architectural", "معماري",           "Architectural");
        yield return L("doc-discipline", "structural",    "إنشائي",           "Structural");
        yield return L("doc-discipline", "electrical",    "كهربائي",          "Electrical");
        yield return L("doc-discipline", "mechanical",    "ميكانيكي",         "Mechanical");
        yield return L("doc-discipline", "civil",         "مدني وبنى تحتية",  "Civil & infrastructure");
        yield return L("doc-discipline", "reports",       "تقارير ومراسلات",  "Reports & correspondence");

        // «حالة الإصدار» belongs to the REVISION, not the document.
        sort = 0;
        yield return L("doc-status", "approved", "معتمد",  "Approved");
        yield return L("doc-status", "draft",    "مسوّدة", "Draft");
        yield return L("doc-status", "rejected", "مرفوض",  "Rejected");
        yield return L("doc-status", "none",     "لا مراجعات", "No revisions");

        // ── 06 §8 — amendment state (02 §9) ───────────────────────────────
        sort = 0;
        yield return L("amendment-state", "original",   "العقد الأصلي",              "Original contract");
        yield return L("amendment-state", "superseded", "مُستبدَل",                   "Superseded");
        yield return L("amendment-state", "effective",  "النافذ",                    "Effective");
        yield return L("amendment-state", "pending",    "معتمد — بانتظار التطبيق",   "Approved — awaiting application");
        yield return L("amendment-state", "partial",    "قيد التطبيق",               "Applying");

        // ── 06 §9 — activity status ───────────────────────────────────────
        sort = 0;
        yield return L("activity-status", "notstarted", "لم يبدأ",       "Not started");
        yield return L("activity-status", "inprogress", "قيد التنفيذ",   "In progress");
        yield return L("activity-status", "ahead",      "متقدّم",        "Ahead");
        yield return L("activity-status", "delayed",    "متأخر",         "Delayed");
        yield return L("activity-status", "completed",  "مكتمل",         "Completed");

        // ── 06 §10 — distribution state (02 §8) ───────────────────────────
        sort = 0;
        yield return L("distribution-state", "none",    "غير موزّعة",        "Not distributed");
        yield return L("distribution-state", "partial", "موزّعة جزئياً",     "Partially distributed");
        yield return L("distribution-state", "full",    "موزّعة كلياً",      "Fully distributed");
        yield return L("distribution-state", "over",    "تتجاوز الكمية",     "Exceeds the quantity");

        // ── 06 §11 — allocation coverage (02 §3) ──────────────────────────
        // NOT the BOQ financial weight. Coverage compares Σ allocation shares
        // to 100%; conflating the two was an early error (02 §3).
        sort = 0;
        yield return L("allocation-coverage", "unassigned", "غير مخصص",         "Unassigned");
        yield return L("allocation-coverage", "full",       "مخصص بالكامل",     "Fully assigned");
        yield return L("allocation-coverage", "partial",    "مخصص جزئياً",      "Partially assigned");
        yield return L("allocation-coverage", "over",       "تخصيص زائد",       "Over-assigned");

        // ── الشكل 50 — حالة الفقرة التجهيزية (Domain/SupplyStatus) ────────
        // The plate's own five chips, and its own words: «مستلم بالكامل ·
        // استلام جزئي · محجوز — بانتظار الاستلام · لم تُجهَّز». Four codes plus
        // «الكل», which the register draws itself.
        sort = 0;
        yield return L("supply-status", "received", "مستلم بالكامل",             "Fully received");
        yield return L("supply-status", "partial",  "استلام جزئي",               "Partially received");
        yield return L("supply-status", "supplied", "محجوز — بانتظار الاستلام",  "Supplied — awaiting receipt");
        yield return L("supply-status", "pending",  "لم تُجهَّز",                  "Not yet supplied");

        // ══ ADDENDUM — NOT IN 06 ══════════════════════════════════════════
        // The three lists below are OURS, not the data dictionary's. 06 §1–§11
        // stops before alerts, yet Alerts.Severity, Alerts.Kind and the derived
        // alert status are stored codes that need AR/EN labels like any other
        // enum — and P-11's whole argument is that stored codes belong here, so
        // one mechanism (EP-LKP-01 → core/lookups.ts) labels every one of them.
        //
        // Keeping them in this file rather than in the page means the client can
        // correct the wording without a code change, exactly as for the 06 lists.
        // The codes come from the Alert entity's own documented vocabularies.
        // See DECISIONS P-26 — 06 needs these three sections adding.

        // ── ADDENDUM §A1 — alert severity (SCR-E6) ────────────────────────
        // Order is worst-first: it drives the severity cards left to right.
        //
        // These are ONE alert's severity, so the Arabic agrees with «تنبيه» —
        // masculine singular, verbatim from the reference's ALERT_SEV map. The
        // cards and filter chips label a GROUP and take the feminine plural
        // (حرِجة …) from core/lang.ts, which is the same split the reference
        // makes. Two forms of one word, each correct where it stands.
        sort = 0;
        yield return L("alert-severity", "critical", "حرِج",   "High");
        yield return L("alert-severity", "warning",  "متوسط",  "Medium");
        yield return L("alert-severity", "info",     "منخفض",  "Low");

        // ── ADDENDUM §A2 — alert kind, shown as the Source column ─────────
        sort = 0;
        yield return L("alert-kind", "sla-overdue",          "تجاوز المدة المحددة",   "SLA overdue");
        yield return L("alert-kind", "apply-failed",         "فشل تطبيق أمر غيار",    "Apply failed");
        yield return L("alert-kind", "distribution-blocked", "توزيع الكميات موقوف",   "Distribution blocked");
        yield return L("alert-kind", "schedule-slip",        "انزياح الجدول الزمني",  "Schedule slip");
        yield return L("alert-kind", "budget",               "مالي",                  "Financial");
        yield return L("alert-kind", "other",                "أخرى",                  "Other");

        // ── ADDENDUM §A3 — alert status ───────────────────────────────────
        // DERIVED from Alerts.Acknowledged, not stored as a code. There is no
        // `snoozed`: nothing in 02 or 03 says when a snooze expires or who may
        // set one, so the reference's third state is not carried (Alert.cs).
        sort = 0;
        yield return L("alert-status", "open",         "مفتوح", "Open");
        yield return L("alert-status", "acknowledged", "مُقَر",  "Acknowledged");

        // ── ملحق الشكل 47 — alert rule recurrence (SCR-W13) ────────────────
        // «التكرار» on the rules table: how often a firing rule re-notifies.
        // Labels verbatim from the plate.
        sort = 0;
        yield return L("alert-recurrence", "daily",        "يومي",              "Daily");
        yield return L("alert-recurrence", "weekly",       "أسبوعي",            "Weekly");
        yield return L("alert-recurrence", "once",         "مرة واحدة",         "Once");
        yield return L("alert-recurrence", "stage-change", "عند تغيّر المرحلة", "On stage change");

        // The inbox groups, in their fixed order (Domain/AlertInbox). They are
        // labelled here so the group heading resolves the same way every other
        // enum does — not so the order can be edited: the order is the rule.
        sort = 0;
        yield return L("alert-bucket", "overdue", "متأخرة",           "Overdue");
        yield return L("alert-bucket", "today",   "مستحقة اليوم",     "Due today");
        yield return L("alert-bucket", "week",    "خلال هذا الأسبوع", "Due this week");
        yield return L("alert-bucket", "later",   "لاحقاً",            "Later");

        // ── ADDENDUM §A4 — schedule import status (SCR-E5) ────────────────
        // Whether a Primavera P6 baseline has been imported and published for a
        // project. Labels verbatim from DScheduleControl. DERIVED, not stored:
        // it is "does this project have activities", which is always `pending`
        // until Phase 4.3 registers the Activities table. See P-31.
        sort = 0;
        yield return L("schedule-import-status", "published", "منشور",   "Published");
        yield return L("schedule-import-status", "pending",   "بانتظار", "Pending");

        // ── ADDENDUM §A5 — payment kind and status (SCR-W3, Phase 4.1) ────
        // `Payments.Kind` and `Payments.Status` are STORED codes with no list
        // in 06, which is P-26's exact case: one mechanism labels every enum,
        // and a per-screen map would be a second one reachable by no grep.
        // The vocabularies are the Payment entity's own.
        //
        // The three statuses are a sequence, not a set — a certificate is
        // audited, then certified, then paid — and the gap between the last two
        // is where a delayed project's money actually sits. `EP-CON-01` counts
        // only `paid` as disbursed for exactly that reason.
        sort = 0;
        yield return L("payment-kind", "interim",           "مستخلص جارٍ",        "Interim");
        yield return L("payment-kind", "advance",           "سلفة تشغيلية",       "Advance");
        yield return L("payment-kind", "final",             "المستخلص النهائي",   "Final");
        yield return L("payment-kind", "retention-release", "إطلاق الضمان",       "Retention release");

        sort = 0;
        // الشكل 17 — the desks a certificate passes on its way to payment.
        yield return L("audit-stage", "resident-engineer", "تدقيق المهندس المقيم", "Resident engineer review");
        yield return L("audit-stage", "finance", "تدقيق الدائرة المالية", "Finance department review");
        yield return L("audit-stage", "audit", "التدقيق الداخلي", "Internal audit");
        yield return L("audit-stage", "disbursement", "الصرف", "Disbursement");

        yield return L("payment-status", "pending",   "قيد التدقيق", "Pending");
        yield return L("payment-status", "certified", "مصادق عليه",  "Certified");
        yield return L("payment-status", "paid",      "مصروف",       "Paid");
    }
}

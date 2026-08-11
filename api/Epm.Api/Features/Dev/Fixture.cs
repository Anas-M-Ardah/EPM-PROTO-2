using Epm.Api.Data;
using Epm.Api.Data.Entities;
using Epm.Api.Features.Lookups;

namespace Epm.Api.Features.Dev;

/// <summary>
/// ── THIS IS A FIXTURE, NOT MINISTRY DATA ─────────────────────────────────
/// Every figure here is illustrative. It is loaded ONLY when someone calls
/// POST /api/dev/load-fixture — never on boot, never automatically.
///
/// The scenario comes from 06-DATA-DICTIONARY.md §12, which is the one dataset
/// the client reviewed. It exists to exercise the rules and to make the screens
/// demonstrable. It is NOT a source of truth about real projects.
///
/// The domain rule tests do NOT read this — their worked examples are inline in
/// Epm.Domain.Tests, straight from 02-BUSINESS-RULES.md. So if a figure here
/// turns out to be wrong, only this file changes and no test starts lying.
///
/// Each page appends the rows it needs. Keep it additive and keep it obvious.
/// </summary>
public static class Fixture
{
    public static void Load(EpmDb db)
    {
        // ── PHASE 1.1 Lookups ────────────────────────────────────────────
        // NOT illustrative: these are 06 §1–§11 verbatim, the specification's
        // own value lists. They live in Features/Lookups/LookupCatalog.cs and
        // are loaded here only because nothing is seeded on boot (P-03).
        db.Lookups.AddRange(LookupCatalog.Rows());

        // ── PAGE-01 Projects list ────────────────────────────────────────
        // One fully-detailed project with TWO contracts, so contract scoping
        // (01 §1) is visible from the very first screen, plus a few neighbours
        // so the list, the search and the status filter have something to do.

        db.Workspaces.AddRange(
            new Workspace { Code = "ub", NameAr = "جامعة بغداد", NameEn = "University of Baghdad", Kind = "university" },
            new Workspace { Code = "nu", NameAr = "جامعة الموصل", NameEn = "University of Mosul", Kind = "university" },
            new Workspace { Code = "tu", NameAr = "جامعة ذي قار", NameEn = "University of Thi-Qar", Kind = "university" }
        );

        db.Projects.AddRange(
            new Project
            {
                Id = "PRJ-0279", WorkspaceCode = "ub",
                NameAr = "مجمع الكليات الطبية", NameEn = "Medical Colleges Complex",
                Status = "ongoing", Type = "new-build", ExecutionStage = "structure",
                FundingType = "federal-budget", Region = "بغداد", Priority = "عالية",
                Branch = "شعبة الأبنية", Executor = "شركة الفاو الهندسية",
                DesignerParty = "المكتب الاستشاري الهندسي", ConsultantParty = "دار الهندسة",
                BeneficiaryCodes = "BEN-UOB,BEN-UOB-MED",
                DataDate = new DateOnly(2026, 8, 2),
                UpdatedAt = new DateOnly(2026, 7, 28),
            },
            new Project
            {
                Id = "PRJ-0148", WorkspaceCode = "ub",
                NameAr = "إنشاء مكتبة كلية الهندسة", NameEn = "Engineering Library",
                Status = "ongoing", Type = "new-build", ExecutionStage = "finishes",
                FundingType = "federal-budget", Region = "بغداد", Priority = "متوسطة",
                Branch = "شعبة الأبنية", Executor = "شركة بغداد للمقاولات",
                BeneficiaryCodes = "BEN-UOB-ENG",
                DataDate = new DateOnly(2026, 8, 2),
                UpdatedAt = new DateOnly(2026, 7, 15),
            },
            new Project
            {
                Id = "PRJ-0159", WorkspaceCode = "ub",
                NameAr = "تأهيل مختبرات الحاسوب", NameEn = "Computer Labs Rehabilitation",
                Status = "completed", Type = "rehabilitation", ExecutionStage = "handover",
                FundingType = "grant", Region = "بغداد", Priority = "متوسطة",
                Branch = "شعبة الصيانة", Executor = "شركة النهرين",
                BeneficiaryCodes = "BEN-UOB-ENG",
                DataDate = new DateOnly(2026, 8, 2),
                UpdatedAt = new DateOnly(2026, 3, 9),
            },
            new Project
            {
                Id = "PRJ-0207", WorkspaceCode = "nu",
                NameAr = "صيانة شبكة المياه", NameEn = "Water Network Maintenance",
                Status = "delayed", Type = "infrastructure", ExecutionStage = "mep-first-fix",
                FundingType = "reconstruction-fund", Region = "نينوى", Priority = "عالية",
                Branch = "شعبة البنى التحتية", Executor = "شركة الموصل",
                BeneficiaryCodes = "BEN-UON",
                DataDate = new DateOnly(2026, 8, 2),
                UpdatedAt = new DateOnly(2026, 6, 30),
            },
            new Project
            {
                Id = "PRJ-0277", WorkspaceCode = "tu",
                NameAr = "توسعة قاعة المؤتمرات", NameEn = "Conference Hall Expansion",
                Status = "suspended", Type = "extension", ExecutionStage = "foundations",
                FundingType = "self-funding", Region = "ذي قار", Priority = "منخفضة",
                Branch = "شعبة الأبنية", Executor = "شركة الجنوب",
                BeneficiaryCodes = "BEN-UOT",
                DataDate = new DateOnly(2026, 8, 2),
                UpdatedAt = new DateOnly(2026, 5, 12),
            }
        );

        // 06 §12 — two contracts on PRJ-0279 (civil + electromechanical) so that
        // "the contract is the working context" is visible everywhere.
        db.Contracts.AddRange(
            new Contract
            {
                Id = "CNT-0279", ProjectId = "PRJ-0279",
                NameAr = "الأعمال المدنية", NameEn = "Civil works",
                OriginalValue = 240_000_000m, Status = "ongoing",
                Start = new DateOnly(2025, 3, 1),
                OriginalFinish = new DateOnly(2026, 6, 30),
                OriginalDurationDays = 486,
                ForecastFinish = new DateOnly(2026, 8, 30),
                AwardAmount = 240_000_000m, ReserveAmount = 12_000_000m, SupervisionAmount = 6_000_000m,
                IncomingNo = "3421", IncomingDate = new DateOnly(2025, 2, 11),
                Contractor = "شركة الفاو الهندسية", Consultant = "دار الهندسة",
            },
            new Contract
            {
                Id = "CNT-0279-EM", ProjectId = "PRJ-0279",
                NameAr = "الأعمال الكهروميكانيكية", NameEn = "Electromechanical works",
                OriginalValue = 100_000_000m, Status = "ongoing",
                Start = new DateOnly(2025, 6, 1),
                OriginalFinish = new DateOnly(2026, 6, 30),
                OriginalDurationDays = 394,
                ForecastFinish = new DateOnly(2026, 8, 30),
                AwardAmount = 100_000_000m, ReserveAmount = 5_000_000m, SupervisionAmount = 2_500_000m,
                IncomingNo = "3588", IncomingDate = new DateOnly(2025, 5, 6),
                Contractor = "شركة المنصور للتجهيزات", Consultant = "دار الهندسة",
            },
            new Contract
            {
                Id = "CNT-0148", ProjectId = "PRJ-0148",
                NameAr = "إنشاء المكتبة", NameEn = "Library construction",
                OriginalValue = 68_500_000m, Status = "ongoing",
                Start = new DateOnly(2024, 9, 15),
                OriginalFinish = new DateOnly(2026, 3, 31),
                OriginalDurationDays = 562,
                ForecastFinish = new DateOnly(2026, 4, 20),
                AwardAmount = 68_500_000m, ReserveAmount = 3_400_000m, SupervisionAmount = 1_700_000m,
                IncomingNo = "2914", IncomingDate = new DateOnly(2024, 8, 22),
                Contractor = "شركة بغداد للمقاولات", Consultant = "المكتب الاستشاري",
            },
            new Contract
            {
                Id = "CNT-0207", ProjectId = "PRJ-0207",
                NameAr = "صيانة الشبكة", NameEn = "Network maintenance",
                OriginalValue = 31_200_000m, Status = "delayed",
                Start = new DateOnly(2025, 1, 10),
                OriginalFinish = new DateOnly(2025, 12, 31),
                OriginalDurationDays = 355,
                ForecastFinish = new DateOnly(2026, 5, 15),
                AwardAmount = 31_200_000m, ReserveAmount = 1_500_000m, SupervisionAmount = 800_000m,
                IncomingNo = "3102", IncomingDate = new DateOnly(2024, 12, 3),
                Contractor = "شركة الموصل", Consultant = "دار الهندسة",
            }
        );

        // ── PAGE-02 Contracts list ───────────────────────────────────────
        // Amendments exist so "approved ≠ applied" is visible on the very first
        // screen that shows a contract value (02 §9, non-negotiable #2).
        //
        // CNT-0279 carries one APPLIED amendment and one APPROVED-BUT-UNAPPLIED,
        // so its effective value (250,000,000) and its projection (253,000,000)
        // differ on screen. CNT-0279-EM has none, so both read 100,000,000 —
        // which is what makes the difference legible rather than decorative.
        db.ContractAmendments.AddRange(
            new ContractAmendment
            {
                ContractId = "CNT-0279", No = 1,
                DeltaValue = 10_000_000m, DeltaDays = 45,
                Value = 250_000_000m,
                Finish = new DateOnly(2026, 8, 14), DurationDays = 531,
                State = "effective",
                AppliedAt = new DateTime(2026, 5, 18),
            },
            new ContractAmendment
            {
                ContractId = "CNT-0279", No = 2,
                DeltaValue = 3_000_000m, DeltaDays = 12,
                Value = 253_000_000m,
                Finish = new DateOnly(2026, 8, 26), DurationDays = 543,
                // Approved by the committee, NOT yet applied. AppliedAt stays
                // null — that null is the whole rule (BR-09).
                State = "pending",
                AppliedAt = null,
            },
            new ContractAmendment
            {
                ContractId = "CNT-0148", No = 1,
                DeltaValue = 1_500_000m, DeltaDays = 20,
                Value = 70_000_000m,
                Finish = new DateOnly(2026, 4, 20), DurationDays = 582,
                State = "effective",
                AppliedAt = new DateTime(2026, 2, 3),
            }
        );

        // ── PAGE-05 Alerts Center (SCR-E6) ───────────────────────────────
        // Titles are ported from the reference feed (data.jsx buildAlertsData)
        // and re-pointed at THIS fixture's projects, so an alert names a project
        // and a contract that actually exist and the row can be traced.
        //
        // Every RaisedAt sits on or before the data date 2026-08-02 (D-06) — an
        // alert raised in the future would be nonsense, and a wall clock would
        // make the whole feed drift out of the fixture's world.
        //
        // The mix is deliberate: enough of each severity that the four cards
        // carry different numbers, some already acknowledged so the open counts
        // differ from the totals, and 18 rows so the pager has a second page at
        // the default size of 15.
        db.Alerts.AddRange(
            // PRJ-0207 — the delayed project carries the worst of it.
            new Alert { ProjectId = "PRJ-0207", Severity = "critical", Kind = "schedule-slip",
                TitleAr = "نشاط حرج «الأعمال الميكانيكية» متأخر 18 يوماً",
                TitleEn = "Critical activity “Mechanical works” delayed 18 days",
                TargetRef = "CNT-0207", RaisedAt = new DateTime(2026, 7, 18) },
            new Alert { ProjectId = "PRJ-0207", Severity = "critical", Kind = "sla-overdue",
                TitleAr = "مرحلة المراجعة الفنية تجاوزت المدة المحددة بـ 4 أيام",
                TitleEn = "Technical review stage is 4 days past its SLA",
                TargetRef = "CNT-0207", RaisedAt = new DateTime(2026, 7, 26) },
            new Alert { ProjectId = "PRJ-0207", Severity = "warning", Kind = "budget",
                TitleAr = "الصرف التراكمي بلغ 92% من التخصيص السنوي",
                TitleEn = "Cumulative spend reached 92% of the annual allocation",
                TargetRef = "CNT-0207", RaisedAt = new DateTime(2026, 7, 11) },
            new Alert { ProjectId = "PRJ-0207", Severity = "info", Kind = "other",
                TitleAr = "تقرير التقدم الشهري لشهر حزيران مُستلم",
                TitleEn = "June monthly progress report received",
                RaisedAt = new DateTime(2026, 7, 4),
                Acknowledged = true, AcknowledgedByUserId = "user.project-manager" },

            // PRJ-0279 — the two-contract project, incl. the unapplied amendment.
            new Alert { ProjectId = "PRJ-0279", Severity = "critical", Kind = "apply-failed",
                TitleAr = "تعذّر تطبيق الملحق رقم 2 — خطوة إعادة احتساب الأوزان لم تنجح",
                TitleEn = "Amendment no. 2 could not be applied — the weight recalculation step failed",
                TargetRef = "CNT-0279", RaisedAt = new DateTime(2026, 7, 30) },
            new Alert { ProjectId = "PRJ-0279", Severity = "warning", Kind = "sla-overdue",
                TitleAr = "الملحق رقم 2 معتمد منذ 21 يوماً ولم يُطبَّق بعد",
                TitleEn = "Amendment no. 2 has been approved for 21 days and is still unapplied",
                TargetRef = "CNT-0279", RaisedAt = new DateTime(2026, 7, 22) },
            new Alert { ProjectId = "PRJ-0279", Severity = "warning", Kind = "distribution-blocked",
                TitleAr = "توزيع الكميات على الجهات المستفيدة غير مكتمل لبندين",
                TitleEn = "Quantity distribution to beneficiaries is incomplete on two items",
                TargetRef = "CNT-0279-EM", RaisedAt = new DateTime(2026, 7, 19) },
            new Alert { ProjectId = "PRJ-0279", Severity = "warning", Kind = "schedule-slip",
                TitleAr = "معلم «إنجاز الهيكل» يقترب خلال 10 أيام",
                TitleEn = "Milestone “Structure complete” is 10 days away",
                RaisedAt = new DateTime(2026, 7, 9),
                Acknowledged = true, AcknowledgedByUserId = "user.re-dept" },
            new Alert { ProjectId = "PRJ-0279", Severity = "info", Kind = "other",
                TitleAr = "وثيقة إلزامية مفقودة: شهادة فحص المواد",
                TitleEn = "Mandatory document missing: material test certificate",
                RaisedAt = new DateTime(2026, 7, 2) },
            new Alert { ProjectId = "PRJ-0279", Severity = "info", Kind = "budget",
                TitleAr = "سلفة تشغيلية مصروفة بقيمة 24,000,000 د.ع",
                TitleEn = "Operating advance of IQD 24,000,000 disbursed",
                TargetRef = "CNT-0279", RaisedAt = new DateTime(2026, 6, 24),
                Acknowledged = true, AcknowledgedByUserId = "user.re-dept" },

            // PRJ-0277 — suspended.
            new Alert { ProjectId = "PRJ-0277", Severity = "critical", Kind = "schedule-slip",
                TitleAr = "المشروع متوقف منذ 84 يوماً دون قرار استئناف",
                TitleEn = "The project has been suspended for 84 days with no resumption decision",
                RaisedAt = new DateTime(2026, 7, 28) },
            new Alert { ProjectId = "PRJ-0277", Severity = "warning", Kind = "budget",
                TitleAr = "التخصيص المرصود غير مصروف — 0% من مخصص السنة",
                TitleEn = "Allocated budget undisbursed — 0% of this year's allocation",
                RaisedAt = new DateTime(2026, 7, 15) },
            new Alert { ProjectId = "PRJ-0277", Severity = "info", Kind = "other",
                TitleAr = "كتاب الجهة المستفيدة بخصوص الاستئناف مُسجَّل",
                TitleEn = "Beneficiary letter regarding resumption has been recorded",
                RaisedAt = new DateTime(2026, 6, 30) },

            // PRJ-0148 — ongoing, one applied amendment.
            new Alert { ProjectId = "PRJ-0148", Severity = "warning", Kind = "sla-overdue",
                TitleAr = "إجراء اجتماع متأخر: تسريع أعمال الكهرباء",
                TitleEn = "Overdue meeting action: accelerate electrical works",
                RaisedAt = new DateTime(2026, 6, 28) },
            new Alert { ProjectId = "PRJ-0148", Severity = "info", Kind = "other",
                TitleAr = "الملحق رقم 1 طُبِّق وحُدِّثت قيمة العقد",
                TitleEn = "Amendment no. 1 applied and the contract value updated",
                TargetRef = "CNT-0148", RaisedAt = new DateTime(2026, 2, 3),
                Acknowledged = true, AcknowledgedByUserId = "user.co-rapporteur" },

            // PRJ-0159 — completed; only closeout items remain.
            new Alert { ProjectId = "PRJ-0159", Severity = "info", Kind = "other",
                TitleAr = "محضر الاستلام النهائي بانتظار التوقيع",
                TitleEn = "Final handover certificate is awaiting signature",
                RaisedAt = new DateTime(2026, 3, 12) },

            // Enterprise-wide — ProjectId null. These exist so the null branch of
            // the project column is exercised by the fixture and not only in
            // theory: the Alerts Center is the one register whose rows are not
            // all project-scoped.
            new Alert { ProjectId = null, Severity = "warning", Kind = "other",
                TitleAr = "لم تُستورد جداول Primavera لأربعة مشاريع هذا الشهر",
                TitleEn = "Primavera schedules were not imported for four projects this month",
                RaisedAt = new DateTime(2026, 8, 1) },
            new Alert { ProjectId = null, Severity = "info", Kind = "other",
                TitleAr = "تم تحديث قوائم القيم في دليل البيانات",
                TitleEn = "The data dictionary value lists have been updated",
                RaisedAt = new DateTime(2026, 7, 6),
                Acknowledged = true, AcknowledgedByUserId = "user.senior-mgmt" }
        );

        // ── PHASE 3 · SCR-W1 Overview — the beneficiaries (01 §2.1) ──────
        // Every code already referenced by Projects.BeneficiaryCodes above, and
        // no others: an unreferenced beneficiary would be a row no screen can
        // reach. The tree is real — a faculty's ParentCode is its university,
        // which is how the overview can say "كلية الهندسة — جامعة بغداد" without
        // storing the university on the faculty.
        db.Beneficiaries.AddRange(
            new Beneficiary { Code = "BEN-UOB", NameAr = "جامعة بغداد", NameEn = "University of Baghdad",
                Type = "university" },
            new Beneficiary { Code = "BEN-UOB-ENG", NameAr = "كلية الهندسة", NameEn = "College of Engineering",
                Type = "department", ParentCode = "BEN-UOB" },
            new Beneficiary { Code = "BEN-UOB-MED", NameAr = "كلية الطب", NameEn = "College of Medicine",
                Type = "department", ParentCode = "BEN-UOB" },
            new Beneficiary { Code = "BEN-UON", NameAr = "جامعة نينوى", NameEn = "University of Nineveh",
                Type = "university" },
            new Beneficiary { Code = "BEN-UOT", NameAr = "جامعة ذي قار", NameEn = "University of Thi-Qar",
                Type = "university" }
        );

        // ── next pages append their fixture rows here ────────────────────

        db.SaveChanges();
    }
}

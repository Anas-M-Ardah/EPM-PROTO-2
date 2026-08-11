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

        // ── PHASE 4.1 · SCR-W3 Contract tab — payments ───────────────────
        // Certificates against the fixture's contracts. Every date is on or
        // before the project data date 2026-08-02 (P-28 — a demo must not pay
        // an invoice in the future), and every finance letter number follows
        // the ministry's own form: <serial>/<year>.
        //
        // The net is deliberately NOT gross − retention − advance for every
        // row on its own: retention is withheld and advance recovery is
        // deducted, so net = gross − retention − advanceRecovery, and the rows
        // below satisfy that exactly. A row that does not is a data error the
        // Financials screen (Phase 4.4) will need to surface.
        db.Payments.AddRange(
            // CNT-0279 — the civil works, three certificates, one still certified
            // but unpaid so the "certified ≠ paid" branch is exercised.
            new Payment { ContractId = "CNT-0279", No = 1, Kind = "advance",
                GrossAmount = 24_000_000m, RetentionAmount = 0m, AdvanceRecovery = 0m,
                NetAmount = 24_000_000m,
                FinanceLetterNo = "1420/2025", FinanceLetterDate = new DateOnly(2025, 4, 10),
                CertifiedDate = new DateOnly(2025, 4, 6), PaidDate = new DateOnly(2025, 4, 21),
                Status = "paid", Note = "سلفة تشغيلية 10% من مبلغ الإحالة" },
            new Payment { ContractId = "CNT-0279", No = 2, Kind = "interim",
                GrossAmount = 62_000_000m, RetentionAmount = 3_100_000m, AdvanceRecovery = 6_200_000m,
                NetAmount = 52_700_000m,
                FinanceLetterNo = "2107/2025", FinanceLetterDate = new DateOnly(2025, 11, 3),
                CertifiedDate = new DateOnly(2025, 10, 28), PaidDate = new DateOnly(2025, 11, 19),
                Status = "paid", Note = "المستخلص الأول — أعمال الأسس والهيكل" },
            new Payment { ContractId = "CNT-0279", No = 3, Kind = "interim",
                GrossAmount = 48_500_000m, RetentionAmount = 2_425_000m, AdvanceRecovery = 4_850_000m,
                NetAmount = 41_225_000m,
                FinanceLetterNo = "0931/2026", FinanceLetterDate = new DateOnly(2026, 7, 12),
                CertifiedDate = new DateOnly(2026, 7, 9), PaidDate = null,
                Status = "certified", Note = "مصادق عليه — بانتظار التخصيص المالي" },

            // CNT-0279-EM — electromechanical, one certificate only.
            new Payment { ContractId = "CNT-0279-EM", No = 1, Kind = "advance",
                GrossAmount = 10_000_000m, RetentionAmount = 0m, AdvanceRecovery = 0m,
                NetAmount = 10_000_000m,
                FinanceLetterNo = "1655/2025", FinanceLetterDate = new DateOnly(2025, 7, 8),
                CertifiedDate = new DateOnly(2025, 7, 2), PaidDate = new DateOnly(2025, 7, 20),
                Status = "paid", Note = "سلفة تشغيلية" },

            // CNT-0148 — the library, furthest along.
            new Payment { ContractId = "CNT-0148", No = 1, Kind = "interim",
                GrossAmount = 21_000_000m, RetentionAmount = 1_050_000m, AdvanceRecovery = 0m,
                NetAmount = 19_950_000m,
                FinanceLetterNo = "0788/2025", FinanceLetterDate = new DateOnly(2025, 3, 17),
                CertifiedDate = new DateOnly(2025, 3, 12), PaidDate = new DateOnly(2025, 3, 30),
                Status = "paid", Note = "المستخلص الأول" },
            new Payment { ContractId = "CNT-0148", No = 2, Kind = "interim",
                GrossAmount = 26_400_000m, RetentionAmount = 1_320_000m, AdvanceRecovery = 0m,
                NetAmount = 25_080_000m,
                FinanceLetterNo = "0402/2026", FinanceLetterDate = new DateOnly(2026, 2, 24),
                CertifiedDate = new DateOnly(2026, 2, 18), PaidDate = new DateOnly(2026, 3, 9),
                Status = "paid", Note = "المستخلص الثاني — الإكساء" },

            // CNT-0207 — delayed, and it shows: one certificate pending since
            // May with nothing paid against it.
            new Payment { ContractId = "CNT-0207", No = 1, Kind = "interim",
                GrossAmount = 7_800_000m, RetentionAmount = 390_000m, AdvanceRecovery = 0m,
                NetAmount = 7_410_000m,
                FinanceLetterNo = "0555/2026", FinanceLetterDate = new DateOnly(2026, 5, 14),
                CertifiedDate = null, PaidDate = null,
                Status = "pending", Note = "قيد التدقيق لدى الرقابة المالية" }
        );

        // ── PHASE 4.2 · SCR-W4 BOQ tab ───────────────────────────────────
        // Five tables that have to agree, and two worked examples from
        // 02-BUSINESS-RULES.md reproduced EXACTLY so the screen can be checked
        // against the spec rather than against itself:
        //
        //   02 §1  CNT-0279-EM has two items, 56,131,000 and 43,869,000 on a
        //          100,000,000 contract → weights 56.13% / 43.87%, sum 100.00%.
        //   02 §3  BQ-003 «الأسقف والسلالم» is 26,730,000 and is linked to A5
        //          (absolute weight 5.8%) and A8 (5.2%) → shares 52.7% / 47.3%,
        //          assigned 14,094,000 / 12,636,000, coverage full.
        //
        // Both fall out of the DATA, not out of a special case: A5's budgeted
        // cost is 13,920,000 of a 240,000,000 contract, which IS 5.8%.
        //
        // Σ(BOQ amounts) equals the contract's original value on both contracts.
        // That is the invariant a bill of quantities is FOR, and a fixture that
        // broke it would make every weight on screen quietly wrong.
        Boq(db);

        // ── next pages append their fixture rows here ────────────────────

        db.SaveChanges();
    }

    /// <summary>
    /// PHASE 4.2 — activities, BOQ lines, their links and their distribution.
    ///
    /// Its own method because it needs the generated keys: BoqActivityLink and
    /// BoqDistribution point at BoqItems.Id and Activities.Id, so the parents
    /// are saved first and the children are built from the ids that came back.
    /// Everything else in this file can be added in one batch.
    /// </summary>
    private static void Boq(EpmDb db)
    {
        // ── ACTIVITIES ───────────────────────────────────────────────────
        // CNT-0279 civil: ten activities and one milestone, budgeted costs
        // summing to the contract's 240,000,000. A5 = 13,920,000 = 5.80% and
        // A8 = 12,480,000 = 5.20% — 02 §3's two activities, by construction.
        //
        // Man-hours are NOT proportional to cost, deliberately: on the cost
        // basis BQ-003 splits 52.7 / 47.3, on man-hours 57.9 / 42.1. A toggle
        // that cannot change the answer is not worth having on screen (02 §2).
        db.Activities.AddRange(
            Act("CNT-0279", "A1", "التهيئة وتسوية الموقع", "Site preparation and levelling",
                "1", "الأعمال الترابية والأسس", 12_000_000m, 9_600m, 100m, "completed"),
            Act("CNT-0279", "A2", "أعمال الحفر والردم", "Excavation and backfill",
                "1", "الأعمال الترابية والأسس", 18_000_000m, 16_800m, 100m, "completed"),
            Act("CNT-0279", "A3", "خرسانة الأسس المسلحة", "Reinforced foundation concrete",
                "1", "الأعمال الترابية والأسس", 33_600_000m, 28_000m, 100m, "completed"),
            Act("CNT-0279", "A4", "الأعمدة والجسور الخرسانية", "Concrete columns and beams",
                "2", "الهيكل الإنشائي", 45_600_000m, 38_000m, 82m, "inprogress"),
            Act("CNT-0279", "A5", "الأسقف والسلالم", "Slabs and stairs",
                "2", "الهيكل الإنشائي", 13_920_000m, 13_200m, 60m, "inprogress"),
            Act("CNT-0279", "A6", "الجدران والقواطع", "Walls and partitions",
                "2", "الهيكل الإنشائي", 26_400_000m, 24_000m, 45m, "inprogress"),
            Act("CNT-0279", "A7", "التبليط والإكساء الداخلي", "Tiling and internal finishes",
                "3", "الإكساء والتشطيبات", 38_400_000m, 36_000m, 20m, "delayed"),
            Act("CNT-0279", "A8", "أعمال الواجهات", "Facade works",
                "3", "الإكساء والتشطيبات", 12_480_000m, 9_600m, 0m, "notstarted"),
            Act("CNT-0279", "A9", "الأعمال الصحية والكهربائية الأولية", "First-fix plumbing and electrical",
                "3", "الإكساء والتشطيبات", 21_600_000m, 20_400m, 15m, "inprogress"),
            Act("CNT-0279", "A10", "الأعمال الخارجية والتسليم", "External works and handover",
                "4", "الأعمال الخارجية والتسليم", 18_000_000m, 14_400m, 0m, "notstarted"),
            // Zero cost, zero man-hours, weight 0, excluded from allocation
            // (02 §2). It exists so the assignment picker has to skip it.
            Act("CNT-0279", "M1", "تسليم الهيكل الإنشائي", "Structure handover",
                "2", "الهيكل الإنشائي", 0m, 0m, 0m, "notstarted", milestone: true),

            // CNT-0279-EM electromechanical: four activities, 100,000,000.
            Act("CNT-0279-EM", "E1", "توريد المولدات ولوحات التوزيع", "Supply generators and distribution boards",
                "1", "التجهيز والتوريد", 40_000_000m, 21_000m, 55m, "inprogress"),
            Act("CNT-0279-EM", "E2", "توريد كابلات الضغط المتوسط", "Supply medium-voltage cabling",
                "1", "التجهيز والتوريد", 16_131_000m, 8_400m, 40m, "inprogress"),
            Act("CNT-0279-EM", "E3", "تركيب منظومة التكييف", "Install the HVAC system",
                "2", "التركيب والتشغيل", 28_000_000m, 18_000m, 25m, "inprogress"),
            Act("CNT-0279-EM", "E4", "الفحص والتشغيل التجريبي", "Testing and trial operation",
                "2", "التركيب والتشغيل", 15_869_000m, 9_600m, 0m, "notstarted")
        );

        // ── BOQ LINES ────────────────────────────────────────────────────
        // A code is unique WITHIN ITS CONTRACT and not globally (BoqItem.Code)
        // — which is why CNT-0279 carries BQ-003 while CNT-0279-EM carries
        // BQ-002 and BQ-004, exactly as 02 §1 and 02 §3 name them. It reads
        // strangely on purpose: it is the rule, visible in the data.
        db.BoqItems.AddRange(
            // CNT-0279 — civil, Σ 240,000,000
            Item("CNT-0279", "BQ-001", "أعمال الحفر والردم للأسس", "Excavation and backfill for foundations",
                "م³", 18_000m, 1_250m, "D1", "الأعمال الترابية والأسس"),
            Item("CNT-0279", "BQ-005", "تسوية الموقع وتهيئته", "Site levelling and preparation",
                "م²", 6_000m, 1_500m, "D1", "الأعمال الترابية والأسس"),
            Item("CNT-0279", "BQ-006", "خرسانة الأسس المسلحة", "Reinforced foundation concrete",
                "م³", 1_400m, 24_000m, "D1", "الأعمال الترابية والأسس"),
            Item("CNT-0279", "BQ-007", "الأعمدة والجسور الخرسانية", "Concrete columns and beams",
                "م³", 1_900m, 24_000m, "D2", "الهيكل الإنشائي"),
            // 02 §3's line: 990 × 27,000 = 26,730,000.
            Item("CNT-0279", "BQ-003", "الأسقف والسلالم", "Slabs and stairs",
                "م³", 990m, 27_000m, "D2", "الهيكل الإنشائي"),
            Item("CNT-0279", "BQ-008", "الجدران والقواطع", "Walls and partitions",
                "م²", 8_800m, 3_000m, "D2", "الهيكل الإنشائي"),
            Item("CNT-0279", "BQ-009", "التبليط والإكساء الداخلي", "Tiling and internal finishes",
                "م²", 12_800m, 3_000m, "D3", "الإكساء والتشطيبات"),
            Item("CNT-0279", "BQ-010", "أعمال الواجهات", "Facade works",
                "م²", 3_900m, 3_200m, "D3", "الإكساء والتشطيبات"),
            Item("CNT-0279", "BQ-011", "الأعمال الصحية والكهربائية الأولية", "First-fix plumbing and electrical",
                "مقطوعية", 1m, 21_600_000m, "D3", "الإكساء والتشطيبات"),
            // The one line entered on site rather than imported, so the register
            // has a `manual` badge to render.
            Item("CNT-0279", "BQ-012", "أعمال الساحات والمناسيب الخارجية", "Yards and external levels",
                "م²", 2_460m, 1_500m, "D4", "الأعمال الخارجية والتسليم", source: "manual"),

            // CNT-0279-EM — electromechanical, Σ 100,000,000. 02 §1's example.
            Item("CNT-0279-EM", "BQ-002", "توريد وتركيب مجاميع التوليد ولوحات التزامن",
                "Supply and install generator sets and synchronisation panels",
                "عدد", 4m, 14_032_750m, "E1", "التجهيزات الكهربائية"),
            Item("CNT-0279-EM", "BQ-004", "توريد وتركيب وحدات التكييف والتهوية",
                "Supply and install HVAC units",
                "عدد", 6m, 7_311_500m, "E2", "التجهيزات الميكانيكية")
        );

        // The children below point at generated keys, so the parents commit
        // first. Nothing else in Fixture.Load needs this.
        db.SaveChanges();

        var act = db.Activities.ToDictionary(a => a.ContractId + "|" + a.ActivityId, a => a.Id);
        var item = db.BoqItems.ToDictionary(i => i.ContractId + "|" + i.Code, i => i.Id);

        int A(string c, string a) => act[c + "|" + a];
        int I(string c, string code) => item[c + "|" + code];

        // ── BOQ ↔ ACTIVITY LINKS (BR-03) ─────────────────────────────────
        // SharePct on a COMPUTED link is a cache — Domain/Allocation recomputes
        // it from the activity's absolute weight on every read, and the stored
        // number is here only so the table reads correctly in SQL. On a MANUAL
        // link it is the answer: `IsManual` says a person overrode the rule, and
        // that override is what makes `partial` and `over` reachable at all,
        // because a computed set always sums to exactly 100.
        db.BoqActivityLinks.AddRange(
            // — full: one activity, the whole line —
            Link(I("CNT-0279", "BQ-001"), A("CNT-0279", "A2"), 100m),
            Link(I("CNT-0279", "BQ-005"), A("CNT-0279", "A1"), 100m),
            Link(I("CNT-0279", "BQ-006"), A("CNT-0279", "A3"), 100m),
            Link(I("CNT-0279", "BQ-007"), A("CNT-0279", "A4"), 100m),
            Link(I("CNT-0279", "BQ-010"), A("CNT-0279", "A8"), 100m),
            Link(I("CNT-0279", "BQ-011"), A("CNT-0279", "A9"), 100m),

            // — 02 §3's worked example. Two links, computed: 5.8 / (5.8 + 5.2)
            //   = 52.7% and 47.3%, assigned 14,094,000 and 12,636,000. —
            Link(I("CNT-0279", "BQ-003"), A("CNT-0279", "A5"), 52.7m),
            Link(I("CNT-0279", "BQ-003"), A("CNT-0279", "A8"), 47.3m),

            // — partial: someone allocated 85% and left the rest. The missing
            //   15% of this line's value is never earned (02 §3). —
            Link(I("CNT-0279", "BQ-008"), A("CNT-0279", "A6"), 60m, manual: true),
            Link(I("CNT-0279", "BQ-008"), A("CNT-0279", "A4"), 25m, manual: true),

            // — over: 115%, carried in from the previous system's assignment
            //   sheet. `EP-BOQ-08` refuses to SAVE an over-allocation, so this
            //   is a state the screen can only ever surface and never create —
            //   which is exactly what the assignment screen is for. —
            Link(I("CNT-0279", "BQ-009"), A("CNT-0279", "A7"), 70m, manual: true),
            Link(I("CNT-0279", "BQ-009"), A("CNT-0279", "A10"), 45m, manual: true),

            // — BQ-012 has no links at all: `unassigned`. —

            Link(I("CNT-0279-EM", "BQ-002"), A("CNT-0279-EM", "E1"), 71.3m),
            Link(I("CNT-0279-EM", "BQ-002"), A("CNT-0279-EM", "E2"), 28.7m),
            Link(I("CNT-0279-EM", "BQ-004"), A("CNT-0279-EM", "E3"), 63.8m),
            Link(I("CNT-0279-EM", "BQ-004"), A("CNT-0279-EM", "E4"), 36.2m)
        );

        // ── DISTRIBUTION TO BENEFICIARIES (BR-08) ────────────────────────
        // PRJ-0279's beneficiaries are BEN-UOB and BEN-UOB-MED (01 §2.1), and
        // no row may name any other — the drawer offers only the project's own.
        // All four states are represented, and the `over` row is an IMPORTED
        // one: 02 §8 says a user cannot type their way into `over`, because
        // every input is capped, so the only honest source of that state is
        // legacy data.
        db.BoqDistributions.AddRange(
            // full — 540 + 450 = 990, the whole line
            Dist(I("CNT-0279", "BQ-003"), "BEN-UOB", 540m, "المبنى الرئيسي"),
            Dist(I("CNT-0279", "BQ-003"), "BEN-UOB-MED", 450m, "مبنى كلية الطب"),
            // partial — 10,000 of 18,000
            Dist(I("CNT-0279", "BQ-001"), "BEN-UOB", 10_000m, "الموقع العام"),
            // over — 9,200 imported against a line of 8,800
            Dist(I("CNT-0279", "BQ-008"), "BEN-UOB", 5_000m, "المبنى الرئيسي"),
            Dist(I("CNT-0279", "BQ-008"), "BEN-UOB-MED", 4_200m, "مبنى كلية الطب"),
            // full — 2.5 + 1.5 = 4 generator sets
            Dist(I("CNT-0279-EM", "BQ-002"), "BEN-UOB", 2.5m, "غرفة المولدات"),
            Dist(I("CNT-0279-EM", "BQ-002"), "BEN-UOB-MED", 1.5m, "غرفة المولدات — الطب"),
            // partial — 4 of 6 units
            Dist(I("CNT-0279-EM", "BQ-004"), "BEN-UOB", 4m, "المبنى الرئيسي")
            // BQ-005 / BQ-006 / BQ-007 / BQ-009 / BQ-010 / BQ-011 / BQ-012 —
            // `none`, which is the state a freshly imported sheet is in.
        );

        // BoqRateBands stays EMPTY. A band is created by APPLYING a change
        // order that re-prices beyond the 20% threshold (02 §5), and no such
        // order has been applied — Phase 5.4 is what writes here. Every line
        // therefore reads at its single contract rate, which is the truth.
    }

    private static Activity Act(string contractId, string activityId, string nameAr, string nameEn,
        string wbsPath, string wbsNames, decimal cost, decimal manHours, decimal progress,
        string status, bool milestone = false) => new()
    {
        ContractId = contractId, ActivityId = activityId, NameAr = nameAr, NameEn = nameEn,
        WbsPath = wbsPath, WbsNames = wbsNames,
        BudgetedCost = cost, BudgetedManHours = manHours,
        ProgressPct = progress, Status = status, IsMilestone = milestone,
    };

    private static BoqItem Item(string contractId, string code, string descriptionAr, string descriptionEn,
        string unit, decimal qty, decimal rate, string division, string divisionName,
        string source = "imported") => new()
    {
        ContractId = contractId, Code = code,
        DescriptionAr = descriptionAr, DescriptionEn = descriptionEn,
        Unit = unit, OriginalQty = qty, UnitRate = rate,
        Division = division, DivisionName = divisionName, Source = source,
    };

    private static BoqActivityLink Link(int boqItemId, int activityId, decimal sharePct, bool manual = false)
        => new() { BoqItemId = boqItemId, ActivityId = activityId, SharePct = sharePct, IsManual = manual };

    private static BoqDistribution Dist(int boqItemId, string beneficiaryCode, decimal qty, string? site)
        => new() { BoqItemId = boqItemId, BeneficiaryCode = beneficiaryCode, Qty = qty, SiteCode = site };
}

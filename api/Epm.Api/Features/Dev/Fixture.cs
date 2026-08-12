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

        // ── Workspaces (BR-15) ───────────────────────────────────────────
        // Five entities across all four documented kinds (ملحق الشكل 1), which
        // is what makes the register's filter chips real. `spd` and `cu` carry
        // no projects on purpose: a workspace that exists and is empty is a
        // state the register has to render honestly, and it is the one the
        // "no projects in this workspace" empty state was written for.
        //
        // Features/Dev/Personas.cs assigns these codes to personas. Changing a
        // code here means changing it there — that pairing IS the assignment
        // model, and there is deliberately no third place to keep in sync.
        // Codes, display codes, names, kinds and colours are VERBATIM from the
        // design-revamp prototype's `WORKSPACES` (data.jsx) — the build at
        // infinite-azaiton.github.io/epm, which is the visual reference. The
        // emblem colours in particular are not decoration: they are how a
        // person recognises a workspace in the switcher at a glance, and
        // inventing our own would have made the two products look unrelated.
        db.Workspaces.AddRange(
            new Workspace { Code = "ub", DisplayCode = "UOB", Color = "#0e6b47", NameAr = "جامعة بغداد", NameEn = "University of Baghdad", Kind = "state-university" },
            new Workspace { Code = "nu", DisplayCode = "MU", Color = "#1d4e89", NameAr = "الجامعة المستنصرية", NameEn = "Al-Mustansiriyah University", Kind = "state-university" },
            new Workspace { Code = "tu", DisplayCode = "UOT", Color = "#7d611d", NameAr = "الجامعة التكنولوجية", NameEn = "University of Technology", Kind = "technical-university" },
            new Workspace { Code = "cu", DisplayCode = "CU", Color = "#8c2f3a", NameAr = "الوحدة المركزية — مركز الوزارة", NameEn = "Central Unit — Ministry Center", Kind = "central-unit" },
            new Workspace { Code = "sp", DisplayCode = "SPD", Color = "#2f5d8c", NameAr = "المديرية العامة للتجهيز والمشتريات", NameEn = "Directorate for Supply & Procurement", Kind = "supply-directorate" }
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
                // Region and executor follow the workspace: `nu` is
                // الجامعة المستنصرية in Baghdad, not Mosul. A project whose
                // region contradicts its own entity is the kind of detail that
                // makes a reviewer stop trusting the rest of the dataset.
                Id = "PRJ-0207", WorkspaceCode = "nu",
                NameAr = "صيانة شبكة المياه", NameEn = "Water Network Maintenance",
                Status = "delayed", Type = "infrastructure", ExecutionStage = "mep-first-fix",
                FundingType = "reconstruction-fund", Region = "بغداد", Priority = "عالية",
                Branch = "شعبة البنى التحتية", Executor = "شركة الرافدين للمقاولات",
                BeneficiaryCodes = "BEN-UON",
                DataDate = new DateOnly(2026, 8, 2),
                UpdatedAt = new DateOnly(2026, 6, 30),
            },
            new Project
            {
                Id = "PRJ-0277", WorkspaceCode = "tu",
                NameAr = "توسعة قاعة المؤتمرات", NameEn = "Conference Hall Expansion",
                Status = "suspended", Type = "extension", ExecutionStage = "foundations",
                FundingType = "self-funding", Region = "بغداد", Priority = "منخفضة",
                Branch = "شعبة الأبنية", Executor = "شركة الخليج للإنشاءات",
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

        // PHASE 5.1 — the six change orders 06 §12 asks for, in six states.
        ChangeOrders(db);

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
        // ── PHASE 4.3 added the schedule half of every row ────────────────
        // A baseline, a forecast, a float and a critical flag. Three things the
        // dates have to be true about, or the Gantt argues with the rest of the
        // system:
        //
        //   1. THE CRITICAL PATH IS A REAL CHAIN, not a scatter of flags.
        //      A1 → A2 → A3 → A4 → A5 → A7 → A10 (with M1 hanging off A5), all
        //      at float 0. Every non-critical activity carries float > 0.
        //   2. THE LAST ACTIVITY'S FORECAST FINISH IS THE CONTRACT'S.
        //      A10 and E4 both forecast 2026-08-30, which is what
        //      Contracts.ForecastFinish says and what BR-10 charges the penalty
        //      on. A Gantt that ended somewhere else would make the contract
        //      tab and the schedule tab disagree about the same project.
        //   3. ONLY THE CRITICAL CHAIN IS LATE. The float on A6, A8 and A9 is
        //      what absorbs their own slip, so the project is 16 days late
        //      rather than every activity being late — which is what makes the
        //      critical-path filter worth having.
        //
        // All five 06 §9 statuses appear: completed ×3, delayed ×3,
        // inprogress ×1, ahead ×1, notstarted ×3 (one of them the milestone).
        db.Activities.AddRange(
            Act("CNT-0279", "A1", "التهيئة وتسوية الموقع", "Site preparation and levelling",
                "1", "الأعمال الترابية والأسس", 12_000_000m, 9_600m, 100m, "completed",
                bl: ("2025-03-01", "2025-04-14"), actual: ("2025-03-01", "2025-04-14"),
                dur: 45, float_: 0, critical: true),
            Act("CNT-0279", "A2", "أعمال الحفر والردم", "Excavation and backfill",
                "1", "الأعمال الترابية والأسس", 18_000_000m, 16_800m, 100m, "completed",
                bl: ("2025-04-15", "2025-07-13"), actual: ("2025-04-15", "2025-07-13"),
                dur: 90, float_: 0, critical: true, preds: "A1"),
            Act("CNT-0279", "A3", "خرسانة الأسس المسلحة", "Reinforced foundation concrete",
                "1", "الأعمال الترابية والأسس", 33_600_000m, 28_000m, 100m, "completed",
                bl: ("2025-07-14", "2025-11-10"), actual: ("2025-07-14", "2025-11-18"),
                dur: 120, float_: 0, critical: true, preds: "A2"),
            Act("CNT-0279", "A4", "الأعمدة والجسور الخرسانية", "Concrete columns and beams",
                "2", "الهيكل الإنشائي", 45_600_000m, 38_000m, 82m, "delayed",
                bl: ("2025-11-11", "2026-04-09"), start: "2025-11-19", forecast: "2026-04-25",
                dur: 150, float_: 0, critical: true, preds: "A3"),
            // 02 §4's own activity — the one Phase 4.4 drags to 100%.
            Act("CNT-0279", "A5", "الأسقف والسلالم", "Slabs and stairs",
                "2", "الهيكل الإنشائي", 13_920_000m, 13_200m, 60m, "delayed",
                bl: ("2026-01-10", "2026-05-10"), start: "2026-01-26", forecast: "2026-05-26",
                dur: 121, float_: 0, critical: true, preds: "A4"),
            Act("CNT-0279", "A6", "الجدران والقواطع", "Walls and partitions",
                "2", "الهيكل الإنشائي", 26_400_000m, 24_000m, 45m, "inprogress",
                bl: ("2026-02-15", "2026-06-14"), start: "2026-02-20", forecast: "2026-06-14",
                dur: 120, float_: 12, critical: false, preds: "A4"),
            Act("CNT-0279", "A7", "التبليط والإكساء الداخلي", "Tiling and internal finishes",
                "3", "الإكساء والتشطيبات", 38_400_000m, 36_000m, 20m, "delayed",
                bl: ("2026-03-01", "2026-06-28"), start: "2026-03-18", forecast: "2026-07-14",
                dur: 120, float_: 0, critical: true, preds: "A5"),
            Act("CNT-0279", "A8", "أعمال الواجهات", "Facade works",
                "3", "الإكساء والتشطيبات", 12_480_000m, 9_600m, 0m, "notstarted",
                bl: ("2026-04-01", "2026-06-29"), forecast: "2026-06-29",
                dur: 90, float_: 6, critical: false, preds: "A6"),
            // The one activity running EARLY — 9 days inside its baseline.
            Act("CNT-0279", "A9", "الأعمال الصحية والكهربائية الأولية", "First-fix plumbing and electrical",
                "3", "الإكساء والتشطيبات", 21_600_000m, 20_400m, 15m, "ahead",
                bl: ("2026-02-20", "2026-06-19"), start: "2026-02-20", forecast: "2026-06-10",
                dur: 120, float_: 18, critical: false, preds: "A4"),
            Act("CNT-0279", "A10", "الأعمال الخارجية والتسليم", "External works and handover",
                "4", "الأعمال الخارجية والتسليم", 18_000_000m, 14_400m, 0m, "notstarted",
                bl: ("2026-05-01", "2026-06-30"), forecast: "2026-08-30",
                dur: 60, float_: 0, critical: true, preds: "A7,A8,A9"),
            // Zero cost, zero man-hours, weight 0, excluded from allocation
            // (02 §2). It exists so the assignment picker has to skip it — and
            // now so the Gantt has a diamond to draw. A milestone has zero
            // duration, so its baseline start IS its baseline finish.
            Act("CNT-0279", "M1", "تسليم الهيكل الإنشائي", "Structure handover",
                "2", "الهيكل الإنشائي", 0m, 0m, 0m, "notstarted", milestone: true,
                bl: ("2026-06-15", "2026-06-15"), forecast: "2026-07-01",
                dur: 0, float_: 0, critical: true, preds: "A5,A6"),

            // CNT-0279-EM electromechanical: four activities, 100,000,000.
            Act("CNT-0279-EM", "E1", "توريد المولدات ولوحات التوزيع", "Supply generators and distribution boards",
                "1", "التجهيز والتوريد", 40_000_000m, 21_000m, 55m, "inprogress",
                bl: ("2025-06-01", "2025-12-27"), start: "2025-06-10", forecast: "2026-01-10",
                dur: 210, float_: 0, critical: true),
            Act("CNT-0279-EM", "E2", "توريد كابلات الضغط المتوسط", "Supply medium-voltage cabling",
                "1", "التجهيز والتوريد", 16_131_000m, 8_400m, 40m, "delayed",
                bl: ("2025-09-01", "2026-01-29"), start: "2025-09-20", forecast: "2026-03-01",
                dur: 151, float_: 25, critical: false, preds: "E1"),
            Act("CNT-0279-EM", "E3", "تركيب منظومة التكييف", "Install the HVAC system",
                "2", "التركيب والتشغيل", 28_000_000m, 18_000m, 25m, "inprogress",
                bl: ("2026-01-01", "2026-05-31"), start: "2026-01-15", forecast: "2026-06-20",
                dur: 151, float_: 0, critical: true, preds: "E1"),
            Act("CNT-0279-EM", "E4", "الفحص والتشغيل التجريبي", "Testing and trial operation",
                "2", "التركيب والتشغيل", 15_869_000m, 9_600m, 0m, "notstarted",
                bl: ("2026-06-01", "2026-06-30"), forecast: "2026-08-30",
                dur: 30, float_: 0, critical: true, preds: "E2,E3")
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

    /// <param name="bl">Baseline (start, finish). Equal on a milestone — zero duration.</param>
    /// <param name="actual">
    /// (start, finish) for a COMPLETE activity. An activity in progress passes
    /// <paramref name="start"/> instead: an actual FINISH means finished, and
    /// writing one at 82% would make the register claim work that is not done.
    /// </param>
    /// <param name="forecast">Where it is now expected to finish. Drives the bar and the slip.</param>
    private static Activity Act(string contractId, string activityId, string nameAr, string nameEn,
        string wbsPath, string wbsNames, decimal cost, decimal manHours, decimal progress,
        string status, bool milestone = false,
        (string Start, string Finish)? bl = null,
        (string Start, string Finish)? actual = null,
        string? start = null, string? forecast = null,
        int dur = 0, decimal float_ = 0, bool critical = false, string preds = "") => new()
    {
        ContractId = contractId, ActivityId = activityId, NameAr = nameAr, NameEn = nameEn,
        WbsPath = wbsPath, WbsNames = wbsNames,
        BudgetedCost = cost, BudgetedManHours = manHours,
        ProgressPct = progress, Status = status, IsMilestone = milestone,

        BaselineStart = D(bl?.Start),
        BaselineFinish = D(bl?.Finish),
        ActualStart = D(actual?.Start ?? start),
        ActualFinish = D(actual?.Finish),
        // A completed activity's forecast IS its actual finish — there is
        // nothing left to forecast.
        ForecastFinish = D(forecast ?? actual?.Finish),
        OriginalDuration = dur,
        // Remaining follows progress. Stored because P6 exports it, but it is
        // never allowed to contradict the percentage next to it.
        RemainingDuration = milestone ? 0 : (int)Math.Round(dur * (1m - progress / 100m)),
        TotalFloat = float_,
        IsCritical = critical,
        // 06 §9 has no calendar list — this is the P6 calendar name as imported.
        Calendar = milestone ? "—" : "6 أيام/أسبوع",
        Predecessors = preds,
    };

    private static DateOnly? D(string? iso) => iso is null ? null : DateOnly.Parse(iso);

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

    /// <summary>
    /// PHASE 5.1 — `06 §12`'s six change orders, in six deliberately different
    /// states. Its own method for the same reason `Boq` is: the stages and the
    /// attachments point at ChangeOrders.Id, so the parents are saved first and
    /// the children are built from the ids that came back.
    ///
    /// ── EVERY AGE IS MEASURED BACK FROM THE DATA DATE ────────────────────
    /// `06 §12` is explicit: *"All ages are measured back from the project's
    /// data date, never from wall-clock time. A hard-coded 'today' made every
    /// order look years late once the dates became contract-relative."* So the
    /// table below states an AGE IN DAYS and the date is derived (D-06).
    ///
    /// ── THE TWO PAIRS THAT HAVE TO STAY DIFFERENT ────────────────────────
    ///   VO-02 (22 days) vs VO-06 (5 days) — both pending, and only one is
    ///   overdue. If they ever collapsed into the same set, the register's
    ///   «متأخر» chip would be a synonym for «قيد الاعتماد» and worth nothing.
    ///
    ///   VO-05 (approved, untouched) vs VO-01 (approved AND applied, closed) —
    ///   `02 §9`'s whole point: approving changes nothing. VO-05's value must
    ///   appear in no contract total anywhere in the system, and VO-01's must
    ///   appear in all of them, through amendment no. 1.
    ///
    /// VO-04 sits in `applied_partial` with `WeightRecalcState = "failed"`,
    /// which is what raises فشل التطبيق on the register — an EXCEPTION beside
    /// the lifecycle pill, never a lifecycle of its own.
    /// </summary>
    private static void ChangeOrders(EpmDb db)
    {
        var dataDate = new DateOnly(2026, 8, 2);
        DateOnly Ago(int days) => dataDate.AddDays(-days);

        // The two committees that own the conditional stages (03 §2).
        const string ReDept = "دائرة المهندس المقيم";
        const string CoCommittee = "لجنة أوامر الغيار";
        const string RateCommittee = "لجنة تثبيت الأسعار";
        const string Endorsement = "لجنة المراجعة المصادقة";
        const string SeniorMgmt = "المستوى الإداري الأعلى";

        var orders = new List<ChangeOrder>
        {
            // VO-01 — 180 days: the full path, applied, closed. Amendment no. 1
            // on CNT-0279 is ITS amendment: 10,000,000 and 45 days, the figures
            // SCR-W3's chain and every effective value already show.
            new()
            {
                No = "VO-01", ContractId = "CNT-0279", Type = "engineering",
                TitleAr = "تعديل كميات الأسس ومنح تمديد",
                TitleEn = "Foundation quantity revision with an extension",
                Justification = "زيادة كميات الحفر والخرسانة بعد الكشف الموقعي على طبيعة التربة.",
                ResponsibleParty = ReDept,
                IncomingNo = "3312/2025", IncomingDate = Ago(180),
                Lifecycle = "closed",
                RequestedValue = 12_400_000m, RequestedDays = 60,
                ApprovedValue = 10_000_000m, ApprovedDays = 45,
                AppliedValue = 10_000_000m, AppliedDays = 45,
                DecisionDate = Ago(96), ApprovingAuthority = SeniorMgmt,
                DecisionReason = "اعتُمد بقيمة أقل من المطلوب بعد مراجعة الأسعار.",
                WeightRecalcState = "done",
                CreatedByUserId = "user.re-dept", CreatedAt = DateTime.UtcNow,
            },

            // VO-02 — 22 days: pending and PAST the SLA. Sitting at the
            // rate-fixing committee, so it also carries بانتظار تثبيت الأسعار.
            new()
            {
                No = "VO-02", ContractId = "CNT-0279", Type = "engineering",
                TitleAr = "زيادة كميات الإكساء الداخلي",
                TitleEn = "Increase in internal finishes quantities",
                Justification = "تغيير مواصفة الإكساء بطلب الجهة المستفيدة.",
                ResponsibleParty = ReDept,
                IncomingNo = "0455/2026", IncomingDate = Ago(22),
                Lifecycle = "pending",
                RequestedValue = 8_600_000m, RequestedDays = 0,
                CreatedByUserId = "user.re-dept", CreatedAt = DateTime.UtcNow,
            },

            // VO-03 — 60 days: RETURNED for revision, history retained. Its
            // extension exceeds a quarter of the contract duration, so the
            // endorsement committee is in the chain (03 §2).
            new()
            {
                No = "VO-03", ContractId = "CNT-0279", Type = "engineering",
                TitleAr = "تمديد مدة العقد لأعمال الواجهات",
                TitleEn = "Contract extension for the facade works",
                Justification = "تأخر توريد مواد الواجهة من المنشأ.",
                ResponsibleParty = ReDept,
                IncomingNo = "0219/2026", IncomingDate = Ago(60),
                Lifecycle = "returned",
                RequestedValue = 0m, RequestedDays = 120,
                DecisionReason = "أُعيد للتعديل: المدة المطلوبة تتجاوز ما يبرره التحليل الزمني المرفق.",
                CreatedByUserId = "user.re-dept", CreatedAt = DateTime.UtcNow,
            },

            // VO-04 — 120 days: approved, APPLYING, and the weight step failed.
            // Approved ≠ applied ≠ closed, made visible.
            new()
            {
                No = "VO-04", ContractId = "CNT-0279", Type = "engineering",
                TitleAr = "إعادة توزيع كميات الأعمال الصحية",
                TitleEn = "Redistribution of the plumbing quantities",
                Justification = "إعادة توزيع الكميات بين الطوابق دون تغيير القيمة الكلية.",
                ResponsibleParty = ReDept,
                IncomingNo = "3901/2025", IncomingDate = Ago(120),
                Lifecycle = "applied_partial",
                RequestedValue = 0m, RequestedDays = 0,
                ApprovedValue = 0m, ApprovedDays = 0,
                DecisionDate = Ago(74), ApprovingAuthority = CoCommittee,
                // What raises فشل التطبيق on the register.
                WeightRecalcState = "failed",
                CreatedByUserId = "user.re-dept", CreatedAt = DateTime.UtcNow,
            },

            // VO-05 — 9 days: approved and NOT applied. Its 3,000,000 is the
            // projection SCR-W3, SCR-W1 and SCR-W7 already show BESIDE their
            // totals and inside none of them (02 §9).
            new()
            {
                No = "VO-05", ContractId = "CNT-0279", Type = "engineering",
                TitleAr = "أعمال إضافية في الساحات الخارجية",
                TitleEn = "Additional works in the external yards",
                Justification = "إضافة أعمال تبليط وإنارة للساحات بطلب الجهة المستفيدة.",
                ResponsibleParty = ReDept,
                IncomingNo = "0712/2026", IncomingDate = Ago(9),
                Lifecycle = "approved",
                RequestedValue = 3_400_000m, RequestedDays = 15,
                ApprovedValue = 3_000_000m, ApprovedDays = 0,
                DecisionDate = Ago(2), ApprovingAuthority = CoCommittee,
                WeightRecalcState = "none",
                CreatedByUserId = "user.re-dept", CreatedAt = DateTime.UtcNow,
            },

            // VO-06 — 5 days: pending and INSIDE the SLA. The control that
            // proves «قيد الاعتماد» and «متأخر» are different sets. On the
            // electromechanical contract, so the register spans both.
            new()
            {
                No = "VO-06", ContractId = "CNT-0279-EM", Type = "supply",
                TitleAr = "تغيير مواصفة لوحات التوزيع",
                TitleEn = "Change of the distribution board specification",
                Justification = "عدم توفر المواصفة المتعاقد عليها لدى المجهّز.",
                ResponsibleParty = ReDept,
                IncomingNo = "0748/2026", IncomingDate = Ago(5),
                Lifecycle = "pending",
                RequestedValue = 1_250_000m, RequestedDays = 0,
                CreatedByUserId = "user.re-dept", CreatedAt = DateTime.UtcNow,
            },
        };

        db.ChangeOrders.AddRange(orders);
        db.SaveChanges();

        var byNo = orders.ToDictionary(o => o.No, o => o.Id);

        // ── THE STAGE CHAINS ─────────────────────────────────────────────
        // Six stages (BR-13), two of them CONDITIONAL (03 §2): rate fixing only
        // when a line trips the 20% rule, endorsement only when the extension
        // exceeds a quarter of the contract duration. A stage that does not
        // apply is kept with its REASON rather than dropped — 5.4 renders that
        // list, and this phase already stores it.
        ChangeOrderStage St(string no, int n, string ar, string en, string owner,
            string status, int? sentAgo = null, int? actionedAgo = null,
            bool applicable = true, string? skip = null, string? decision = null) => new()
        {
            ChangeOrderId = byNo[no], StageNo = n, NameAr = ar, NameEn = en,
            OwnerParty = owner, Status = status, Applicable = applicable, SkipReason = skip,
            SentAt = sentAgo is null ? null : Ago(sentAgo.Value),
            ActionedAt = actionedAgo is null ? null : Ago(actionedAgo.Value),
            Decision = decision,
        };

        db.ChangeOrderStages.AddRange(
            // VO-01 — every applicable stage done, in order.
            St("VO-01", 1, "دراسة دائرة المهندس المقيم", "RE department review", ReDept, "done", 180, 172, decision: "approve"),
            St("VO-01", 2, "لجنة أوامر الغيار", "Change-order committee", CoCommittee, "done", 172, 160, decision: "approve"),
            St("VO-01", 3, "لجنة تثبيت الأسعار", "Rate-fixing committee", RateCommittee, "done", 160, 140, decision: "approve"),
            St("VO-01", 4, "لجنة المراجعة المصادقة", "Endorsement review committee", Endorsement, "done", 140, 120, decision: "approve"),
            St("VO-01", 5, "المستوى الإداري الأعلى", "Senior management", SeniorMgmt, "done", 120, 96, decision: "approve"),

            // VO-02 — sitting at rate fixing, and that stage is past its SLA.
            St("VO-02", 1, "دراسة دائرة المهندس المقيم", "RE department review", ReDept, "done", 22, 18, decision: "approve"),
            St("VO-02", 2, "لجنة أوامر الغيار", "Change-order committee", CoCommittee, "done", 18, 14, decision: "approve"),
            St("VO-02", 3, "لجنة تثبيت الأسعار", "Rate-fixing committee", RateCommittee, "active", 14),
            St("VO-02", 4, "لجنة المراجعة المصادقة", "Endorsement review committee", Endorsement, "pending",
                applicable: false, skip: "التمديد المطلوب صفر، فلا تنطبق مراجعة المصادقة."),
            St("VO-02", 5, "المستوى الإداري الأعلى", "Senior management", SeniorMgmt, "pending"),

            // VO-03 — RETURNED by the endorsement committee, and now back with
            // the RE department to revise. Stage 1 is ACTIVE AGAIN: a returned
            // order is not parked, it is somebody's work — which is what makes
            // it the order that exercises «بانتظار إجرائي» for the default
            // persona. Stage 4 keeps its `returned` decision as HISTORY rather
            // than being reset, because `03 §5` requires the return to stay on
            // the record.
            St("VO-03", 1, "دراسة دائرة المهندس المقيم", "RE department review", ReDept, "active", 30),
            St("VO-03", 2, "لجنة أوامر الغيار", "Change-order committee", CoCommittee, "done", 55, 44, decision: "approve"),
            St("VO-03", 3, "لجنة تثبيت الأسعار", "Rate-fixing committee", RateCommittee, "pending",
                applicable: false, skip: "لا تغيير في الكميات يتجاوز 20%، فلا تنطبق مرحلة تثبيت الأسعار."),
            St("VO-03", 4, "لجنة المراجعة المصادقة", "Endorsement review committee", Endorsement, "returned", 44, 30, decision: "return"),
            St("VO-03", 5, "المستوى الإداري الأعلى", "Senior management", SeniorMgmt, "pending"),

            // VO-04 — chain complete; the application is what failed.
            St("VO-04", 1, "دراسة دائرة المهندس المقيم", "RE department review", ReDept, "done", 120, 114, decision: "approve"),
            St("VO-04", 2, "لجنة أوامر الغيار", "Change-order committee", CoCommittee, "done", 114, 74, decision: "approve"),
            St("VO-04", 3, "لجنة تثبيت الأسعار", "Rate-fixing committee", RateCommittee, "pending",
                applicable: false, skip: "إعادة توزيع دون تغيير في القيمة، فلا تنطبق مرحلة تثبيت الأسعار."),
            St("VO-04", 4, "لجنة المراجعة المصادقة", "Endorsement review committee", Endorsement, "pending",
                applicable: false, skip: "لا تمديد مطلوب، فلا تنطبق مراجعة المصادقة."),

            // VO-05 — approved two days ago, nothing applied.
            St("VO-05", 1, "دراسة دائرة المهندس المقيم", "RE department review", ReDept, "done", 9, 7, decision: "approve"),
            St("VO-05", 2, "لجنة أوامر الغيار", "Change-order committee", CoCommittee, "done", 7, 2, decision: "approve"),
            St("VO-05", 3, "لجنة تثبيت الأسعار", "Rate-fixing committee", RateCommittee, "pending",
                applicable: false, skip: "لا تغيير في الكميات يتجاوز 20%، فلا تنطبق مرحلة تثبيت الأسعار."),

            // VO-06 — five days old, still with the change-order committee and
            // comfortably inside its SLA.
            St("VO-06", 1, "دراسة دائرة المهندس المقيم", "RE department review", ReDept, "done", 5, 3, decision: "approve"),
            St("VO-06", 2, "لجنة أوامر الغيار", "Change-order committee", CoCommittee, "active", 3),
            St("VO-06", 3, "لجنة تثبيت الأسعار", "Rate-fixing committee", RateCommittee, "pending"),
            St("VO-06", 4, "المستوى الإداري الأعلى", "Senior management", SeniorMgmt, "pending")
        );

        // A few attachments so the register's count column has something real
        // to say. `03 §9`'s six categories and the version chain are 5.2's.
        db.ChangeOrderAttachments.AddRange(
            Att("VO-01", byNo, "كتاب دائرة المهندس المقيم 3312.pdf", "letter", 1),
            Att("VO-01", byNo, "جدول الكميات المعدل.xlsx", "boq", 1),
            Att("VO-01", byNo, "قرار اللجنة.pdf", "decision", 1),
            Att("VO-02", byNo, "كتاب الجهة المستفيدة 0455.pdf", "letter", 1),
            Att("VO-02", byNo, "تحليل الأسعار.xlsx", "pricing", 1),
            Att("VO-03", byNo, "التحليل الزمني.pdf", "schedule", 1),
            Att("VO-04", byNo, "جدول إعادة التوزيع.xlsx", "boq", 1),
            Att("VO-05", byNo, "كتاب الوارد 0712.pdf", "letter", 1)
        );

        db.SaveChanges();
    }

    private static ChangeOrderAttachment Att(
        string no, Dictionary<string, int> byNo, string file, string category, int version) => new()
    {
        ChangeOrderId = byNo[no], FileName = file, Category = category,
        Version = version, SizeBytes = 240_000, UploadedByUserId = "user.re-dept",
        UploadedAt = DateTime.UtcNow,
    };
}

using Epm.Api.Data;
using Epm.Api.Data.Entities;
using Epm.Api.Features.Lookups;
using Epm.Api.Domain;

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
                Id = "PRJ-0279", WorkspaceCode = "ub", Code = "PC-0279",
                NameAr = "مجمع الكليات الطبية", NameEn = "Medical Colleges Complex",
                RegistrationYear = 2025, PlannedCost = 340_000_000m,
                ExpenditureCategory = "construction", BudgetApprovalNumber = "BA-2501",
                Coordinates = "33.27,44.36", Formation = "وزارة التعليم العالي والبحث العلمي",
                OrgStructure = "دائرة الإعمار والمشاريع › القسم الهندسي › الأبنية",
                Description = "إنشاء مجمع للكليات الطبية يضم قاعات دراسية ومختبرات وعيادات تعليمية.",
                Status = "ongoing", Type = "construction", ExecutionStage = "structure",
                FundingType = "federal-budget", Region = "baghdad", Priority = "high",
                Branch = "شعبة الأبنية", Executor = "شركة الفاو الهندسية",
                DesignerParty = "المكتب الاستشاري الهندسي", ConsultantParty = "دار الهندسة",
                BeneficiaryCodes = "BEN-UOB,BEN-UOB-MED",
                DataDate = new DateOnly(2026, 8, 2),
                UpdatedAt = new DateOnly(2026, 7, 28),
            },
            new Project
            {
                Id = "PRJ-0148", WorkspaceCode = "ub", Code = "PC-0148",
                NameAr = "إنشاء مكتبة كلية الهندسة", NameEn = "Engineering Library",
                RegistrationYear = 2025, PlannedCost = 80_000_000m,
                ExpenditureCategory = "construction", BudgetApprovalNumber = "BA-2514",
                Coordinates = "33.28,44.37", Formation = "وزارة التعليم العالي والبحث العلمي",
                OrgStructure = "دائرة الإعمار والمشاريع › القسم الهندسي › الأبنية",
                Description = "بناء مكتبة مركزية لكلية الهندسة بطاقة استيعابية ٤٠٠ مقعد.",
                Status = "ongoing", Type = "construction", ExecutionStage = "finishes",
                FundingType = "federal-budget", Region = "baghdad", Priority = "medium",
                Branch = "شعبة الأبنية", Executor = "شركة بغداد للمقاولات",
                ConsultantParty = "المكتب الاستشاري الهندسي",
                BeneficiaryCodes = "BEN-UOB-ENG",
                DataDate = new DateOnly(2026, 8, 2),
                UpdatedAt = new DateOnly(2026, 7, 15),
            },
            new Project
            {
                Id = "PRJ-0159", WorkspaceCode = "ub", Code = "PC-0159",
                NameAr = "تأهيل مختبرات الحاسوب", NameEn = "Computer Labs Rehabilitation",
                RegistrationYear = 2024, PlannedCost = 45_000_000m,
                ExpenditureCategory = "maintenance", BudgetApprovalNumber = "BA-2417",
                Coordinates = "33.28,44.36", Formation = "وزارة التعليم العالي والبحث العلمي",
                OrgStructure = "دائرة الإعمار والمشاريع › القسم الهندسي › الصيانة",
                Description = "تأهيل ثلاثة مختبرات حاسوب وتحديث منظومة التبريد والتغذية الكهربائية.",
                Status = "completed", Type = "construction", ExecutionStage = "handover",
                FundingType = "grant", Region = "baghdad", Priority = "medium",
                Branch = "شعبة الصيانة", Executor = "شركة النهرين",
                ConsultantParty = "دار الهندسة",
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
                Id = "PRJ-0207", WorkspaceCode = "nu", Code = "PC-0207",
                NameAr = "صيانة شبكة المياه", NameEn = "Water Network Maintenance",
                RegistrationYear = 2025, PlannedCost = 62_000_000m,
                ExpenditureCategory = "construction", BudgetApprovalNumber = "BA-2533",
                Coordinates = "33.34,44.40", Formation = "وزارة التعليم العالي والبحث العلمي",
                OrgStructure = "دائرة الإعمار والمشاريع › القسم الهندسي › البنى التحتية",
                Description = "استبدال شبكة المياه الرئيسية داخل الحرم الجامعي ومعالجة نقاط التسرب.",
                Status = "delayed", Type = "construction", ExecutionStage = "mep-first-fix",
                FundingType = "reconstruction-fund", Region = "baghdad", Priority = "high",
                Branch = "شعبة البنى التحتية", Executor = "شركة الرافدين للمقاولات",
                ConsultantParty = "المكتب الاستشاري الهندسي",
                BeneficiaryCodes = "BEN-UON",
                DataDate = new DateOnly(2026, 8, 2),
                UpdatedAt = new DateOnly(2026, 6, 30),
            },
            new Project
            {
                Id = "PRJ-0277", WorkspaceCode = "tu", Code = "PC-0277",
                NameAr = "توسعة قاعة المؤتمرات", NameEn = "Conference Hall Expansion",
                RegistrationYear = 2026, PlannedCost = 51_200_000m,
                ExpenditureCategory = "construction", BudgetApprovalNumber = "BA-2604",
                Coordinates = "33.31,44.38", Formation = "وزارة التعليم العالي والبحث العلمي",
                OrgStructure = "دائرة الإعمار والمشاريع › القسم الهندسي › الأبنية",
                Description = "توسعة قاعة المؤتمرات لتستوعب ٦٠٠ مقعد مع تحديث المنظومة الصوتية.",
                Status = "suspended", Type = "construction", ExecutionStage = "foundations",
                FundingType = "self-funding", Region = "baghdad", Priority = "low",
                Branch = "شعبة الأبنية", Executor = "شركة الخليج للإنشاءات",
                ConsultantParty = "دار الهندسة",
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
                AwardAmount = 222_000_000m, ReserveAmount = 12_000_000m, SupervisionAmount = 6_000_000m,
                IncomingNo = "3421", IncomingDate = new DateOnly(2025, 2, 11),
                Contractor = "شركة الفاو الهندسية", Consultant = "دار الهندسة",
                Component = "المكوّن المدني", ExecutingParty = "شركة الفاو العامة", ContactInfo = "+964 771 222 3333",
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
                AwardAmount = 92_500_000m, ReserveAmount = 5_000_000m, SupervisionAmount = 2_500_000m,
                IncomingNo = "3588", IncomingDate = new DateOnly(2025, 5, 6),
                Contractor = "شركة المنصور للتجهيزات", Consultant = "دار الهندسة",
                Component = "المكوّن الكهربائي", ExecutingParty = "شركة الطاقة العامة", ContactInfo = "+964 780 444 5555",
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
                AwardAmount = 63_400_000m, ReserveAmount = 3_400_000m, SupervisionAmount = 1_700_000m,
                IncomingNo = "2914", IncomingDate = new DateOnly(2024, 8, 22),
                Contractor = "شركة بغداد للمقاولات", Consultant = "المكتب الاستشاري",
                Component = "المكوّن المدني", ExecutingParty = "شركة بغداد العامة للمقاولات", ContactInfo = "+964 790 111 2222",
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
                AwardAmount = 28_900_000m, ReserveAmount = 1_500_000m, SupervisionAmount = 800_000m,
                IncomingNo = "3102", IncomingDate = new DateOnly(2024, 12, 3),
                Contractor = "شركة الموصل", Consultant = "دار الهندسة",
                Component = "المكوّن البنى التحتية", ExecutingParty = "شركة الرافدين العامة", ContactInfo = "+964 751 666 7777",
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
                // The day VO-01's التنفيذ stage closed. The amendment and the
                // order that produced it are one event in two tables, so they
                // may not carry two different dates.
                AppliedAt = new DateTime(2026, 3, 12),
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

            // PRJ-0279 — the two-contract project, and the one SCR-W13 opens on.
            //
            // ملحق الشكل 47's footer is the target: **التنبيهات 8 · تحتاج إجراءً
            // 3 · حرجة 1**, read at the data date 2026-08-02. `RuleCode` names the
            // rule that would have produced each one, and switching that rule
            // off withdraws it — the plate's own promise, demonstrable.
            //
            // Three of the eight name no rule: a failed apply, an unapplied
            // amendment and a blocked distribution are events the system raises
            // on itself, not thresholds anybody set. They survive every rule
            // being switched off, which is exactly why the column is nullable.
            new Alert { ProjectId = "PRJ-0279", Severity = "critical", Kind = "apply-failed",
                TitleAr = "تعذّر تطبيق الملحق رقم 2 — خطوة إعادة احتساب الأوزان لم تنجح",
                TitleEn = "Amendment no. 2 could not be applied — the weight recalculation step failed",
                TargetRef = "CNT-0279", RaisedAt = new DateTime(2026, 7, 30),
                DueOn = new DateOnly(2026, 8, 1) },
            new Alert { ProjectId = "PRJ-0279", Severity = "warning", Kind = "sla-overdue",
                TitleAr = "الملحق رقم 2 معتمد منذ 21 يوماً ولم يُطبَّق بعد",
                TitleEn = "Amendment no. 2 has been approved for 21 days and is still unapplied",
                TargetRef = "CNT-0279", RaisedAt = new DateTime(2026, 7, 22),
                DueOn = new DateOnly(2026, 8, 14) },
            new Alert { ProjectId = "PRJ-0279", Severity = "warning", Kind = "distribution-blocked",
                TitleAr = "توزيع الكميات على الجهات المستفيدة غير مكتمل لبندين",
                TitleEn = "Quantity distribution to beneficiaries is incomplete on two items",
                TargetRef = "CNT-0279-EM", RaisedAt = new DateTime(2026, 7, 19),
                DueOn = new DateOnly(2026, 8, 9) },
            new Alert { ProjectId = "PRJ-0279", Severity = "warning", Kind = "schedule-slip",
                TitleAr = "معلم «إنجاز الهيكل» يقترب خلال 10 أيام",
                TitleEn = "Milestone “Structure complete” is 10 days away",
                RuleCode = "R3", RaisedAt = new DateTime(2026, 7, 9),
                DueOn = new DateOnly(2026, 8, 12),
                Acknowledged = true, AcknowledgedByUserId = "user.re-dept" },
            // R5 fires on the documents register: six of its fourteen documents
            // are on a draft current revision (ملحق الشكل 46).
            new Alert { ProjectId = "PRJ-0279", Severity = "info", Kind = "other",
                TitleAr = "وثيقة إلزامية بانتظار الاعتماد: شهادة فحص المواد",
                TitleEn = "Mandatory document awaiting approval: material test certificate",
                RuleCode = "R5", RaisedAt = new DateTime(2026, 7, 2),
                DueOn = new DateOnly(2026, 7, 26) },
            new Alert { ProjectId = "PRJ-0279", Severity = "info", Kind = "budget",
                TitleAr = "سلفة تشغيلية مصروفة بقيمة 24,000,000 د.ع",
                TitleEn = "Operating advance of IQD 24,000,000 disbursed",
                TargetRef = "CNT-0279", RaisedAt = new DateTime(2026, 6, 24),
                Acknowledged = true, AcknowledgedByUserId = "user.re-dept" },
            // R8 on VO-02, which is sitting at التدقيق المالي (ملحق الشكل 29).
            new Alert { ProjectId = "PRJ-0279", Severity = "warning", Kind = "other",
                TitleAr = "أمر تغييري VO-02 بانتظار قرار مرحلة التدقيق المالي",
                TitleEn = "Change order VO-02 is awaiting the financial review decision",
                TargetRef = "VO-02", RuleCode = "R8", RaisedAt = new DateTime(2026, 7, 21),
                DueOn = new DateOnly(2026, 8, 2) },
            // R6 on ACT-01, the meeting action الشكل 45 marks «متأخر».
            new Alert { ProjectId = "PRJ-0279", Severity = "warning", Kind = "other",
                TitleAr = "إجراء اجتماع متأخر: تسريع أعمال الكهرباء",
                TitleEn = "Overdue meeting action: accelerate the electrical works",
                TargetRef = "ACT-01", RuleCode = "R6", RaisedAt = new DateTime(2026, 7, 14),
                DueOn = new DateOnly(2026, 8, 5),
                Acknowledged = true, AcknowledgedByUserId = "user.project-manager" },

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
                AwardPortion = 22_400_000m, ReservePortion = 1_100_000m, SupervisionPortion = 500_000m,
                FinanceLetterNo = "1420/2025", FinanceLetterDate = new DateOnly(2025, 4, 10),
                CertifiedDate = new DateOnly(2025, 4, 6), PaidDate = new DateOnly(2025, 4, 21),
                Status = "paid", Note = "سلفة تشغيلية 10% من مبلغ الإحالة" },
            new Payment { ContractId = "CNT-0279", No = 2, Kind = "interim",
                GrossAmount = 62_000_000m, RetentionAmount = 3_100_000m, AdvanceRecovery = 6_200_000m,
                NetAmount = 52_700_000m,
                AwardPortion = 49_000_000m, ReservePortion = 2_500_000m, SupervisionPortion = 1_200_000m,
                FinanceLetterNo = "2107/2025", FinanceLetterDate = new DateOnly(2025, 11, 3),
                CertifiedDate = new DateOnly(2025, 10, 28), PaidDate = new DateOnly(2025, 11, 19),
                Status = "paid", Note = "المستخلص الأول — أعمال الأسس والهيكل" },
            new Payment { ContractId = "CNT-0279", No = 3, Kind = "interim",
                GrossAmount = 48_500_000m, RetentionAmount = 2_425_000m, AdvanceRecovery = 4_850_000m,
                NetAmount = 41_225_000m,
                AwardPortion = 38_300_000m, ReservePortion = 1_975_000m, SupervisionPortion = 950_000m,
                FinanceLetterNo = "0931/2026", FinanceLetterDate = new DateOnly(2026, 7, 12),
                CertifiedDate = new DateOnly(2026, 7, 9), PaidDate = null,
                // الشكل 17 — «الموعد القانوني للصرف», recorded not derived.
                LegalDueDate = new DateOnly(2026, 8, 12),
                Status = "certified", Note = "مصادق عليه — بانتظار التخصيص المالي" },

            // CNT-0279-EM — electromechanical, one certificate only.
            new Payment { ContractId = "CNT-0279-EM", No = 1, Kind = "advance",
                GrossAmount = 10_000_000m, RetentionAmount = 0m, AdvanceRecovery = 0m,
                NetAmount = 10_000_000m,
                AwardPortion = 9_400_000m, ReservePortion = 400_000m, SupervisionPortion = 200_000m,
                FinanceLetterNo = "1655/2025", FinanceLetterDate = new DateOnly(2025, 7, 8),
                CertifiedDate = new DateOnly(2025, 7, 2), PaidDate = new DateOnly(2025, 7, 20),
                Status = "paid", Note = "سلفة تشغيلية" },

            // ── الشكل 16 — ONE LETTER, TWO CONTRACTS ─────────────────────
            // «تتيح دفعة واحدة تشمل أكثر من عقد مع توزيع معلن». This shares
            // `0931/2026` with CNT-0279's third certificate above, which is
            // what makes the payments register show «عقدان» on one row.
            //
            // CERTIFIED, not paid: the letter is issued and the works are
            // signed off, and no money has moved yet — so it changes nothing
            // in المصروف, in الشكل 15's consumed allocation, or in الشكل 14's
            // actual columns, all of which count PAID only (P-26).
            new Payment { ContractId = "CNT-0279-EM", No = 2, Kind = "interim",
                GrossAmount = 14_120_000m, RetentionAmount = 706_000m, AdvanceRecovery = 1_412_000m,
                NetAmount = 12_002_000m,
                AwardPortion = 11_100_000m, ReservePortion = 600_000m, SupervisionPortion = 302_000m,
                FinanceLetterNo = "0931/2026", FinanceLetterDate = new DateOnly(2026, 7, 12),
                CertifiedDate = new DateOnly(2026, 7, 9), PaidDate = null,
                Status = "certified", Note = "المستخلص الأول — أعمال التمديدات" },

            // CNT-0148 — the library, furthest along.
            new Payment { ContractId = "CNT-0148", No = 1, Kind = "interim",
                GrossAmount = 21_000_000m, RetentionAmount = 1_050_000m, AdvanceRecovery = 0m,
                NetAmount = 19_950_000m,
                AwardPortion = 18_600_000m, ReservePortion = 930_000m, SupervisionPortion = 420_000m,
                FinanceLetterNo = "0788/2025", FinanceLetterDate = new DateOnly(2025, 3, 17),
                CertifiedDate = new DateOnly(2025, 3, 12), PaidDate = new DateOnly(2025, 3, 30),
                Status = "paid", Note = "المستخلص الأول" },
            new Payment { ContractId = "CNT-0148", No = 2, Kind = "interim",
                GrossAmount = 26_400_000m, RetentionAmount = 1_320_000m, AdvanceRecovery = 0m,
                NetAmount = 25_080_000m,
                AwardPortion = 23_400_000m, ReservePortion = 1_180_000m, SupervisionPortion = 500_000m,
                FinanceLetterNo = "0402/2026", FinanceLetterDate = new DateOnly(2026, 2, 24),
                CertifiedDate = new DateOnly(2026, 2, 18), PaidDate = new DateOnly(2026, 3, 9),
                Status = "paid", Note = "المستخلص الثاني — الإكساء" },

            // CNT-0207 — delayed, and it shows: one certificate pending since
            // May with nothing paid against it.
            new Payment { ContractId = "CNT-0207", No = 1, Kind = "interim",
                GrossAmount = 7_800_000m, RetentionAmount = 390_000m, AdvanceRecovery = 0m,
                NetAmount = 7_410_000m,
                AwardPortion = 6_930_000m, ReservePortion = 330_000m, SupervisionPortion = 150_000m,
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

        // ملحق الشكل 43 — سجل المخاطر.
        Risks(db);

        // ملحق الشكل 45 — محاضر الاجتماعات وسجل الإجراءات.
        Meetings(db);

        // ملحق الشكل 46 — الوثائق والمخططات.
        Documents(db);

        // ملحق الشكل 47 — قواعد التنبيه على مستوى المشروع.
        AlertRules(db);

        // ملحق الشكل 44 — النموذج ثلاثي الأبعاد (07 §8: the tab, not the viewer).
        ModelElements(db);

        // الشكل 5's «سجل النشاط» — the project's own trail, and one third of
        // SCR-W15's union.
        ProjectActivity(db);

        // الشكل 9 — the letter and the measurement sheet behind each payment.
        PaymentFiles(db);

        // الشكل 11 — سجل نشاط العقد.
        ContractActivity(db);

        // الشكل 15 — التخصيص المالي السنوي.
        Allocations(db);

        // الشكل 17 — مراحل تدقيق السلفة الجارية.
        AuditStages(db);

        // ── next pages append their fixture rows here ────────────────────

        db.SaveChanges();
    }

    /// <summary>
    /// المرفقات — الشكل 9 puts «كتاب المالية» and «ذرعة الأعمال المنجزة» beside
    /// every payment, which is the pair the ministry actually certifies against.
    ///
    /// Its own method for the same reason `Boq` is: `PaymentAttachment.PaymentId`
    /// points at a GENERATED key, so the payments are saved first and the files
    /// are built from the ids that came back. Keyed by (contract, no) rather
    /// than by insertion order — an id that depends on the order rows happen to
    /// be added in is a fixture that breaks the first time one is inserted.
    ///
    /// Sizes are plausible, not real: no file is stored anywhere (CLAUDE.md §4).
    /// </summary>
    private static void PaymentFiles(EpmDb db)
    {
        db.SaveChanges();

        foreach (var p in db.Payments.ToList())
        {
            var tag = $"{p.ContractId}-{p.No:D2}";

            db.PaymentAttachments.Add(new PaymentAttachment
            {
                PaymentId = p.Id,
                TitleAr = "كتاب المالية", TitleEn = "Finance letter",
                FileName = $"{tag}-fin-letter.pdf", SizeBytes = 96_000,
            });

            // A مستخلص is certified against a measurement sheet; a سلفة is not
            // measured, so it carries only the letter. One row fewer is the
            // honest fixture, and it exercises the one-attachment layout.
            if (p.Kind != "advance")
            {
                db.PaymentAttachments.Add(new PaymentAttachment
                {
                    PaymentId = p.Id,
                    TitleAr = "ذرعة الأعمال المنجزة", TitleEn = "Measurement sheet",
                    FileName = $"{tag}-measurement.pdf", SizeBytes = 188_000,
                });
            }
        }
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

        // THESE TWO OWN NO STAGE. `03 §2` gives all six stages to the three
        // parties above; لجنة المراجعة المصادقة is an EXTERNAL PARTY inside
        // stage 4 (`03 §3`) and الدائرة الإدارية والمالية beside it, while the
        // minister endorses inside stage 5. Seeding either as a stage owner —
        // which this fixture did until Phase 5.2 — invents a stage the ministry
        // does not have and puts the wrong party's name in the register's
        // «الجهة المسؤولة» column.
        const string Endorsement = "لجنة المراجعة المصادقة";
        const string FinanceDept = "الدائرة الإدارية والمالية";
        const string Minister = "الوزير / المفوَّض";
        const string ContractsSection = "قسم العقود الحكومية";

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
                ContractorLetterNo = "4200/2025", ContractorLetterDate = Ago(189),
                ConsultantLetterNo = "4300/2025", ConsultantLetterDate = Ago(183),
                Lifecycle = "closed",
                RequestedValue = 12_400_000m, RequestedDays = 60, AnalysisDays = 45,
                ApprovedValue = 10_000_000m, ApprovedDays = 45,
                AppliedValue = 10_000_000m, AppliedDays = 45,
                // The date the ministerial order was signed — stage 5's own
                // action date, not a separate figure. الشكل 30 prints both the
                // authority and the reason for the gap to the RE department's
                // proposal, in these words.
                DecisionDate = Ago(150), ApprovingAuthority = Minister,
                DecisionReason = "تخفيض كميات بعد التدقيق الفني.",
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
                ContractorLetterNo = "0411/2026", ContractorLetterDate = Ago(31),
                ConsultantLetterNo = "0428/2026", ConsultantLetterDate = Ago(25),
                Lifecycle = "pending",
                // Σ of the RE department's column on its one line, and nothing
                // else: `02 §6` makes that proposal the governing figure, so a
                // header value that did not equal it would contradict the
                // record's own table (7,680,000 + 240 × 3,800).
                RequestedValue = 8_592_000m, RequestedDays = 0,
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
                ContractorLetterNo = "0177/2026", ContractorLetterDate = Ago(69),
                ConsultantLetterNo = "0203/2026", ConsultantLetterDate = Ago(63),
                Lifecycle = "returned",
                RequestedValue = 0m, RequestedDays = 120, AnalysisDays = 60,
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
                ContractorLetterNo = "3844/2025", ContractorLetterDate = Ago(129),
                ConsultantLetterNo = "3877/2025", ConsultantLetterDate = Ago(123),
                Lifecycle = "applied_partial",
                RequestedValue = 0m, RequestedDays = 0,
                ApprovedValue = 0m, ApprovedDays = 0,
                DecisionDate = Ago(98), ApprovingAuthority = Minister,
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
                ContractorLetterNo = "0688/2026", ContractorLetterDate = Ago(18),
                ConsultantLetterNo = "0701/2026", ConsultantLetterDate = Ago(12),
                Lifecycle = "approved",
                // 3,375,000 is Σ of the RE department's two lines; 3,000,000 and
                // 12 days are what ContractAmendments no. 2 on CNT-0279 is
                // WAITING to apply. The order and its pending amendment are the
                // same fact seen from two tables, so they carry the same pair.
                RequestedValue = 3_375_000m, RequestedDays = 15, AnalysisDays = 12,
                ApprovedValue = 3_000_000m, ApprovedDays = 12,
                DecisionDate = Ago(2), ApprovingAuthority = Minister,
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
                // A SUPPLY order: the مجهّز writes, and the technical opinion
                // comes from the inspection side rather than a design consultant
                // — so the consultant letter is absent and the section shows one
                // input, not an invented second one.
                ContractorLetterNo = "0730/2026", ContractorLetterDate = Ago(12),
                Lifecycle = "pending",
                RequestedValue = 1_250_000m, RequestedDays = 0,
                CreatedByUserId = "user.re-dept", CreatedAt = DateTime.UtcNow,
            },
        };

        db.ChangeOrders.AddRange(orders);
        db.SaveChanges();

        var byNo = orders.ToDictionary(o => o.No, o => o.Id);

        // WHICH ORDER EACH AMENDMENT CAME FROM. The amendments are seeded
        // earlier — SCR-E3 and SCR-W3 read them long before this method runs —
        // so the link is stamped here, once the orders have ids. No. 1 on
        // CNT-0279 is VO-01 applied; no. 2 is VO-05 approved and waiting, which
        // is the pair «معتمد ≠ مطبَّق» is demonstrated with.
        foreach (var (no, orderNo) in new[] { (1, "VO-01"), (2, "VO-05") })
        {
            var a = db.ContractAmendments.First(x => x.ContractId == "CNT-0279" && x.No == no);
            a.SourceChangeOrderId = byNo[orderNo];
        }
        db.SaveChanges();

        // ── THE STAGE CHAINS ─────────────────────────────────────────────
        // Six stages (BR-13), two of them CONDITIONAL (03 §2): rate fixing only
        // when a line trips the 20% rule, endorsement only when the extension
        // exceeds a quarter of the contract duration. A stage that does not
        // apply is kept with its REASON rather than dropped — 5.4 renders that
        // list, and this phase already stores it.
        // THE NAMES, OWNERS AND CEILINGS ARE NOT TYPED HERE. They come from
        // Domain/WorkflowMachine.Stages — `03 §2`'s table as code — so a stage
        // this fixture seeds cannot be named one thing and rendered another.
        // Only the CLOCK and the DECISION are per-order data.
        //
        // The per-stage ceilings are the reference's (`vo-record.jsx` SLA_OF)
        // and الشكل 33 prints them: 3 · 5 · 7 · 10 · 14 · 7. A request study and
        // a ministerial endorsement do not answer to the same clock, which is
        // why D-03's flat 5 is a DEFAULT and not the rule.
        int[] slaOf = [3, 5, 7, 10, 14, 7];

        ChangeOrderStage St(string no, int n, string status,
            int? sentAgo = null, int? actionedAgo = null,
            bool applicable = true, string? skip = null, string? decision = null,
            string? decidedBy = null, string? note = null)
        {
            var def = WorkflowMachine.Stages[n - 1];
            return new()
            {
                ChangeOrderId = byNo[no], StageNo = def.No, NameAr = def.Ar, NameEn = def.En,
                OwnerParty = def.Owner, Status = status, Applicable = applicable, SkipReason = skip,
                SentAt = sentAgo is null ? null : Ago(sentAgo.Value),
                ActionedAt = actionedAgo is null ? null : Ago(actionedAgo.Value),
                Decision = decision, DecisionNote = note, DecidedByUserId = decidedBy,
                SlaDays = slaOf[n - 1],
            };
        }

        var stages = new List<ChangeOrderStage>
        {
            // VO-01 — the full path, every applicable stage done in order, and
            // the six of الشكل 33: 3/3 · 5/5 · 7/7 · 9/10 · 6/14 · 7/7. Stage 5
            // is where the ministerial order was signed, so its action date IS
            // the order's DecisionDate; stage 6 ends where ContractAmendment
            // no. 1 on CNT-0279 was applied.
            St("VO-01", 1, "done", 180, 177, decision: "approve"),
            St("VO-01", 2, "done", 177, 172, decision: "approve"),
            St("VO-01", 3, "done", 172, 165, decision: "approve"),
            St("VO-01", 4, "done", 165, 156, decision: "approve"),
            St("VO-01", 5, "done", 156, 150, decision: "approve"),
            St("VO-01", 6, "done", 150, 143, decision: "approve"),

            // VO-02 — sitting at rate fixing, and that stage is past its
            // 7-day ceiling by a week. Stage 4 APPLIES: the order adds
            // 8,592,000 to the contract and that allocation has to be secured
            // (`03 §2` — "if endorsement OR FUNDING is needed").
            St("VO-02", 1, "done", 22, 19, decision: "approve"),
            St("VO-02", 2, "done", 19, 14, decision: "approve"),
            St("VO-02", 3, "active", 14),
            St("VO-02", 4, "pending"),
            St("VO-02", 5, "pending"),
            St("VO-02", 6, "pending"),

            // VO-03 — RETURNED at المصادقة والتخصيص, and now back with the RE
            // department to revise. Stage 1 is ACTIVE AGAIN: a returned order
            // is not parked, it is somebody's work — which is what makes it the
            // order that exercises «بانتظار إجرائي» for the default persona.
            // Stage 4 keeps its `returned` decision as HISTORY rather than
            // being reset, because `03 §5` requires the return to stay on the
            // record.
            St("VO-03", 1, "active", 30),
            St("VO-03", 2, "done", 55, 44, decision: "approve"),
            St("VO-03", 3, "pending", applicable: false,
                skip: "لا يشمل الأمر أي بند من جدول الكميات — الأثر زمني فقط، فلا كمية تتجاوز 20%."),
            St("VO-03", 4, "returned", 44, 30, decision: "return",
                note: "المدة المطلوبة تتجاوز ما يبرره التحليل الزمني المرفق."),
            St("VO-03", 5, "pending"),
            St("VO-03", 6, "pending"),

            // VO-04 — the approval chain is complete; the APPLICATION is what
            // failed, which is why stage 6 التنفيذ is still active 98 days on.
            St("VO-04", 1, "done", 120, 117, decision: "approve"),
            St("VO-04", 2, "done", 117, 112, decision: "approve"),
            St("VO-04", 3, "pending", applicable: false,
                skip: "إعادة توزيع دون تغيير في القيمة، فلا كمية تتجاوز 20%."),
            St("VO-04", 4, "pending", applicable: false,
                skip: "لا أثر مالي ولا تمديد، فلا مصادقة ولا تخصيص."),
            St("VO-04", 5, "done", 112, 98, decision: "approve"),
            St("VO-04", 6, "active", 98),

            // VO-05 — approved two days ago and NOT applied: stage 6 is the one
            // still open, and it is open with دائرة المهندس المقيم. That is
            // «approved ≠ applied» as a row in a table.
            St("VO-05", 1, "done", 9, 7, decision: "approve"),
            St("VO-05", 2, "done", 7, 5, decision: "approve"),
            St("VO-05", 3, "pending", applicable: false,
                skip: "لا كمية تتجاوز 20% في أي بند، فلا تنطبق مرحلة تثبيت الأسعار."),
            St("VO-05", 4, "done", 5, 3, decision: "approve"),
            St("VO-05", 5, "done", 3, 2, decision: "approve"),
            St("VO-05", 6, "active", 2),

            // VO-06 — five days old, still with the change-order committee and
            // comfortably inside its 5-day ceiling. It proposes a NEW UNIT
            // RATE, so تثبيت الأسعار applies to it and simply has not been
            // reached — which is why it carries no «بانتظار تثبيت الأسعار»
            // chip while VO-02, sitting AT that stage, does.
            St("VO-06", 1, "done", 5, 3, decision: "approve"),
            St("VO-06", 2, "active", 3),
            St("VO-06", 3, "pending"),
            St("VO-06", 4, "pending", applicable: false,
                skip: "تعديل سعر ضمن قيمة العقد، فلا تخصيص إضافياً ولا مصادقة."),
            St("VO-06", 5, "pending"),
            St("VO-06", 6, "pending"),
        };

        db.ChangeOrderStages.AddRange(stages);
        db.SaveChanges();

        // ── PHASE 5.2 — WHAT THE RECORD PAGE READS (ملحق الأشكال 30–34) ───
        // Ids, not navigation properties: the parents are saved, and the
        // children are built from the ids that came back.
        var stageId = stages.ToDictionary(
            s => db.ChangeOrders.First(o => o.Id == s.ChangeOrderId).No + "|" + s.StageNo, s => s.Id);
        var boq = db.BoqItems.ToDictionary(i => i.ContractId + "|" + i.Code, i => i.Id);
        var acts = db.Activities.ToDictionary(a => a.ContractId + "|" + a.ActivityId, a => a.Id);

        // ── الشكل 31 — بنود الكميات والكلفة ───────────────────────────────
        // FOUR SETS OF COLUMNS, NONE OF WHICH OVERWRITES ANOTHER (D-01,
        // non-negotiable #6): before · المقاول · دائرة المهندس المقيم ·
        // المعتمد, and `applied` once the order has been applied.
        //
        // Every figure the record prints is DERIVED from these by
        // Domain/ChangeOrderRecord — nothing here stores a resulting quantity,
        // a resulting value or an impact. The one arithmetic claim this seed
        // makes is that the RE department's column sums to the order's
        // RequestedValue and the approved column to its ApprovedValue, because
        // a header that disagreed with its own table would be the first thing
        // a reader noticed.
        db.ChangeOrderLines.AddRange(
            // VO-01 · BQ-006 — the line that TRIPS 20% and therefore puts
            // تثبيت الأسعار in the chain (BR-05, `03 §2`). Original 1,400 →
            // threshold 280: everything up to 280 moves at 24,000, and only the
            // excess carries a rate — 28,800 proposed by the contractor, 26,800
            // by the RE department, and 26,000 FIXED by لجنة تثبيت الأسعار.
            new ChangeOrderLine
            {
                ChangeOrderId = byNo["VO-01"], BoqItemId = boq["CNT-0279|BQ-006"], ChangeType = "inc",
                ContractedQty = 1_400m, ExecutedQty = 1_400m,
                BeforeQty = 1_400m, BeforeRate = 24_000m, BeforeAmount = 33_600_000m,
                ContractorDeltaQty = 400m, ContractorExcessRate = 28_800m,
                ReDeptDeltaQty = 380m, ReDeptExcessRate = 26_800m,
                ApprovedDeltaQty = 310m, ApprovedExcessRate = 26_000m,
                AppliedDeltaQty = 310m, AppliedAmount = 7_500_000m,
                ApplyStatus = "done",
            },
            // VO-01 · BQ-001 — inside the limit (threshold 3,600), so it has no
            // excess rate at all and prints «—» rather than a rate nobody set.
            new ChangeOrderLine
            {
                ChangeOrderId = byNo["VO-01"], BoqItemId = boq["CNT-0279|BQ-001"], ChangeType = "inc",
                ContractedQty = 18_000m, ExecutedQty = 18_000m,
                BeforeQty = 18_000m, BeforeRate = 1_250m, BeforeAmount = 22_500_000m,
                ContractorDeltaQty = 2_600m,
                ReDeptDeltaQty = 2_400m,
                ApprovedDeltaQty = 2_000m,
                AppliedDeltaQty = 2_000m, AppliedAmount = 2_500_000m,
                ApplyStatus = "done",
            },

            // VO-02 · BQ-009 — trips 20% (threshold 2,560) and is SITTING at
            // rate fixing, so its approved column is empty: `02 §5` gives that
            // rate to لجنة تثبيت الأسعار and to nobody else.
            new ChangeOrderLine
            {
                ChangeOrderId = byNo["VO-02"], BoqItemId = boq["CNT-0279|BQ-009"], ChangeType = "inc",
                ContractedQty = 12_800m, ExecutedQty = 2_560m,
                BeforeQty = 12_800m, BeforeRate = 3_000m, BeforeAmount = 38_400_000m,
                ContractorDeltaQty = 3_000m, ContractorExcessRate = 4_000m,
                ReDeptDeltaQty = 2_800m, ReDeptExcessRate = 3_800m,
                ApplyStatus = "todo",
            },

            // VO-04 · BQ-008 → BQ-009 — إعادة توزيع: 500 م² leave one line and
            // arrive at another at the same rate, so the contract value does
            // not move. The zero impact is the POINT of the order.
            new ChangeOrderLine
            {
                ChangeOrderId = byNo["VO-04"], BoqItemId = boq["CNT-0279|BQ-008"], ChangeType = "redist",
                ContractedQty = 8_800m, ExecutedQty = 3_960m,
                BeforeQty = 8_800m, BeforeRate = 3_000m, BeforeAmount = 26_400_000m,
                ContractorDeltaQty = -500m, ReDeptDeltaQty = -500m, ApprovedDeltaQty = -500m,
                AppliedDeltaQty = -500m, AppliedAmount = 0m,
                TargetBoqItemId = boq["CNT-0279|BQ-009"], DrawnQty = 500m, DistributedQty = 500m,
                // The line the failed weight recalculation surfaces on (`03 §6`).
                ApplyStatus = "fail",
            },

            // VO-05 · two lines, both inside 20% — which is exactly why its
            // rate-fixing stage carries a skip reason instead of a date.
            new ChangeOrderLine
            {
                ChangeOrderId = byNo["VO-05"], BoqItemId = boq["CNT-0279|BQ-012"], ChangeType = "inc",
                ContractedQty = 2_460m, ExecutedQty = 0m,
                BeforeQty = 2_460m, BeforeRate = 1_500m, BeforeAmount = 3_690_000m,
                ContractorDeltaQty = 492m, ReDeptDeltaQty = 450m, ApprovedDeltaQty = 400m,
                ApplyStatus = "todo",
            },
            new ChangeOrderLine
            {
                ChangeOrderId = byNo["VO-05"], BoqItemId = boq["CNT-0279|BQ-009"], ChangeType = "inc",
                ContractedQty = 12_800m, ExecutedQty = 2_560m,
                BeforeQty = 12_800m, BeforeRate = 3_000m, BeforeAmount = 38_400_000m,
                ContractorDeltaQty = 1_000m, ReDeptDeltaQty = 900m, ApprovedDeltaQty = 800m,
                ApplyStatus = "todo",
            },

            // VO-06 · BQ-002 (EM) — a RATE change, not a quantity one. There is
            // no 20% tier on a rate (`02 §5`), so the whole line re-prices and
            // the record's «سعر الزائد» column has nothing to show.
            new ChangeOrderLine
            {
                ChangeOrderId = byNo["VO-06"], BoqItemId = boq["CNT-0279-EM|BQ-002"], ChangeType = "rate",
                ContractedQty = 4m, ExecutedQty = 1m,
                BeforeQty = 4m, BeforeRate = 14_032_750m, BeforeAmount = 56_131_000m,
                ContractorNewRate = 14_500_000m,
                ReDeptNewRate = 14_345_250m,
                ApplyStatus = "todo",
            }
        );

        // ── الشكل 32 — الأنشطة المتأثرة ───────────────────────────────────
        // THREE DIFFERENT DAY COUNTS, kept apart on purpose: what was asked,
        // what the schedule analysis concluded, and what was approved. الشكل 32
        // prints all three side by side so a longer request cannot pass itself
        // off as an entitlement.
        db.ChangeOrderActivities.AddRange(
            // VO-01 — the foundation quantities grew, and what that actually
            // delayed is the structure that sits on them: A4 then A5. 35 + 25
            // requested = the order's 60; 26 + 19 approved = its 45.
            new ChangeOrderActivity
            {
                ChangeOrderId = byNo["VO-01"], ActivityId = acts["CNT-0279|A4"], ChangeType = "inc",
                BeforeStart = new DateOnly(2025, 11, 19), BeforeFinish = new DateOnly(2026, 4, 25),
                BeforeRemainingDuration = 150,
                RequestedDeltaDays = 35, AnalysisDays = 26, ApprovedDeltaDays = 26,
                ApprovedFinish = new DateOnly(2026, 5, 21),
                AppliedDeltaDays = 26, ApplyStatus = "done",
            },
            new ChangeOrderActivity
            {
                ChangeOrderId = byNo["VO-01"], ActivityId = acts["CNT-0279|A5"], ChangeType = "inc",
                BeforeStart = new DateOnly(2026, 1, 26), BeforeFinish = new DateOnly(2026, 5, 26),
                BeforeRemainingDuration = 121,
                RequestedDeltaDays = 25, AnalysisDays = 19, ApprovedDeltaDays = 19,
                ApprovedFinish = new DateOnly(2026, 6, 14),
                AppliedDeltaDays = 19, ApplyStatus = "done",
            },

            // VO-03 — TIME ONLY, and the gap between 120 requested and 60 from
            // the analysis is the whole reason it was returned.
            new ChangeOrderActivity
            {
                ChangeOrderId = byNo["VO-03"], ActivityId = acts["CNT-0279|A8"], ChangeType = "inc",
                BeforeStart = new DateOnly(2026, 4, 1), BeforeFinish = new DateOnly(2026, 6, 29),
                BeforeRemainingDuration = 90,
                RequestedDeltaDays = 120, AnalysisDays = 60,
                ApplyStatus = "na",
            },

            // VO-05 — 15 requested, 12 approved, and 12 is what
            // ContractAmendment no. 2 is waiting to apply.
            new ChangeOrderActivity
            {
                ChangeOrderId = byNo["VO-05"], ActivityId = acts["CNT-0279|A10"], ChangeType = "inc",
                BeforeStart = new DateOnly(2026, 5, 1), BeforeFinish = new DateOnly(2026, 8, 30),
                BeforeRemainingDuration = 60,
                RequestedDeltaDays = 15, AnalysisDays = 12, ApprovedDeltaDays = 12,
                ApprovedFinish = new DateOnly(2026, 9, 11),
                ApplyStatus = "todo",
            }
        );

        // ── الشكل 33 — أطراف خارجية داخل المرحلة، لا مراحل ────────────────
        // `03 §3`–§4 and non-negotiable #5: the outcome is attributed to the
        // DECIDING party and the delegate appears as the RECORDER, against an
        // official letter number and date. A party with nothing to decide is
        // `na` — which is a different fact from `wait`, and the counter says so.
        ChangeOrderExternalParty Ext(string no, int stageNo, string ar, string en, string state,
            bool canCancel, string? letterNo = null, int? letterAgo = null, string? note = null) => new()
        {
            ChangeOrderId = byNo[no], ChangeOrderStageId = stageId[no + "|" + stageNo],
            PartyAr = ar, PartyEn = en, State = state, CanCancel = canCancel,
            LetterNo = letterNo,
            LetterDate = letterAgo is null ? null : Ago(letterAgo.Value),
            RecordedByUserId = letterNo is null ? null : "user.co-rapporteur",
            RecordedAt = letterNo is null ? null : DateTime.UtcNow,
            Note = note,
        };

        db.ChangeOrderExternalParties.AddRange(
            // VO-01 — stage 4 carries ONE party (1/1 on الشكل 33) and stage 5
            // TWO (2/2). لجنة المراجعة المصادقة is absent from stage 4 because
            // 45 days is not a quarter of a 486-day contract (`03 §3`).
            Ext("VO-01", 4, FinanceDept, "Admin & finance directorate", "in", true, "OUT-5107", 160),
            Ext("VO-01", 5, Minister, "Minister / delegate", "in", false, "OUT-5121", 152),
            Ext("VO-01", 5, ContractsSection, "Government contracts section", "in", false, "OUT-5126", 150),

            // VO-02 — the funding party has not answered yet; the endorsement
            // committee has nothing to answer, because the order asks for no
            // days at all.
            Ext("VO-02", 4, FinanceDept, "Admin & finance directorate", "wait", true),
            Ext("VO-02", 4, Endorsement, "Endorsement review committee", "na", true,
                note: "لا تمديد مطلوب في هذا الأمر."),

            // VO-03 — THE RETURN CAME FROM HERE. 120 days on a 486-day contract
            // is past the quarter, so the committee had to answer, and its
            // answer was «أُعيد» — recorded inside stage 4 by the rapporteur,
            // never as a stage of its own.
            Ext("VO-03", 4, Endorsement, "Endorsement review committee", "back", true, "OUT-5088", 30,
                note: "المدة المطلوبة تتجاوز ما يبرره التحليل الزمني المرفق."),
            Ext("VO-03", 4, FinanceDept, "Admin & finance directorate", "na", true,
                note: "لا أثر مالي — الأمر زمني فقط."),

            // VO-05 — approved, so both stages' parties have answered.
            Ext("VO-05", 4, FinanceDept, "Admin & finance directorate", "in", true, "OUT-5203", 4),
            Ext("VO-05", 5, Minister, "Minister / delegate", "in", false, "OUT-5209", 3),
            Ext("VO-05", 5, ContractsSection, "Government contracts section", "in", false, "OUT-5210", 2)
        );

        // ── الشكل 30 — حالة تطبيق الأمر التغييري ──────────────────────────
        // The LIST is Domain/WorkflowMachine.ApplyChecklist — nine steps, and
        // this seed stores only what each one DID. An order that has not been
        // applied has no rows at all and the record renders the nine as `todo`,
        // which is the difference between "not done" and "not started".
        ChangeOrderApplyStep Step(string no, int stepNo, string status, int? doneAgo = null,
            string? message = null)
        {
            var s = WorkflowMachine.ApplyChecklist(true).Single(x => x.No == stepNo);
            return new()
            {
                ChangeOrderId = byNo[no], StepNo = s.No, NameAr = s.Ar, NameEn = s.En,
                Status = status, Message = message,
                CompletedAt = doneAgo is null ? null : Ago(doneAgo.Value).ToDateTime(TimeOnly.MinValue),
            };
        }

        db.ChangeOrderApplySteps.AddRange(
            // VO-01 — nine of nine complete, which is what «مغلق» MEANS.
            Step("VO-01", 1, "done", 148), Step("VO-01", 2, "done", 147),
            Step("VO-01", 3, "done", 146), Step("VO-01", 4, "done", 146),
            Step("VO-01", 5, "done", 145), Step("VO-01", 6, "done", 145),
            Step("VO-01", 7, "done", 144), Step("VO-01", 8, "done", 144),
            Step("VO-01", 9, "done", 143),

            // VO-04 — the weight recalculation FAILED, and everything after it
            // is honestly still open. This is the order that proves «معتمد» and
            // «مطبَّق» are different states (`02 §9`).
            Step("VO-04", 1, "done", 97), Step("VO-04", 2, "done", 97),
            Step("VO-04", 3, "done", 96),
            Step("VO-04", 4, "na"),
            // The message says what FAILED TO RUN, not a sum that disagrees with
            // the one on screen: this order moves 500 م² between two lines at
            // the same rate, so the weights genuinely do not move and BR-01
            // still totals 100.00%. A seeded «99.94%» would have been a number
            // the record's own weight panel contradicts two tabs away.
            Step("VO-04", 5, "fail", message:
                "تعذّر إكمال إعادة احتساب الأوزان: البند BQ-009 مرتبط بنشاط جدول مُعاد ترقيمه. يتطلب تصحيح الربط ثم إعادة التشغيل."),
            Step("VO-04", 6, "na"), Step("VO-04", 7, "na"), Step("VO-04", 8, "na"),
            Step("VO-04", 9, "todo")
        );

        // ── الشكل 34 — المرفقات ───────────────────────────────────────────
        // VERSIONS ACCUMULATE AND FILES ARE NEVER REPLACED (`03 §9`): the
        // priced estimate below exists as v1 AND v2, both rows, both readable.
        // Each row records the STAGE it arrived at and the party that raised
        // it, which is what makes the file list an audit surface rather than a
        // folder.
        db.ChangeOrderAttachments.AddRange(
            Att("VO-01", byNo, "VO-1-request.pdf", "letter", 1, 1, "user.re-dept", 180),
            Att("VO-01", byNo, "VO-1-boq.xlsx", "boq", 1, 2, "user.re-dept", 177),
            Att("VO-01", byNo, "VO-1-boq.xlsx", "boq", 2, 2, "user.re-dept", 174),
            Att("VO-01", byNo, "VO-1-site.jpg", "photos", 1, 1, "user.re-dept", 176),
            Att("VO-01", byNo, "VO-1-rate-decision.pdf", "support", 1, 3, "user.rate-committee", 165),
            Att("VO-02", byNo, "VO-2-request.pdf", "letter", 1, 1, "user.re-dept", 22),
            Att("VO-02", byNo, "VO-2-pricing.xlsx", "analysis", 1, 2, "user.re-dept", 19),
            Att("VO-03", byNo, "VO-3-schedule.pdf", "analysis", 1, 2, "user.re-dept", 55),
            Att("VO-04", byNo, "VO-4-redistribution.xlsx", "boq", 1, 1, "user.re-dept", 120),
            Att("VO-05", byNo, "VO-5-request.pdf", "letter", 1, 1, "user.re-dept", 9)
        );

        // ── السجل — one row per CHANGED FIELD (`03 §9` tab 6) ─────────────
        // «القيمة السابقة ← القيمة الجديدة», with the stage it happened in and
        // the version it belongs to. A delegated record names the DECIDING
        // party in the note and the delegate as the user, per `03 §4`.
        ChangeOrderAuditEntry Log(string no, int daysAgo, string time, string user, string action,
            int? stageNo, string? field, string? prev, string? next, string? note = null, int version = 1) => new()
        {
            ChangeOrderId = byNo[no],
            At = Ago(daysAgo).ToDateTime(TimeOnly.Parse(time)),
            UserId = user, Action = action, StageNo = stageNo,
            Field = field, PreviousValue = prev, NewValue = next, Note = note, Version = version,
        };

        db.ChangeOrderAuditEntries.AddRange(
            // VO-01 — the whole life of an order, from a letter that preceded
            // it to the closure that verified its application.
            Log("VO-01", 180, "09:14", "user.re-dept", "create", 1, null, null, "VO-01",
                "زيادة كميات الحفر والخرسانة بعد الكشف الموقعي على طبيعة التربة."),
            Log("VO-01", 179, "11:02", "user.re-dept", "edit", 1, "BQ-006.qty", "1,400", "1,780",
                "مقترح دائرة المهندس المقيم بعد مراجعة الكشف."),
            Log("VO-01", 178, "08:40", "user.re-dept", "submit", 1, "lifecycle", "مسودة", "قيد الاعتماد"),
            Log("VO-01", 177, "10:15", "user.co-committee", "approve", 2, "stage", "دراسة الطلب", "لجنة أوامر الغيار"),
            Log("VO-01", 165, "10:40", "user.rate-committee", "approve", 3, "BQ-006.excessRate", "26,800", "26,000",
                "يسري على الكمية الزائدة عن 20% فقط.", 2),
            Log("VO-01", 160, "12:05", "user.co-rapporteur", "record-external", 4, "الدائرة الإدارية والمالية", "بانتظار الجهة", "وردت",
                "سُجِّل نيابةً عن الدائرة الإدارية والمالية بموجب الكتاب OUT-5107.", 2),
            Log("VO-01", 150, "12:30", "user.co-rapporteur", "approve", 5, "value", "12,400,000", "10,000,000",
                "الاعتماد النهائي — أمر وزاري. سُجِّل نيابةً عن الوزير / المفوَّض.", 2),
            Log("VO-01", 147, "09:00", "system", "apply", 6, "contractValue", "240,000,000", "250,000,000",
                "ملحق العقد رقم 1.", 2),
            Log("VO-01", 145, "09:20", "system", "apply", 6, "weightsSum", "100.00%", "100.00%",
                "أُعيد احتساب الأوزان وتحقّق بلوغها 100.00%.", 2),
            Log("VO-01", 143, "15:45", "user.project-manager", "close", 6, "lifecycle", "مطبَّق", "مغلق", null, 2),

            // VO-02 — three rows and then silence, which is what «متأخر» looks
            // like in a log: nothing has happened for fourteen days.
            Log("VO-02", 22, "09:05", "user.re-dept", "create", 1, null, null, "VO-02",
                "تغيير مواصفة الإكساء بطلب الجهة المستفيدة."),
            Log("VO-02", 21, "13:10", "user.re-dept", "submit", 1, "lifecycle", "مسودة", "قيد الاعتماد"),
            Log("VO-02", 14, "10:00", "user.co-committee", "approve", 2, "stage", "لجنة أوامر الغيار", "تثبيت الأسعار"),

            // VO-03 — the return, with the previous value kept beside the new
            // one and the deciding party named in the note (`03 §4`, §5).
            Log("VO-03", 60, "08:55", "user.re-dept", "create", 1, null, null, "VO-03",
                "تأخر توريد مواد الواجهة من المنشأ."),
            Log("VO-03", 59, "10:30", "user.re-dept", "submit", 1, "lifecycle", "مسودة", "قيد الاعتماد"),
            Log("VO-03", 44, "11:20", "user.co-committee", "approve", 2, "stage", "لجنة أوامر الغيار", "المصادقة والتخصيص"),
            Log("VO-03", 30, "14:10", "user.co-rapporteur", "return", 4, "lifecycle", "قيد الاعتماد", "معاد للتعديل",
                "سُجِّل نيابةً عن لجنة المراجعة المصادقة بموجب الكتاب OUT-5088."),

            // VO-04 — approved, applied, and the step that failed is in the log
            // as a value change like any other.
            Log("VO-04", 120, "09:30", "user.re-dept", "create", 1, null, null, "VO-04",
                "إعادة توزيع الكميات بين الطوابق دون تغيير القيمة الكلية."),
            Log("VO-04", 119, "10:05", "user.re-dept", "submit", 1, "lifecycle", "مسودة", "قيد الاعتماد"),
            Log("VO-04", 98, "11:45", "user.co-rapporteur", "approve", 5, "lifecycle", "قيد الاعتماد", "معتمد",
                "سُجِّل نيابةً عن الوزير / المفوَّض.", 2),
            Log("VO-04", 96, "09:10", "system", "apply", 6, "BQ-008.qty", "8,800", "8,300", null, 2),
            Log("VO-04", 96, "09:10", "system", "apply", 6, "BQ-009.qty", "12,800", "13,300", null, 2),
            Log("VO-04", 96, "09:12", "system", "apply-failed", 6, "weightsSum", "100.00%", "99.94%",
                "فشل إعادة احتساب الأوزان — يتطلب إعادة تشغيل.", 2),

            // VO-05 — approved two days ago and NOT applied: the log stops at
            // the approval, exactly where the contract stops changing.
            Log("VO-05", 9, "08:20", "user.re-dept", "create", 1, null, null, "VO-05",
                "إضافة أعمال تبليط وإنارة للساحات بطلب الجهة المستفيدة."),
            Log("VO-05", 8, "09:40", "user.re-dept", "submit", 1, "lifecycle", "مسودة", "قيد الاعتماد"),
            Log("VO-05", 3, "10:15", "user.co-rapporteur", "record-external", 4, "الدائرة الإدارية والمالية", "بانتظار الجهة", "وردت",
                "سُجِّل نيابةً عن الدائرة الإدارية والمالية بموجب الكتاب OUT-5203.", 2),
            Log("VO-05", 2, "13:25", "user.co-rapporteur", "approve", 5, "value", "3,375,000", "3,000,000",
                "الاعتماد النهائي — أمر وزاري. سُجِّل نيابةً عن الوزير / المفوَّض.", 2),

            // VO-06 — five days old and moving.
            Log("VO-06", 5, "09:00", "user.re-dept", "create", 1, null, null, "VO-06",
                "عدم توفر المواصفة المتعاقد عليها لدى المجهّز."),
            Log("VO-06", 4, "11:30", "user.re-dept", "submit", 1, "lifecycle", "مسودة", "قيد الاعتماد"),
            Log("VO-06", 3, "09:45", "user.co-committee", "edit", 2, "BQ-002.rate", "14,500,000", "14,345,250",
                "سعر دائرة المهندس المقيم بعد مطابقة العرض الفني.")
        );

        db.SaveChanges();
    }

    /// <param name="stageNo">Which of the six stages the file arrived at (`03 §9`).</param>
    /// <param name="uploadedBy">
    /// The party that RAISED it — الشكل 34's «المستخدم» column. A file raised by
    /// the rate-fixing committee attributed to the resident engineer would make
    /// the provenance the tab exists for worthless.
    /// </param>
    private static ChangeOrderAttachment Att(
        string no, Dictionary<string, int> byNo, string file, string category, int version,
        int stageNo, string uploadedBy, int uploadedAgo) => new()
    {
        ChangeOrderId = byNo[no], FileName = file, Category = category,
        Version = version, OriginStageNo = stageNo, SizeBytes = 240_000,
        UploadedByUserId = uploadedBy,
        // D-06 — measured back from the data date like every other age here,
        // never from the wall clock.
        UploadedAt = new DateOnly(2026, 8, 2).AddDays(-uploadedAgo).ToDateTime(TimeOnly.MinValue),
    };

/// <summary>
    /// **الشكل 5 tab 2** — «سجل النشاط» on the project definition, and one of
    /// the three trails SCR-W15 unions.
    ///
    /// ── WHY THIS EXISTS ─────────────────────────────────────────────────
    /// Every other record in this fixture carries its own history: the
    /// contract has `ContractActivityEvents` (الشكل 11) and each change order
    /// has `ChangeOrderAuditEntries` (03 §9 tab 6). The PROJECT had none —
    /// its rows are only written by EP-PRJ-02 and EP-PRJ-03 — so الشكل 5's
    /// second tab rendered its empty state on a project that plainly did get
    /// created and edited. SCR-W14 found it: RPT-11 «سجل التدقيق» reported
    /// «سجل نشاط المشروع» as an empty source.
    ///
    /// The dates track the project's own story: defined before the contract
    /// was awarded (2025-11-02), then edited as the definition firmed up.
    ///
    /// Illustrative, not ministry data — like every figure in this file.
    /// </summary>
    private static void ProjectActivity(EpmDb db)
    {
        ProjectActivityEvent E(string action, string actorId, string name,
                               string role, string party, DateOnly at) => new()
        {
            ProjectId = "PRJ-0279", Action = action,
            ActorId = actorId, ActorName = name, ActorRole = role, ActorParty = party,
            At = at,
        };

        // The same actors the contract log names (الشكل 11), so one reader
        // following a change from the project to its contract meets the same
        // people rather than a second cast.
        db.ProjectActivityEvents.AddRange(
            E("created", "user.univ-specialist", "أحمد فؤاد",
                "مهندس مشروع", "دائرة الإعمار والمشاريع", new DateOnly(2025, 10, 12)),
            E("updated", "user.univ-specialist", "أحمد فؤاد",
                "مهندس مشروع", "دائرة الإعمار والمشاريع", new DateOnly(2025, 11, 2)),
            E("updated", "user.univ-specialist", "أحمد فؤاد",
                "مهندس مشروع", "دائرة الإعمار والمشاريع", new DateOnly(2026, 3, 18)),
            E("updated", "user.project-manager", "حيدر الجبوري",
                "مدير مشروع", "دائرة الإعمار والمشاريع", new DateOnly(2026, 7, 6)));

        db.SaveChanges();
    }

    /// <summary>
    /// ملحق الشكل 43 — سجل المخاطر, the plate's own seven rows.
    ///
    /// They are seeded verbatim because they are the SPECIFICATION: nothing in
    /// `01`–`06` defines a risk model, and these seven are what fix
    /// Domain/RiskSeverity's bands (RSK-05 and RSK-06 both score 3 and both
    /// read متوسط; RSK-03 scores 2 and reads منخفض).
    ///
    /// Severity is NOT stored — the register derives it, so a row here cannot
    /// disagree with the screen that prints the rule.
    ///
    /// Illustrative, not ministry data — like every figure in this file.
    /// </summary>
    private static void Risks(EpmDb db)
    {
        const int Low = 1, Med = 2, High = 3;

        Risk R(string code, string ar, string en, string category,
            int probability, int impact, string owner, string indicator, string status,
            int raisedAgo) => new()
        {
            ProjectId = "PRJ-0279", Code = code, TitleAr = ar, TitleEn = en,
            Category = category, Probability = probability, Impact = impact,
            Owner = owner, Indicator = indicator, Status = status,
            RaisedDate = new DateOnly(2026, 8, 2).AddDays(-raisedAgo),
        };

        db.Risks.AddRange(
            // متوسط × عالي = 6 → عالي. The one high risk on the plate, and the
            // one the register's «عالي 1» tab counts.
            R("RSK-01", "تأخر تجهيز المواد الكهربائية", "Delay in supplying the electrical materials",
                "schedule", Med, High, "مدير المشروع", "SPI", "suspended", 96),

            R("RSK-02", "تجاوز الكلفة التقديرية", "Overrun against the estimated cost",
                "financial", Low, Low, "القسم المالي", "CPI", "mitigating", 88),

            R("RSK-03", "نقص الأيدي العاملة الماهرة", "Shortage of skilled labour",
                "operational", Med, Low, "القسم الهندسي", "VAC", "suspended", 74),

            R("RSK-04", "نزاع تعاقدي حول التمديد", "Contractual dispute over the extension",
                "legal", Low, Low, "المقاول", "EAC", "mitigating", 61),

            // منخفض × عالي = 3 → متوسط, and RSK-06 is its mirror. The pair is
            // what pins the band boundary at 2/3.
            R("RSK-05", "تعارض في المخططات التنفيذية", "Conflict in the shop drawings",
                "technical", Low, High, "مدير المشروع", "SPI", "suspended", 47),

            R("RSK-06", "عدم مطابقة خرسانة الأساس", "Foundation concrete does not conform",
                "quality", High, Low, "القسم المالي", "CPI", "mitigating", 33),

            R("RSK-07", "مخاطر السلامة في أعمال الارتفاعات", "Safety risk in work at height",
                "safety", Low, Med, "القسم الهندسي", "VAC", "open", 19)
        );

        db.SaveChanges();
    }

/// <summary>
    /// **ملحق الشكل 44** — the six elements of «شجرة النموذج», their three
    /// versions, and the links that are the point of the screen.
    ///
    /// ── THE PLATE'S TREE, ON THIS FIXTURE'S CONTRACTS ────────────────────
    /// الشكل 44 draws مبنى A with L00 · L01 · L02 and names its selected
    /// element COL-L1 «أعمدة الطابق الأول» — إنشائي, منجز, Zone A, 68 عمود,
    /// R2, 100%, linked to a concrete-columns BOQ line and to activity **A4**.
    /// This fixture's CNT-0279 carries BQ-007 «الأعمدة والجسور الخرسانية» and
    /// activity A4 of the same name, so the plate's link is reproduced against
    /// rows that actually exist rather than copied as dead text.
    ///
    /// The mechanical and electrical elements cross to the OTHER contract and
    /// to CNT-0279's first-fix line, which is what makes `ContractId` on the
    /// element necessary: BQ-002 exists on both contracts and means two
    /// different things.
    ///
    /// One element is متأخر and three are حرج, so the colour key and the ring
    /// both have something to show.
    ///
    /// Illustrative, not ministry data — like every figure in this file.
    /// </summary>
    private static void ModelElements(EpmDb db)
    {
        const string BuildingAr = "مبنى A";
        const string BuildingEn = "Building A";
        const string ZoneA = "Zone A";

        ModelElement E(string code, string ar, string en, string discipline, string status,
                       bool critical, string level, decimal qty, string unit,
                       string contract, string boq, string activity, decimal progress,
                       string revision) => new()
        {
            ProjectId = "PRJ-0279", Code = code, NameAr = ar, NameEn = en,
            Discipline = discipline, Status = status, IsCritical = critical,
            BuildingAr = BuildingAr, BuildingEn = BuildingEn, Level = level, Zone = ZoneA,
            Qty = qty, Unit = unit,
            ContractId = contract, BoqCode = boq, ActivityCode = activity,
            ProgressPct = progress, Revision = revision,
        };

        db.ModelElements.AddRange(
            E("FND-01", "الأساسات", "Foundations", "structural", "completed", true,
                "L00", 420m, "م³", "CNT-0279", "BQ-006", "A3", 100m, "R2"),
            // الشكل 44's selected element, field for field.
            E("COL-L1", "أعمدة الطابق الأول", "Level 1 columns", "structural", "completed", true,
                "L01", 68m, "عمود", "CNT-0279", "BQ-007", "A4", 100m, "R2"),
            E("SLB-L1", "سقف الطابق الأول", "Level 1 slab", "structural", "completed", false,
                "L01", 640m, "م²", "CNT-0279", "BQ-003", "A5", 100m, "R2"),
            E("SLB-L2", "سقف الطابق الثاني", "Level 2 slab", "structural", "inprogress", false,
                "L02", 640m, "م²", "CNT-0279", "BQ-003", "A5", 72m, "R2"),
            // Mechanical — the electromechanical contract's HVAC line.
            E("DUCT-L2-01", "مجرى هواء — ميكانيكي", "Duct run — mechanical", "mechanical", "inprogress", false,
                "L02", 85m, "م.ط", "CNT-0279-EM", "BQ-004", "E3", 25m, "R3"),
            // Electrical — the civil contract's first-fix line, and the one
            // element the key needs to show متأخر.
            E("CND-L2-01", "مسارات كهرباء", "Electrical conduit", "electrical", "delayed", true,
                "L02", 120m, "م.ط", "CNT-0279", "BQ-011", "A9", 40m, "R2"));

        // «الحالي · 01-06-2026» on the selector, with the two it replaced kept
        // readable — a re-issue never deletes what it replaced.
        db.ModelVersions.AddRange(
            new ModelVersion { ProjectId = "PRJ-0279", Code = "m1",
                LabelAr = "الإصدار 1", LabelEn = "Version 1",
                IssuedOn = new DateOnly(2025, 11, 20), By = "م. مصطفى" },
            new ModelVersion { ProjectId = "PRJ-0279", Code = "m2",
                LabelAr = "الإصدار 2", LabelEn = "Version 2",
                IssuedOn = new DateOnly(2026, 2, 15), By = "م. ليلى حسن" },
            new ModelVersion { ProjectId = "PRJ-0279", Code = "m3",
                LabelAr = "الإصدار الحالي", LabelEn = "Current version",
                IssuedOn = new DateOnly(2026, 6, 1), By = "م. أحمد فؤاد", IsCurrent = true });

        db.SaveChanges();
    }

    /// <summary>
    /// ملحق الشكل 45 — محاضر الاجتماعات وسجل الإجراءات, the plate's three
    /// minutes and its three actions.
    ///
    /// ACT-01 is deliberately past its due date: «متأخر» on the plate is a DATE
    /// that has passed, not a state, and the register derives it against the
    /// project's data date (D-06). ACT-03 is closed and its date is older
    /// still — a closed action is never overdue, which is the pair that proves
    /// the derivation rather than asserting it.
    ///
    /// Illustrative, not ministry data — like every figure in this file.
    /// </summary>
    private static void Meetings(EpmDb db)
    {
        var minutes = new List<Meeting>
        {
            new()
            {
                ProjectId = "PRJ-0279",
                TitleAr = "الكشف على نسب الإنجاز", TitleEn = "Progress inspection",
                HeldOn = new DateOnly(2026, 4, 11),
                DecisionAr = "تكليف المقاول بتسريع أعمال الكهرباء خلال أسبوعين",
                DecisionEn = "The contractor is directed to accelerate the electrical works within two weeks",
                FileName = "MoM-2026-04-11.pdf",
            },
            new()
            {
                ProjectId = "PRJ-0279",
                TitleAr = "تدقيق السلف التشغيلية", TitleEn = "Operating advances audit",
                HeldOn = new DateOnly(2026, 2, 27),
                DecisionAr = "اعتماد تسوية السلفة رقم 3",
                DecisionEn = "Settlement of advance no. 3 approved",
                FileName = "MoM-2026-02-27.pdf",
            },
            // The plate's third minute has NO attachment — and the timeline
            // simply shows no card, rather than an empty one.
            new()
            {
                ProjectId = "PRJ-0279",
                TitleAr = "دراسة طلب التمديد", TitleEn = "Extension request review",
                HeldOn = new DateOnly(2026, 1, 9),
                DecisionAr = "الموافقة المبدئية على تمديد 30 يوماً",
                DecisionEn = "Provisional approval of a 30-day extension",
                FileName = null,
            },
        };

        db.Meetings.AddRange(minutes);
        db.SaveChanges();

        var byTitle = minutes.ToDictionary(m => m.TitleAr, m => m.Id);

        db.MeetingActions.AddRange(
            // «متأخر» is a STORED value on this register, not a derivation —
            // ACT-02 below is past due and still reads «قيد التنفيذ» on the
            // plate, which is what settles it (P-116).
            new MeetingAction
            {
                MeetingId = byTitle["الكشف على نسب الإنجاز"], Code = "ACT-01",
                TitleAr = "تسريع أعمال الكهرباء", TitleEn = "Accelerate the electrical works",
                Owner = "المقاول", DueDate = new DateOnly(2026, 4, 25),
                Priority = "high", Status = "overdue",
            },
            new MeetingAction
            {
                MeetingId = byTitle["تدقيق السلف التشغيلية"], Code = "ACT-02",
                TitleAr = "تسوية السلفة رقم 3", TitleEn = "Settle advance no. 3",
                Owner = "القسم المالي", DueDate = new DateOnly(2026, 5, 10),
                Priority = "medium", Status = "inprogress",
            },
            // CLOSED, and its date is the oldest of the three.
            new MeetingAction
            {
                MeetingId = byTitle["دراسة طلب التمديد"], Code = "ACT-03",
                TitleAr = "دراسة طلب التمديد", TitleEn = "Review the extension request",
                Owner = "لجنة التمدد", DueDate = new DateOnly(2026, 2, 1),
                Priority = "high", Status = "closed",
            }
        );

        db.SaveChanges();
    }

/// <summary>
    /// **ملحق الشكل 47** — the twelve alert rules of «قواعد التنبيه على مستوى
    /// المشروع», in the plate's own order with the plate's own conditions,
    /// severities, channels, recurrences and escalation ceilings. All twelve
    /// are enabled, which is what «12 مفعلة من 12» reports.
    ///
    /// ── THE CONDITIONS ARE TEXT, DELIBERATELY ────────────────────────────
    /// «انزياح ≥ 5 أيام» is stored as prose because nothing evaluates it: no
    /// scheduler runs in this prototype and `07 §2` lists the delivery engine
    /// as POC work. The alerts below are seeded rows that NAME the rule they
    /// would have come from, which is enough to make الشكل 47's own promise
    /// real — switch a rule off and its alerts leave the inbox (P-119).
    ///
    /// Illustrative, not ministry data — like every figure in this file.
    /// </summary>
    private static void AlertRules(EpmDb db)
    {
        AlertRule R(string code, string ar, string en, string trigAr, string trigEn,
                    string sev, bool email, bool sms, string recurrence, int? escalateHours) => new()
        {
            ProjectId = "PRJ-0279", Code = code, NameAr = ar, NameEn = en,
            TriggerAr = trigAr, TriggerEn = trigEn, Severity = sev,
            ChannelInApp = true, ChannelEmail = email, ChannelSms = sms,
            Recurrence = recurrence, EscalateAfterHours = escalateHours, Enabled = true,
        };

        db.AlertRules.AddRange(
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
                "تجاوز سقف مرحلة التدقيق", "Past the audit stage ceiling", "critical", true, true, "daily", 48));

        db.SaveChanges();
    }

    /// <summary>
    /// ملحق الشكل 46 — الوثائق والمخططات: the plate's **14 documents and 21
    /// revisions**, with its own folder counts (معماري 3 · إنشائي 2 · كهربائي 3 ·
    /// ميكانيكي 2 · مدني وبنى تحتية 2 · تقارير ومراسلات 2) and its own status
    /// split (معتمد 8 · مسوّدة 6 · مرفوض 0 · قيد المراجعة 6).
    ///
    /// ── THE ROW THE PLATE OPENS IS SEEDED IN FULL ────────────────────────
    /// ST-DR-002 «تفاصيل الأعمدة والجسور» carries R1 (2026-02-19 · TR-2417 ·
    /// «الإصدار الأولي») and R2 (2026-05-31 · TR-2416 · «مطابقة للمنفَّذ»),
    /// which is what the detail panel prints — R2 «الحالية» above R1 «ملغاة»,
    /// both keeping their file.
    ///
    /// EL-DR-001 and RP-001 are draft-then-approved, and RP-002 is
    /// approved-then-draft: three documents that make «قيد المراجعة» a count of
    /// CURRENT revisions rather than of draft ones.
    ///
    /// Illustrative, not ministry data — like every figure in this file.
    /// </summary>
    private static void Documents(EpmDb db)
    {
        const string Univ = "قسم التصميم — الجامعة";
        const string House = "دار الهندسة";
        const string Consult = "المكتب الاستشاري الهندسي";
        const string Contractor = "المقاول المنفّذ";

        Document D(string code, string ar, string en, string discipline, string issuer) => new()
        {
            ProjectId = "PRJ-0279", Code = code, TitleAr = ar, TitleEn = en,
            Discipline = discipline, Issuer = issuer,
        };

        var docs = new List<Document>
        {
            D("AR-DR-001", "مخطط الطوابق العامة", "General floor plans", "architectural", Univ),
            D("AR-DR-002", "الواجهات والمقاطع", "Elevations and sections", "architectural", House),
            D("AR-DR-003", "تفاصيل التشطيبات", "Finishing details", "architectural", Consult),
            D("ST-DR-001", "مخطط الأساسات", "Foundation plan", "structural", Univ),
            D("ST-DR-002", "تفاصيل الأعمدة والجسور", "Column and beam details", "structural", Univ),
            D("EL-DR-001", "مخطط التغذية الرئيسية", "Main power distribution", "electrical", Contractor),
            D("EL-DR-002", "مخطط الإنارة", "Lighting layout", "electrical", Consult),
            D("EL-DR-003", "أنظمة الإنذار والاتصالات", "Alarm and communication systems", "electrical", Consult),
            D("ME-DR-001", "مخطط التكييف والتهوية", "HVAC layout", "mechanical", Contractor),
            D("ME-DR-002", "مخطط التمديدات الصحية", "Plumbing layout", "mechanical", Contractor),
            D("CV-DR-001", "مخطط الطرق والساحات", "Roads and yards layout", "civil", Univ),
            D("CV-DR-002", "شبكة تصريف المياه", "Storm drainage network", "civil", Contractor),
            D("RP-001", "تقرير الفحوصات المختبرية", "Laboratory testing report", "reports", Consult),
            D("RP-002", "مراسلات التنسيق مع الجهة المستفيدة", "Coordination correspondence", "reports", Univ),
        };

        db.Documents.AddRange(docs);
        db.SaveChanges();

        var byCode = docs.ToDictionary(d => d.Code, d => d.Id);

        // THE TRANSMITTAL NUMBERS ARE THE PLATE'S OWN. It runs TR-2400 · 2404 ·
        // 2408 · … one base per document in code order, and gives the CURRENT
        // revision that base — so ST-DR-002's R2 is TR-2416 and its R1 is
        // TR-2417, which is exactly what the panel prints. An older revision
        // carrying a HIGHER transmittal reads oddly and is copied anyway: it is
        // the client's data, and inventing a tidier scheme would be inventing
        // ministry numbering.
        var baseNo = docs.Select((d, i) => (d.Code, No: 2400 + i * 4))
            .ToDictionary(x => x.Code, x => x.No);

        // How many revisions each document ends up with, so the CURRENT one can
        // take the base number before any of them is created.
        var revisionsOf = new Dictionary<string, int>
        {
            ["AR-DR-001"] = 1, ["AR-DR-002"] = 1, ["AR-DR-003"] = 1,
            ["ST-DR-001"] = 1, ["ST-DR-002"] = 2,
            ["EL-DR-001"] = 2, ["EL-DR-002"] = 1, ["EL-DR-003"] = 1,
            ["ME-DR-001"] = 3, ["ME-DR-002"] = 1,
            ["CV-DR-001"] = 2, ["CV-DR-002"] = 1,
            ["RP-001"] = 2, ["RP-002"] = 2,
        };

        DocumentRevision R(string code, int no, string issuedOn, string issuer,
            string ar, string en, string status) => new()
        {
            DocumentId = byCode[code], No = no,
            IssuedOn = DateOnly.Parse(issuedOn), Issuer = issuer,
            DescriptionAr = ar, DescriptionEn = en,
            TransmittalNo = $"TR-{baseNo[code] + revisionsOf[code] - no}",
            FileName = $"{code}-R{no}.pdf",
            Status = status,
        };

        const string First = "الإصدار الأولي";
        const string FirstEn = "Initial issue";
        const string AsBuilt = "مطابقة للمنفَّذ";
        const string AsBuiltEn = "As-built";
        const string Comments = "معالجة ملاحظات التدقيق";
        const string CommentsEn = "Review comments addressed";

        db.DocumentRevisions.AddRange(
            R("AR-DR-001", 1, "2026-05-29", Univ, First, FirstEn, "approved"),
            R("AR-DR-002", 1, "2026-05-15", House, First, FirstEn, "draft"),
            R("AR-DR-003", 1, "2026-06-06", Consult, First, FirstEn, "approved"),
            R("ST-DR-001", 1, "2026-05-16", Univ, First, FirstEn, "draft"),

            // The plate's own open row: R1 superseded by R2, and BOTH stay.
            R("ST-DR-002", 1, "2026-02-19", Univ, First, FirstEn, "approved"),
            R("ST-DR-002", 2, "2026-05-31", Univ, AsBuilt, AsBuiltEn, "draft"),

            R("EL-DR-001", 1, "2026-03-14", Contractor, First, FirstEn, "draft"),
            R("EL-DR-001", 2, "2026-06-06", Contractor, Comments, CommentsEn, "approved"),

            R("EL-DR-002", 1, "2026-05-11", Consult, First, FirstEn, "approved"),
            R("EL-DR-003", 1, "2026-05-11", Consult, First, FirstEn, "approved"),

            R("ME-DR-001", 1, "2026-01-20", Contractor, First, FirstEn, "draft"),
            R("ME-DR-001", 2, "2026-03-28", Contractor, Comments, CommentsEn, "draft"),
            R("ME-DR-001", 3, "2026-05-31", Contractor, AsBuilt, AsBuiltEn, "draft"),

            R("ME-DR-002", 1, "2026-04-18", Contractor, First, FirstEn, "draft"),

            R("CV-DR-001", 1, "2026-02-08", Univ, First, FirstEn, "draft"),
            R("CV-DR-001", 2, "2026-04-30", Univ, Comments, CommentsEn, "approved"),

            R("CV-DR-002", 1, "2026-03-02", Contractor, First, FirstEn, "approved"),

            R("RP-001", 1, "2026-02-15", Consult, First, FirstEn, "draft"),
            R("RP-001", 2, "2026-05-20", Consult, Comments, CommentsEn, "approved"),

            // Approved first, then re-issued as a draft — «قيد المراجعة» counts
            // this one and not EL-DR-001, which is the difference between
            // counting current revisions and counting drafts.
            R("RP-002", 1, "2026-01-28", Univ, First, FirstEn, "approved"),
            R("RP-002", 2, "2026-06-11", Univ, "إضافة مراسلات الشهر", "Monthly correspondence added", "draft")
        );

        db.SaveChanges();
    }

    /// <summary>
    /// سجل نشاط العقد — الشكل 11.
    ///
    /// The log is WRITTEN by EP-CON-03/04 as a contract is created and edited,
    /// so on a freshly loaded fixture it is empty and the tab shows its empty
    /// state. These rows are the history those endpoints would have written had
    /// the demo contracts been entered through the screens — plus the two event
    /// kinds the plate shows that come from OTHER modules and that nothing
    /// writes yet (an applied change order, a progress update). They are marked
    /// `system` and attributed to «النظام», exactly as الشكل 11 draws them.
    ///
    /// Illustrative, not ministry data — like every figure in this file.
    /// </summary>
    private static void ContractActivity(EpmDb db)
    {
        // Two people, so «بواسطة» is a real attribution and not one name
        // repeated: §7 wants the actor, the capacity and the party on each row.
        static ContractActivityEvent User(
            string contractId, string at, string field, string? before, string? after) => new()
        {
            ContractId = contractId, Action = "updated", Source = "user",
            Field = field, Before = before, After = after,
            ActorId = "user.univ-specialist", ActorName = "أحمد فؤاد",
            ActorRole = "مهندس مشروع", ActorParty = "دائرة الإعمار والمشاريع",
            At = DateOnly.Parse(at),
        };

        static ContractActivityEvent System(
            string contractId, string at, string action,
            string? refId, string? note, string? before, string? after) => new()
        {
            ContractId = contractId, Action = action, Source = "system",
            RefId = refId, Note = note, Before = before, After = after,
            Field = action == "progress" ? "physicalPct" : null,
            ActorId = "system", ActorName = "النظام",
            ActorRole = "حدث آلي", ActorParty = "نظام إدارة المشاريع",
            At = DateOnly.Parse(at),
        };

        db.ContractActivityEvents.AddRange(
            // The contract as it was entered, oldest first — the tab reverses it.
            new ContractActivityEvent
            {
                ContractId = "CNT-0279", Action = "created", Source = "user",
                ActorId = "user.univ-specialist", ActorName = "أحمد فؤاد",
                ActorRole = "مهندس مشروع", ActorParty = "دائرة الإعمار والمشاريع",
                At = new DateOnly(2025, 2, 18),
            },
            // «تغيير المكوّن من الإنشائي إلى الميكانيكي بواسطة محللة موازنة في
            // الدائرة المالية» — the plate's own example of a second actor.
            new ContractActivityEvent
            {
                ContractId = "CNT-0279", Action = "updated", Source = "user",
                Field = "component", Before = "المكوّن الإنشائي", After = "المكوّن المدني",
                ActorId = "user.fin-analyst", ActorName = "ليلى حسن",
                ActorRole = "محللة موازنة", ActorParty = "الدائرة المالية",
                At = new DateOnly(2025, 3, 6),
            },
            System("CNT-0279", "2026-01-26", "change-order", "VO-01",
                "زيادة كميات أعمال الكهرباء", null, null),
            User("CNT-0279", "2026-02-27", "contactInfo", "+964 771 111 2222", "+964 771 222 3333"),
            // The award amount an applied ملحق moved. The plate prints this one
            // as its worked example of a money diff.
            User("CNT-0279", "2026-04-06", "awardAmount", "230000000", "240000000"),
            System("CNT-0279", "2026-04-14", "progress", null, null, "18", "25"),
            System("CNT-0279", "2026-04-21", "change-order", "VO-02",
                "تمديد مدة الإنجاز", null, null),
            System("CNT-0279", "2026-05-15", "progress", null, null, "25", "31"),

            // The second contract carries a short log, so switching between the
            // two shows a different history rather than the same one twice.
            new ContractActivityEvent
            {
                ContractId = "CNT-0279-EM", Action = "created", Source = "user",
                ActorId = "user.univ-specialist", ActorName = "أحمد فؤاد",
                ActorRole = "مهندس مشروع", ActorParty = "دائرة الإعمار والمشاريع",
                At = new DateOnly(2025, 5, 12),
            },
            User("CNT-0279-EM", "2025-06-02", "contractor", "شركة المنصور", "شركة المنصور للتجهيزات"),
            System("CNT-0279-EM", "2026-05-15", "progress", null, null, "28", "35"));
    }

    /// <summary>
    /// التخصيص المالي السنوي — الشكل 15.
    ///
    /// Two years on the flagship project, so the screen shows what it exists to
    /// show: a CLOSED year read back beside a current one that is being spent.
    /// The 2025 allocation is set to exactly what 2025 disbursed — a year that
    /// closed clean — while 2026 is deliberately tighter than the work left,
    /// which is the «اقتراب استهلاك التخصيص» this screen warns about.
    ///
    /// Illustrative, not ministry data — like every figure in this file.
    /// </summary>
    private static void Allocations(EpmDb db)
    {
        static ProjectAllocation A(string projectId, int year, decimal amount, bool closed) => new()
        {
            ProjectId = projectId, Year = year, Amount = amount, Closed = closed,
            ActorName = "ليلى حسن", ActorRole = "محللة موازنة", ActorParty = "الدائرة المالية",
            At = new DateOnly(year, 1, 15),
        };

        db.ProjectAllocations.AddRange(
            // PRJ-0279 spent 86,700,000 in 2025 against a 90,000,000 release.
            A("PRJ-0279", 2025, 90_000_000m, closed: true),
            A("PRJ-0279", 2026, 120_000_000m, closed: false),

            A("PRJ-0148", 2025, 45_000_000m, closed: true),
            A("PRJ-0148", 2026, 30_000_000m, closed: false),

            A("PRJ-0207", 2026, 12_000_000m, closed: false));
    }

    /// <summary>
    /// مهل التدقيق — الشكل 17.
    ///
    /// The route of the ONE certificate that is in flight: `CNT-0279`'s third,
    /// certified on 2026-07-09 and not yet paid. Its first desk is done, its
    /// second still has it, and against the project's data date (2026-08-02)
    /// that second desk is past its 7-day cap — which is the case this screen
    /// exists to surface: «تُظهر موضع تعثّر المعاملة ومدة بقائها في كل جهة».
    ///
    /// Keyed by (contract, no) like the payment attachments, because
    /// `PaymentAuditStage.PaymentId` points at a generated key.
    /// </summary>
    private static void AuditStages(EpmDb db)
    {
        // The ids the stages hang off, the same way PaymentFiles gets them.
        db.SaveChanges();

        var p = db.Payments.FirstOrDefault(x => x.ContractId == "CNT-0279" && x.No == 3);
        if (p is null) return;

        db.PaymentAuditStages.AddRange(
            new PaymentAuditStage
            {
                PaymentId = p.Id, No = 1, StageKey = "resident-engineer",
                PartyAr = "المهندس المقيم", PartyEn = "Resident engineer",
                CapDays = 7,
                StartedAt = new DateOnly(2026, 7, 9),
                FinishedAt = new DateOnly(2026, 7, 14),
            },
            new PaymentAuditStage
            {
                PaymentId = p.Id, No = 2, StageKey = "finance",
                PartyAr = "الدائرة المالية", PartyEn = "Finance department",
                CapDays = 7,
                StartedAt = new DateOnly(2026, 7, 14),
                // Still there — this is the stage the file is stuck at.
                FinishedAt = null,
            },
            new PaymentAuditStage
            {
                PaymentId = p.Id, No = 3, StageKey = "disbursement",
                PartyAr = "قسم الحسابات", PartyEn = "Accounts section",
                CapDays = 5,
                StartedAt = null, FinishedAt = null,
            });
    }
}

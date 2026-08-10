using Epm.Api.Data;
using Epm.Api.Data.Entities;

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

        // ── next pages append their fixture rows here ────────────────────

        db.SaveChanges();
    }
}

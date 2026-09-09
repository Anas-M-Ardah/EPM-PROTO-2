using Epm.Api.Data;
using Epm.Api.Data.Entities;
using Epm.Api.Features.Dev;
using Epm.Api.Features.Workspaces;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Progress;

/// <summary>
/// المسار 7 — إغلاق فترة الإنجاز (`docs/WORKFLOW-TRACKS.md:322-360`). Confirmed
/// absent everywhere else this session: no entity, no endpoint, no UI button,
/// no reference-prototype screen (`docs/spec/reference/app/` grepped clean).
///
/// ── THE GATE ─────────────────────────────────────────────────────────────
/// Track 7's own actor is «إدارة المشاريع» — a phrase `03 §7`'s persona list
/// has no party literally named. `CanReviewProgressReading` is this codebase's
/// own established resolution for that exact phrase (P-157), and it doubles
/// as the right gate here: Track 7 starts on "approve the period's reading",
/// the same capacity.
/// </summary>
public static class AccomplishmentPeriodEndpoints
{
    /// <param name="NewDataDate">
    /// Required. No monthly/quarterly cadence exists anywhere in this system to
    /// default from (every fixture project sits on one fixed data date), so
    /// this stays typed rather than guessed.
    /// </param>
    public record ClosePeriodInput(string NewDataDate);

    public static void MapAccomplishmentPeriodEndpoints(this WebApplication app)
    {
        // [EP-ACP-01] GET /api/projects/{projectId}/periods
        // web: accomplishment-periods.api.ts list() → progress.page.ts
        // spec: 322-360 | rules: —
        // tables: Projects · AccomplishmentPeriods *(bootstraps period 1)*
        //
        // LAZY BOOTSTRAP. There is no "start tracking periods" moment in the
        // spec and every project starts with zero rows, so period 1 is created
        // the first time anyone asks — never a second gated action nobody
        // requested.
        app.MapGet("/api/projects/{projectId}/periods", async (EpmDb db, HttpContext ctx, string projectId) =>
        {
            var p = await db.Projects.FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            if (WorkspaceScope.Deny(ctx, p.WorkspaceCode) is { } denied) return denied;

            var periods = await db.AccomplishmentPeriods
                .Where(x => x.ProjectId == projectId).OrderBy(x => x.PeriodNo).ToListAsync();

            if (periods.Count == 0)
            {
                var first = new AccomplishmentPeriod
                {
                    ProjectId = projectId,
                    PeriodNo = 1,
                    OpenedOn = p.DataDate ?? DateOnly.FromDateTime(DateTime.UtcNow),
                    Status = "open",
                };
                db.AccomplishmentPeriods.Add(first);
                await db.SaveChangesAsync();
                periods = [first];
            }

            var persona = (Persona)ctx.Items["user"]!;

            return Results.Ok(new
            {
                ProjectId = p.Id,
                DataDate = p.DataDate?.ToString("yyyy-MM-dd"),
                CanClose = persona.CanReviewProgressReading(),
                Periods = periods.Select(x => new
                {
                    x.Id,
                    x.PeriodNo,
                    OpenedOn = x.OpenedOn.ToString("yyyy-MM-dd"),
                    ClosedOn = x.ClosedOn?.ToString("yyyy-MM-dd"),
                    x.Status,
                    x.PhysicalPct,
                    x.FinancialPct,
                    x.Cpi,
                    x.Spi,
                    x.Eac,
                    x.Vac,
                    x.ClosedByParty,
                }).OrderByDescending(x => x.PeriodNo).ToList(),
            });
        });

        // [EP-ACP-02] POST /api/projects/{projectId}/periods/{periodId}/close
        // web: accomplishment-periods.api.ts close() → progress.page.ts
        // spec: 322-360 (steps 1-7) | rules: —
        // tables: AccomplishmentPeriods · Projects *(written)*
        app.MapPost("/api/projects/{projectId}/periods/{periodId:int}/close",
            async (EpmDb db, HttpContext ctx, string projectId, int periodId, ClosePeriodInput input) =>
        {
            var p = await db.Projects.FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            if (WorkspaceScope.Deny(ctx, p.WorkspaceCode) is { } denied) return denied;

            var persona = (Persona)ctx.Items["user"]!;
            if (!persona.CanReviewProgressReading()) return Results.StatusCode(StatusCodes.Status403Forbidden);

            var period = await db.AccomplishmentPeriods
                .FirstOrDefaultAsync(x => x.Id == periodId && x.ProjectId == projectId);
            if (period is null) return Results.NotFound(new { message = $"period {periodId} not found on {projectId}" });
            if (period.Status != "open")
                return Results.UnprocessableEntity(new { message = "الفترة مقفلة أصلاً" });

            if (!DateOnly.TryParse(input.NewDataDate, out var newDataDate) || newDataDate <= (p.DataDate ?? DateOnly.MinValue))
                return Results.UnprocessableEntity(new
                {
                    message = "تاريخ البيانات الجديد يجب أن يكون بعد تاريخ البيانات الحالي",
                    field = "newDataDate",
                });

            var contractIds = await db.Contracts.AsNoTracking()
                .Where(c => c.ProjectId == projectId).Select(c => c.Id).ToListAsync();

            // Step 3 — «تحقق: اكتمال الأدلة والوثائق الإلزامية»، مبسّطة إلى ما
            // هو مخزَّن فعلاً (P-250): لا قراءة قيد المراجعة، ولا قراءة اعتُمدت
            // منذ فتح هذه الفترة بلا دليل واحد على الأقل.
            var pendingReading = await db.ProgressReadings.AsNoTracking()
                .AnyAsync(r => contractIds.Contains(r.ContractId) && r.State == "submitted");
            if (pendingReading)
                return Results.UnprocessableEntity(new
                {
                    message = "توجد قراءات إنجاز بانتظار المراجعة — لا يمكن إغلاق الفترة قبل البتّ فيها",
                });

            var approvedSincePeriodOpen = await db.ProgressReadings.AsNoTracking()
                .Where(r => contractIds.Contains(r.ContractId) && r.State == "approved"
                    && r.ReviewedAt != null && r.ReviewedAt >= period.OpenedOn)
                .ToListAsync();

            if (approvedSincePeriodOpen.Count > 0)
            {
                var readingIds = approvedSincePeriodOpen.Select(r => r.Id).ToList();
                var evidenceCounts = await db.ProgressReadingEvidence.AsNoTracking()
                    .Where(e => readingIds.Contains(e.ReadingId))
                    .GroupBy(e => e.ReadingId).Select(g => g.Key).ToListAsync();
                var withoutEvidence = readingIds.Except(evidenceCounts).Any();

                if (withoutEvidence)
                    return Results.UnprocessableEntity(new
                    {
                        message = "توجد قراءات معتمدة ضمن هذه الفترة بلا أدلة مؤيدة — لا يمكن إغلاق الفترة",
                    });
            }

            // Steps 2/5 — «تثبيت القيم» ثم «تحويل الفترة إلى سجل مقفل». Reuses
            // the exact figures `EP-PRG-01` shows (P-54's own argument): a
            // second derivation here is how a snapshot and its own screen come
            // to disagree about one number.
            var snapshot = await ProgressEndpoints.Build(db, projectId);
            if (snapshot is not null)
            {
                period.PhysicalPct = snapshot.Headline.Physical;
                period.FinancialPct = snapshot.Headline.Financial;
                period.Cpi = snapshot.Evm.Cpi;
                period.Spi = snapshot.Evm.Spi;
                period.Eac = snapshot.Evm.Eac;
                period.Vac = snapshot.Evm.Vac;
            }

            period.ClosedOn = p.DataDate;
            period.Status = "closed";
            period.ClosedByUserId = persona.Id;
            period.ClosedByParty = persona.Party;

            // Step 6/7 — «فتح الفترة التالية» ثم «تحديث تاريخ البيانات».
            db.AccomplishmentPeriods.Add(new AccomplishmentPeriod
            {
                ProjectId = projectId,
                PeriodNo = period.PeriodNo + 1,
                OpenedOn = newDataDate,
                Status = "open",
            });

            p.DataDate = newDataDate;

            await db.SaveChangesAsync();

            return Results.Ok(new { period.Id, period.PeriodNo, NewDataDate = newDataDate.ToString("yyyy-MM-dd") });
        });
    }
}

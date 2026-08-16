using Epm.Api.Data;
using Epm.Api.Features.Workspaces;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Meetings;

/// <summary>
/// SCR-W11 — محاضر الاجتماعات وسجل الإجراءات (**ملحق الشكل 45**).
///
/// ── «متأخر» IS A VALUE THIS REGISTER CARRIES ─────────────────────────────
/// It is NOT derived from the due date. الشكل 45 settles it: ACT-02 is past its
/// due date and still reads «قيد التنفيذ» while ACT-01 reads «متأخر», so
/// lateness here is the minute-keeper's judgement rather than the calendar's
/// (P-116). Where the system DOES own the clock — a change-order stage, a
/// payment desk — BR-12 derives it against the data date, and this register is
/// deliberately not that.
/// </summary>
public static class MeetingsEndpoints
{
    public static void MapMeetingsEndpoints(this WebApplication app)
    {
        // [EP-MTG-01] GET /api/projects/{projectId}/meetings
        // web: meetings/meetings.api.ts list() → meetings.page.ts
        // spec: ملحق الشكل 45 | rules: D-06 (the data date)
        // tables: Projects · Meetings · MeetingActions
        app.MapGet("/api/projects/{projectId}/meetings",
            async (EpmDb db, HttpContext ctx, string projectId) =>
        {
            var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            if (WorkspaceScope.Deny(ctx, p.WorkspaceCode) is { } denied) return denied;

            // NEWEST FIRST — the plate's timeline reads down from the most
            // recent meeting, because that is the one whose actions are open.
            var meetings = await db.Meetings.AsNoTracking()
                .Where(m => m.ProjectId == projectId)
                .OrderByDescending(m => m.HeldOn)
                .ToListAsync();

            var ids = meetings.Select(m => m.Id).ToList();

            var actions = await db.MeetingActions.AsNoTracking()
                .Where(a => ids.Contains(a.MeetingId))
                .OrderBy(a => a.Code)
                .ToListAsync();

            return Results.Ok(new MeetingsResponse(
                p.Id, p.NameAr, p.NameEn, p.DataDate?.ToString("yyyy-MM-dd"),
                meetings.Count, actions.Count,
                meetings.Select(m => new MeetingRow(
                    m.Id, m.TitleAr, m.TitleEn, m.HeldOn?.ToString("yyyy-MM-dd"),
                    m.DecisionAr, m.DecisionEn, m.FileName, KindOf(m.FileName))).ToList(),
                actions.Select(a => new ActionRow(
                    a.Code, a.TitleAr, a.TitleEn, a.Owner,
                    a.DueDate?.ToString("yyyy-MM-dd"), a.Priority, a.Status,
                    a.MeetingId)).ToList()));
        });
    }

    /// <summary>«محضر اجتماع · PDF» — the card's second line, off the extension.</summary>
    private static string? KindOf(string? fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName)) return null;
        var dot = fileName.LastIndexOf('.');
        return dot < 0 ? null : fileName[(dot + 1)..].ToUpperInvariant();
    }
}

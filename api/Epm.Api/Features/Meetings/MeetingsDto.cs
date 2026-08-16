namespace Epm.Api.Features.Meetings;

/// <summary>
/// Member names are IDENTICAL to
/// web/src/app/features/meetings/meetings.types.ts (CLAUDE.md §2).
///
/// SCR-W11 — محاضر الاجتماعات وسجل الإجراءات · **ملحق الشكل 45**.
/// </summary>

/// <param name="FileKind">
/// «محضر اجتماع · PDF» — what the attachment card prints. Derived from the file
/// name's extension; nothing stores a MIME type in this prototype.
/// </param>
public record MeetingRow(
    int Id,
    string TitleAr,
    string TitleEn,
    string? HeldOn,
    string DecisionAr,
    string DecisionEn,
    string? FileName,
    string? FileKind);

public record ActionRow(
    string Code,
    string TitleAr,
    string TitleEn,
    string Owner,
    string? DueDate,
    string Priority,
    string Status,
    int MeetingId);

public record MeetingsResponse(
    string ProjectId,
    string ProjectNameAr,
    string ProjectNameEn,
    string? DataDate,
    /// <summary>«المحاضر والقرارات 3» — the counter beside the first tab.</summary>
    int MeetingCount,
    int ActionCount,
    IReadOnlyList<MeetingRow> Meetings,
    IReadOnlyList<ActionRow> Actions);

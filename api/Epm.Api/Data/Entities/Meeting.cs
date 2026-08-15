namespace Epm.Api.Data.Entities;

/// <summary>
/// محضر اجتماع — SCR-W11 · **ملحق الشكل 45**.
///
/// The plate's timeline carries four things per minute: the date, the meeting's
/// title, ONE decision line, and the attached file. Everything else this entity
/// once carried (location, an attendee CSV) is off the screen and is pruned —
/// CLAUDE.md §4: the columns are what the page shows.
/// </summary>
public class Meeting
{
    public int Id { get; set; }

    public string ProjectId { get; set; } = "";

    public string TitleAr { get; set; } = "";
    public string TitleEn { get; set; } = "";

    /// <summary>The date the timeline orders by, newest first.</summary>
    public DateOnly? HeldOn { get; set; }

    /// <summary>
    /// «سطر القرار» — the one decision the plate prints under each title. A
    /// meeting with several decisions is several lines in the minutes file; what
    /// the timeline shows is the one that produced the actions below it.
    /// </summary>
    public string DecisionAr { get; set; } = "";
    public string DecisionEn { get; set; } = "";

    /// <summary>
    /// The minutes file — name only. No bytes are stored in this prototype, the
    /// same call the change-order attachments make.
    /// </summary>
    public string? FileName { get; set; }
}

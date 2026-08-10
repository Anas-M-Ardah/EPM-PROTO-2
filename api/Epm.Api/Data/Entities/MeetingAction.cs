namespace Epm.Api.Data.Entities;

/// <summary>An action item raised in a meeting. Part of SCR-W11.</summary>
public class MeetingAction
{
    public int Id { get; set; }

    public int MeetingId { get; set; }

    public string TitleAr { get; set; } = "";
    public string TitleEn { get; set; } = "";

    public string Owner { get; set; } = "";
    public DateOnly? DueDate { get; set; }

    /// <summary>open · inprogress · done · overdue</summary>
    public string Status { get; set; } = "open";
}

namespace Epm.Api.Domain;

/// <summary>
/// CO-08 guards for schedule changes. These are validation facts, not stored
/// schedule totals: the source schedule remains the authority.
/// </summary>
public static class ChangeOrderScheduleValidation
{
    public record Input(
        string ActivityId,
        int DeltaDays,
        bool IsCritical,
        decimal TotalFloat);

    public record Issue(string Code, string Ref, string MessageAr, string MessageEn);

    public static IReadOnlyList<Issue> Validate(IReadOnlyList<Input> inputs)
    {
        var issues = new List<Issue>();

        foreach (var group in inputs.GroupBy(x => x.ActivityId, StringComparer.OrdinalIgnoreCase))
            if (group.Count() > 1)
                issues.Add(new(
                    "schedule-overlap", group.Key,
                    "لا يمكن تعديل النشاط نفسه أكثر من مرة في الأمر التغييري.",
                    "The same activity cannot be changed more than once in one change order."));

        foreach (var input in inputs)
        {
            if (input.DeltaDays <= 0) continue;

            // A critical activity has no usable float. Any requested slip must
            // therefore be reviewed by schedule control before submission.
            if (input.IsCritical || input.DeltaDays > input.TotalFloat)
                issues.Add(new(
                    "critical-path", input.ActivityId,
                    "تأخير النشاط يمس المسار الحرج أو يتجاوز السماح الزمني ويتطلب مراجعة الجدول.",
                    "The activity delay affects the critical path or exceeds available float and requires schedule review."));
        }

        return issues;
    }
}

using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>
/// ملحق الشكل 47 — «القاعدة هي مصدر التنبيه».
///
/// The plate's footer is the worked example: التنبيهات 8 / 8 · تحتاج إجراءً 3 ·
/// حرجة 1 · محدد 0, read at the data date 2026-08-02.
/// </summary>
public class AlertInboxTests
{
    private static readonly DateOnly DataDate = new(2026, 8, 2);

    /// <summary>
    /// The plate's own inbox, as this fixture records it: eight alerts, four of
    /// them still open, three of those already due.
    /// </summary>
    private static AlertInbox.Item[] Inbox() =>
    [
        new(1, "R1", new DateOnly(2026, 8, 1), false),   // overdue, open
        new(2, "R12", new DateOnly(2026, 8, 2), false),  // due today, open
        new(3, "R5", new DateOnly(2026, 7, 30), false),  // overdue, open
        new(4, "R8", new DateOnly(2026, 8, 20), false),  // later, open
        new(5, "R3", new DateOnly(2026, 8, 12), true),   // acknowledged
        new(6, "R7", null, true),                        // acknowledged, no deadline
        new(7, "R2", new DateOnly(2026, 8, 9), true),    // acknowledged
        new(8, null, new DateOnly(2026, 7, 28), true),   // no rule produced it
    ];

    private static AlertInbox.Rule[] AllOn() =>
        new[] { "R1", "R2", "R3", "R5", "R7", "R8", "R12" }
            .Select(c => new AlertInbox.Rule(c, true)).ToArray();

    [Fact]
    public void Fig47_eight_alerts_and_three_need_action_now()
    {
        var live = AlertInbox.Live(Inbox(), AllOn());

        Assert.Equal(8, live.Count);
        Assert.Equal(3, AlertInbox.NeedsAction(live, DataDate));
    }

    [Fact]
    public void Disabling_a_rule_withdraws_the_alerts_it_produced()
    {
        var rules = AllOn().Select(r => r.Code == "R1" ? r with { Enabled = false } : r).ToArray();

        var live = AlertInbox.Live(Inbox(), rules);

        Assert.Equal(7, live.Count);
        Assert.DoesNotContain(live, a => a.RuleCode == "R1");
        // And the header count drops in the same breath — the overdue R1 alert
        // was one of the three waiting on somebody.
        Assert.Equal(2, AlertInbox.NeedsAction(live, DataDate));
    }

    [Fact]
    public void An_alert_no_rule_produced_survives_every_rule_being_off()
    {
        var allOff = AllOn().Select(r => r with { Enabled = false }).ToArray();

        var live = AlertInbox.Live(Inbox(), allOff);

        Assert.Single(live);
        Assert.Null(live[0].RuleCode);
    }

    [Fact]
    public void An_alert_naming_a_rule_that_does_not_exist_is_suppressed()
    {
        var orphan = new AlertInbox.Item[] { new(9, "R99", new DateOnly(2026, 8, 1), false) };

        Assert.Empty(AlertInbox.Live(orphan, AllOn()));
    }

    [Fact]
    public void Needs_action_is_open_AND_due__neither_one_alone()
    {
        var live = AlertInbox.Live(Inbox(), AllOn());

        // Open but not yet due (id 4) does not count …
        Assert.Contains(live, a => a.Id == 4 && !a.Acknowledged);
        // … and neither does acknowledged-but-overdue (id 8).
        Assert.Contains(live, a => a.Id == 8 && a.Acknowledged);
        Assert.Equal(3, AlertInbox.NeedsAction(live, DataDate));
    }

    [Theory]
    [InlineData(2026, 7, 30, AlertInbox.Overdue)]
    [InlineData(2026, 8, 1, AlertInbox.Overdue)]
    [InlineData(2026, 8, 2, AlertInbox.Today)]
    [InlineData(2026, 8, 3, AlertInbox.Week)]
    [InlineData(2026, 8, 9, AlertInbox.Week)]   // exactly seven days out
    [InlineData(2026, 8, 10, AlertInbox.Later)]
    public void The_bucket_is_measured_against_the_DATA_DATE(int y, int m, int d, string expected)
        => Assert.Equal(expected, AlertInbox.Bucket(new DateOnly(y, m, d), DataDate));

    [Fact]
    public void An_alert_with_no_due_date_is_a_notice__it_sits_in_later()
        => Assert.Equal(AlertInbox.Later, AlertInbox.Bucket(null, DataDate));

    [Fact]
    public void Days_to_due_is_negative_when_it_has_passed()
    {
        Assert.Equal(-3, AlertInbox.DaysToDue(new DateOnly(2026, 7, 30), DataDate));
        Assert.Equal(0, AlertInbox.DaysToDue(DataDate, DataDate));
        Assert.Equal(7, AlertInbox.DaysToDue(new DateOnly(2026, 8, 9), DataDate));
        Assert.Null(AlertInbox.DaysToDue(null, DataDate));
    }
}

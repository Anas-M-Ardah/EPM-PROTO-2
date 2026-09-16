using Epm.Api.Data.Entities;
using Epm.Api.Domain;

namespace Epm.Domain.Tests;

public class ChangeOrderReviewTests
{
    [Theory]
    [InlineData(null, false)]
    [InlineData(0, false)]
    [InlineData(-1, false)]
    [InlineData(6800, true)]
    public void Excess_quantity_requires_positive_committee_rate(int? rate, bool valid)
    {
        foreach (var type in new[] { "inc", "dec" })
            Assert.Equal(valid, ChangeOrderReview.ValidApproval(
                new ChangeOrderLine { ChangeType = type, ContractedQty = 50 }, 15, null, rate));
    }

    [Fact]
    public void Exactly_twenty_percent_does_not_need_excess_rate()
        => Assert.True(ChangeOrderReview.ValidApproval(
            new ChangeOrderLine { ChangeType = "inc", ContractedQty = 50 }, 10, null, null));

    [Fact]
    public void Restart_removes_stale_approvals_and_leaves_one_active_stage()
    {
        var order = new ChangeOrder { Lifecycle = "returned", ApprovedValue = 90000, ApprovedDays = 0 };
        var stages = Enumerable.Range(1, 6).Select(n => new ChangeOrderStage {
            StageNo = n, Status = n == 1 || n == 3 ? "active" : "done", Decision = "approve",
            DecisionNote = "previous review", DecidedByUserId = "user", ActionedAt = new DateOnly(2026, 10, 1)
        }).ToList();
        var line = new ChangeOrderLine { ContractedQty = 50, BeforeQty = 50, ReDeptDeltaQty = 15,
            ReDeptExcessRate = 6500, ApprovedDeltaQty = 15, ApprovedExcessRate = 6000 };
        ChangeOrderReview.Restart(order, stages, [line], new DateOnly(2026, 10, 1));
        Assert.Equal(1, Assert.Single(stages, s => s.Status == "active").StageNo);
        Assert.All(stages.Skip(1), s => Assert.Equal("pending", s.Status));
        Assert.All(stages, s => { Assert.Null(s.Decision); Assert.Null(s.DecisionNote); Assert.Null(s.ActionedAt); });
        Assert.Null(order.ApprovedValue);
        Assert.Null(line.ApprovedDeltaQty);
        Assert.Null(line.ApprovedExcessRate);
        Assert.Equal(50, line.ContractedQty);
        Assert.Equal(15, line.ReDeptDeltaQty);
        Assert.Equal(6500, line.ReDeptExcessRate);
    }

    [Fact]
    public void Binding_rate_produces_runsheet_value()
    {
        var column = ChangeOrderRecord.For(new("D-02", "inc", 50, 50, 6000, 300000), new(15, null, 6800));
        Assert.Equal(94000, column.Impact);
        Assert.Equal(65, column.QtyAfter);
    }
}

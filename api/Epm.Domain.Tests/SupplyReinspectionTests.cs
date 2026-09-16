using Epm.Api.Domain;

namespace Epm.Domain.Tests;

public class SupplyReinspectionTests
{
    [Fact]
    public void Nonconformity_requires_reinspection_without_double_counting_delivery()
    {
        var receipts = new List<SupplyReceipts.Receipt> {
            new("warehouse", 5, null), new("preliminary", 5, "ub", 10, "غير مطابق") };
        Assert.NotNull(SupplyReceipts.Check("final", 5, "ub", 24, receipts));
        receipts.Add(new("resubmission", 5, "ub", 11, "مطابق", 10));
        Assert.Null(SupplyReceipts.Check("final", 5, "ub", 24, receipts));
        Assert.Equal(5, SupplyReceipts.ReceivedInto(receipts));
        Assert.Equal(5, SupplyReceipts.HandedOver(receipts));
        receipts.Add(new("final", 5, "ub", 12));
        Assert.Equal(0, SupplyReceipts.Remaining("final", 24, receipts));
        Assert.NotNull(SupplyReceipts.Check("final", 1, "tu", 24, receipts));
    }

    [Fact]
    public void Readiness_does_not_move_stock_and_alerts_use_the_data_date()
    {
        var receipts = new[] { new SupplyReceipts.Receipt("readiness", 5, null) };
        Assert.Equal(0, SupplyReceipts.ReceivedInto(receipts));
        Assert.Equal(7, SupplyReceipts.Remaining("warehouse", 7, receipts));
        Assert.DoesNotContain("استلام متأخر", SupplyReceipts.Alerts(7, receipts, false,
            new(2026, 8, 2), new(2026, 8, 2)));
        Assert.Contains("استلام متأخر", SupplyReceipts.Alerts(7, receipts, true,
            new(2026, 8, 2), new(2026, 8, 1)));
        Assert.Contains("نقص في مستندات الاستلام", SupplyReceipts.Alerts(7, receipts, true,
            new(2026, 8, 2), null));
    }
}

using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>
/// ملحق الشكل 46 — «المراجعات لا تُحذف».
///
/// The worked example is the plate's own ST-DR-002: R1 issued 2026-02-19 on
/// transmittal TR-2417, R2 issued 2026-05-31 on TR-2416, and the panel shows R2
/// «الحالية» above R1 «ملغاة».
/// </summary>
public class DocumentRevisionsTests
{
    private static readonly DocumentRevisions.Revision[] StDr002 =
    [
        new(1, "approved"),
        new(2, "draft"),
    ];

    [Fact]
    public void The_current_revision_is_the_highest_NUMBER()
    {
        var current = DocumentRevisions.Current(StDr002);

        Assert.NotNull(current);
        Assert.Equal(2, current!.No);
        Assert.Equal("draft", current.Status);
    }

    [Fact]
    public void It_is_the_number_that_orders_them_and_not_the_order_they_arrive_in()
    {
        // A revision inserted after the fact — a late R1 — does not become
        // current just because it was written last.
        var shuffled = new DocumentRevisions.Revision[] { new(3, "approved"), new(1, "draft"), new(2, "draft") };

        Assert.Equal(3, DocumentRevisions.Current(shuffled)!.No);
    }

    [Fact]
    public void Every_earlier_revision_is_superseded_and_none_is_removed()
    {
        Assert.True(DocumentRevisions.IsSuperseded(1, StDr002));
        Assert.False(DocumentRevisions.IsSuperseded(2, StDr002));

        // The list is untouched — «لا يوجد استبدال في المكان».
        Assert.Equal(2, StDr002.Length);
    }

    [Fact]
    public void A_document_with_no_revisions_has_no_current_one_rather_than_an_invented_R1()
    {
        Assert.Null(DocumentRevisions.Current([]));
    }

    [Fact]
    public void Under_review_counts_the_CURRENT_revision_and_not_the_drafts()
    {
        // Three documents:
        //   approved at R1, re-issued as a draft R2  → under review
        //   draft at R1, approved at R2              → NOT under review
        //   approved at R1                            → NOT under review
        // Counting draft REVISIONS would say two; counting current ones says one.
        var docs = new IReadOnlyList<DocumentRevisions.Revision>[]
        {
            [new(1, "approved"), new(2, "draft")],
            [new(1, "draft"), new(2, "approved")],
            [new(1, "approved")],
        };

        Assert.Equal(1, DocumentRevisions.UnderReview(docs));
    }

    [Fact]
    public void Fig46_the_plates_own_counts_come_out_of_its_own_rows()
    {
        // 14 documents · 21 revisions · معتمد 8 · مسوّدة 6 · مرفوض 0 ·
        // قيد المراجعة 6 — every one of them derived from the same list.
        var docs = new IReadOnlyList<DocumentRevisions.Revision>[]
        {
            [new(1, "approved")],                                   // AR-DR-001
            [new(1, "draft")],                                      // AR-DR-002
            [new(1, "approved")],                                   // AR-DR-003
            [new(1, "draft")],                                      // ST-DR-001
            [new(1, "approved"), new(2, "draft")],                  // ST-DR-002
            [new(1, "draft"), new(2, "approved")],                  // EL-DR-001
            [new(1, "approved")],                                   // EL-DR-002
            [new(1, "approved")],                                   // EL-DR-003
            [new(1, "draft"), new(2, "draft"), new(3, "draft")],    // ME-DR-001
            [new(1, "draft")],                                      // ME-DR-002
            [new(1, "draft"), new(2, "approved")],                  // CV-DR-001
            [new(1, "approved")],                                   // CV-DR-002
            [new(1, "draft"), new(2, "approved")],                  // RP-001
            [new(1, "approved"), new(2, "draft")],                  // RP-002
        };

        Assert.Equal(14, docs.Length);
        Assert.Equal(21, docs.Sum(d => d.Count));

        var current = docs.Select(d => DocumentRevisions.Current(d)!).ToList();
        Assert.Equal(8, current.Count(r => r.Status == "approved"));
        Assert.Equal(6, current.Count(r => r.Status == "draft"));
        Assert.Equal(0, current.Count(r => r.Status == "rejected"));
        Assert.Equal(6, DocumentRevisions.UnderReview(docs));
    }
}

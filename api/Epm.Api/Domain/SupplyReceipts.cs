namespace Epm.Api.Domain;

/// <summary>
/// المسار 11 · الأشكال 52–55 — الاستلام المخزني والاستلام الأولي.
///
/// rule: الكمية المستلمة لفقرة = مجموع استلاماتها المخزنية. ولا يجوز أن يتجاوز
///       أي استلام ما تبقّى من الكمية المتعاقدة.
/// spec: الشكل 53 «الكمية … مع نص إرشادي بالمتبقي», and its own stated purpose:
///       «تقلل احتمال تسجيل كميات تتجاوز المتبقي».
/// example: contracted 111, received 95 → remaining 16. A receipt of 16 is
///          accepted and closes the line; 17 is refused.
///
/// ── THE TWO RECEIPTS ARE NOT THE SAME EVENT ──────────────────────────────
/// الاستلام المخزني is the item ARRIVING at the ministry's store. الاستلام
/// الأولي is a beneficiary TAKING DELIVERY of some of what arrived. الشكل 54's
/// own reasoning: «تفصل النافذة بوضوح بين حركة الإدخال إلى المخزن وبين تسلّم
/// الجهة المستفيدة، فتُحمّل الجامعة المستلمة مسؤولية الكمية».
///
/// So they count against DIFFERENT ceilings, and this is the rule that matters:
///
///   warehouse    ≤ contracted − Σ warehouse            (what is still owed)
///   preliminary  ≤ warehouse-received − Σ preliminary   (what has arrived and
///                                                        not yet been handed over)
///
/// A beneficiary cannot take delivery of something that never reached the
/// store. الشكل 56 prints both columns side by side — المستلم 118 against
/// المجهّز 154 — precisely because they are different quantities.
///
/// ── نسبة الاستلام IS THE WAREHOUSE FIGURE ────────────────────────────────
/// الشكل 50's «الاستلام 95 / 111» is what has ARRIVED, not what has been handed
/// on: an item fully received into the store is «مستلم بالكامل» whether or not
/// the universities have collected it. `Domain/SupplyStatus` already reads it
/// that way and is unchanged.
/// </summary>
public static class SupplyReceipts
{
    // Built-in receipt checks, independently derived from stock and evidence.
    public const string AlertRuleCode = "SUP-11";
    public const string Warehouse = "warehouse";
    public const string Preliminary = "preliminary";

    /// <summary>
    /// المسار 11 step 7 — «الاستلام النهائي بعد استيفاء الشروط» (P-269). The
    /// beneficiary's final acceptance of what it took on preliminary receipt;
    /// it closes that part of the item's obligation. Ceiling, per beneficiary:
    ///
    ///   final → B  ≤  Σ preliminary to B − Σ final to B
    /// </summary>
    public const string Final = "final";
    public const string Readiness = "readiness";
    public const string Resubmission = "resubmission";

    public static bool IsKnownKind(string? k) => k is Warehouse or Preliminary or Final or Readiness or Resubmission;

    /// <summary>Σ finally accepted, all beneficiaries.</summary>
    public static decimal Finalised(IEnumerable<Receipt> receipts) =>
        receipts.Where(r => r.Kind == Final).Sum(r => r.Qty);

    /// <summary>Σ one beneficiary's final receipts.</summary>
    public static decimal FinalisedFor(IEnumerable<Receipt> receipts, string beneficiaryCode) =>
        receipts
            .Where(r => r.Kind == Final
                     && string.Equals(r.BeneficiaryCode, beneficiaryCode, StringComparison.OrdinalIgnoreCase))
            .Sum(r => r.Qty);

    /// <param name="Kind">warehouse · preliminary.</param>
    /// <param name="BeneficiaryCode">
    /// Required on a preliminary receipt and empty on a warehouse one: a store
    /// is not a beneficiary, and a hand-over with no receiving party is a
    /// quantity that has left the ministry's books to nobody.
    /// </param>
    public record Receipt(string Kind, decimal Qty, string? BeneficiaryCode,
        int Id = 0, string Conformity = "مطابق", int? RelatedReceiptId = null);

    public static bool IsConforming(string? value) => value is "مطابق" or "Conforming";

    // Reinspection is evidence about an existing hand-over, never a second movement.
    public static decimal EligibleFor(IEnumerable<Receipt> receipts, string beneficiaryCode)
    {
        var list = receipts.ToList();
        return list.Where(r => r.Kind == Preliminary && r.BeneficiaryCode == beneficiaryCode)
            .Where(r => IsConforming(list.Where(x => x.Kind == Resubmission && x.RelatedReceiptId == r.Id)
                .OrderByDescending(x => x.Id).FirstOrDefault()?.Conformity ?? r.Conformity))
            .Sum(r => r.Qty);
    }

    public static IReadOnlyList<string> Alerts(decimal contracted, IEnumerable<Receipt> receipts,
        bool missingDocuments, DateOnly dataDate, DateOnly? dueDate)
    {
        var list = receipts.ToList();
        var alerts = new List<string>();
        if (ReceivedInto(list) < contracted) alerts.Add("فقرة لم يكتمل استلامها");
        if (missingDocuments) alerts.Add("نقص في مستندات الاستلام");
        if (dueDate is { } due && dataDate > due && ReceivedInto(list) < contracted)
            alerts.Add("استلام متأخر");
        return alerts;
    }

    /// <summary>Σ what has arrived at the store — الشكل 50's «الاستلام».</summary>
    public static decimal ReceivedInto(IEnumerable<Receipt> receipts) =>
        receipts.Where(r => r.Kind == Warehouse).Sum(r => r.Qty);

    /// <summary>Σ what beneficiaries have taken delivery of.</summary>
    public static decimal HandedOver(IEnumerable<Receipt> receipts) =>
        receipts.Where(r => r.Kind == Preliminary).Sum(r => r.Qty);

    /// <summary>What one beneficiary has taken — الشكل 51's «المستلم» column.</summary>
    public static decimal HandedOverTo(IEnumerable<Receipt> receipts, string beneficiaryCode) =>
        receipts
            .Where(r => r.Kind == Preliminary
                     && string.Equals(r.BeneficiaryCode, beneficiaryCode, StringComparison.OrdinalIgnoreCase))
            .Sum(r => r.Qty);

    /// <summary>
    /// The ceiling الشكل 53 and الشكل 54 print as «المتبقي», for the kind of
    /// receipt actually being recorded. Never negative — an over-receipt
    /// already booked is not a licence to book a negative one.
    /// </summary>
    public static decimal Remaining(string kind, decimal contracted, IEnumerable<Receipt> receipts)
    {
        var list = receipts.ToList();

        return kind switch
        {
            Preliminary => Math.Max(0m, ReceivedInto(list) - HandedOver(list)),
            Final => list.Where(r => r.Kind == Preliminary).Select(r => r.BeneficiaryCode ?? "")
                .Distinct().Sum(b => Math.Max(0m, EligibleFor(list, b) - FinalisedFor(list, b))),
            _ => Math.Max(0m, contracted - ReceivedInto(list)),
        };
    }

    public record Refusal(string MessageAr, string MessageEn);

    /// <summary>
    /// May this receipt be booked? Null means yes.
    ///
    /// PREVENTION IS THE POINT (`05 §6` · الشكل 53's own «تقلل احتمال تسجيل
    /// كميات تتجاوز المتبقي»), and the wizard caps the field — but the rule
    /// lives here, because a cap in a form is a courtesy and this is a record.
    /// </summary>
    public static Refusal? Check(
        string kind, decimal qty, string? beneficiaryCode,
        decimal contracted, IEnumerable<Receipt> existing)
    {
        if (!IsKnownKind(kind))
            return new("نوع الاستلام غير معروف — مخزني أو أولي أو نهائي.",
                       "Unknown receipt kind — warehouse, preliminary or final.");

        if (qty <= 0m)
            return new("الكمية يجب أن تكون أكبر من صفر.",
                       "The quantity must be greater than zero.");

        if (kind == Preliminary && string.IsNullOrWhiteSpace(beneficiaryCode))
            return new("الجهة المستلمة مطلوبة في الاستلام الأولي.",
                       "The receiving beneficiary is required on a preliminary receipt.");

        if (kind == Final)
        {
            if (string.IsNullOrWhiteSpace(beneficiaryCode))
                return new("الجهة المستلمة مطلوبة في الاستلام النهائي.",
                           "The receiving beneficiary is required on a final receipt.");

            // A beneficiary can only finally accept what IT took on preliminary
            // receipt and has not already finally accepted.
            var list = existing.ToList();
            var open = Math.Max(0m, EligibleFor(list, beneficiaryCode) - FinalisedFor(list, beneficiaryCode));
            if (qty > open)
                return new($"الكمية تتجاوز ما استلمته الجهة أولياً ولم يُستلم نهائياً ({open:0.##}).",
                           $"The quantity exceeds what this beneficiary received preliminarily and has not finally accepted ({open:0.##}).");
            return null;
        }

        if (kind == Resubmission) return null; // linked original is checked at the endpoint

        var remaining = Remaining(kind, contracted, existing);
        if (qty > remaining)
            return kind == Preliminary
                ? new($"الكمية تتجاوز ما وصل المخزن ولم يُسلَّم بعد ({remaining:0.##}).",
                      $"The quantity exceeds what has arrived and not yet been handed over ({remaining:0.##}).")
                : new($"الكمية تتجاوز المتبقي من الكمية المتعاقدة ({remaining:0.##}).",
                      $"The quantity exceeds what is still owed against the contracted quantity ({remaining:0.##}).");

        return null;
    }

    /// <summary>
    /// الشكل 53 · الشكل 54 — «رقم الاستلام غير قابل للتحرير». WR-/PR- then the
    /// project's digits, the item's sequence and the receipt's own, exactly as
    /// the plates print them (WR-0439-2-2 · PR-0439-6).
    ///
    /// GENERATED, NEVER TYPED. A person who could type it could type one that
    /// already exists, and a receipt number is what a محضر is filed under.
    /// </summary>
    public static string Number(string kind, string projectId, int itemSeq, int receiptSeq)
    {
        var digits = new string(projectId.Where(char.IsDigit).ToArray());
        var prefix = kind switch { Preliminary => "PR", Final => "FR", Readiness => "RN", Resubmission => "RI", _ => "WR" };
        return $"{prefix}-{digits}-{itemSeq}-{receiptSeq}";
    }
}

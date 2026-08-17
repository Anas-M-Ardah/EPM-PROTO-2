namespace Epm.Api.Domain;

/// <summary>
/// حالة الفقرة التجهيزية — where one supply line stands between contracted,
/// supplied and received. Ported from the reference's `SUPPLY_STATUS`
/// (../epm/app/model.js:577) and its `recalc` (app/supply-items.jsx:59).
///
/// rule: received ≥ contracted → received · received > 0 → partial ·
///       supplied > 0 → supplied · otherwise pending.
/// spec: الشكل 50 «نسبة الاستلام لكل فقرة وحالتها بين الاستلام الجزئي والكامل».
/// example: contracted 100, supplied 80, received 80 → partial.
///          contracted 100, supplied 100, received 100 → received.
///          contracted 100, supplied 40, received 0 → supplied.
///
/// The order of the tests matters: a line that is fully received is `received`
/// even though `supplied > 0` is also true of it. Reading them in any other
/// order collapses the four states into two.
///
/// A contracted quantity of zero can never be `received` — the reference guards
/// this the same way (`x.contracted > 0 && ...`), because 0 ≥ 0 would otherwise
/// report an empty line as complete.
/// </summary>
public static class SupplyStatus
{
    public const string Received = "received";
    public const string Partial  = "partial";
    public const string Supplied = "supplied";
    public const string Pending  = "pending";

    public static string Of(decimal contracted, decimal supplied, decimal received)
    {
        if (contracted > 0m && received >= contracted) return Received;
        if (received > 0m) return Partial;
        if (supplied > 0m) return Supplied;
        return Pending;
    }

    /// <summary>
    /// نسبة الاستلام. DERIVED, never stored (01 §3). Zero contracted returns 0
    /// rather than dividing — an undefined ratio is not 100%.
    /// </summary>
    public static decimal ReceivedPct(decimal contracted, decimal received) =>
        contracted <= 0m ? 0m : received / contracted * 100m;

    /// <summary>What is still owed. Never negative — an over-receipt is not a debt.</summary>
    public static decimal Remaining(decimal contracted, decimal received) =>
        Math.Max(0m, contracted - received);
}

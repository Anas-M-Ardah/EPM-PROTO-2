namespace Epm.Api.Domain;

/// <summary>
/// المسار 8 steps 5–9 · ملحق الشكل 17 — the desks a certificate passes on its
/// way from registration to disbursement, and what releasing one means.
///
/// ── THE ROUTE IS THREE DESKS, AND THE CAPS ARE PER DESK ──────────────────
/// «تدقيق المهندس المقيم — سقف 7 أيام» → «تدقيق الدائرة المالية — سقف 7 أيام»
/// → «تسجيل الدفعة واعتمادها». The plate draws the first two as stages with a
/// 7-day cap each; the third is the disbursement act, given a desk of its own
/// because قسم الحسابات holds the file while it happens and الشكل 16 names it
/// as the party that recorded the payment.
///
/// Three sources disagreed on this shape and the disagreement was a real defect:
/// `Fixture.AuditStages` seeded 7/7/5, `EP-FIN-02` created four desks at D-03's
/// uniform five, and الشكل 17 draws two. A certificate registered through the
/// wizard therefore got a different route than every seeded one. <see cref="Shape"/>
/// is now the single source, and the fixture and the endpoint both read it.
///
/// D-03's `SlaDaysPerStage` is a DEFAULT, not this route's cap: P-97 recorded
/// that `PaymentAuditStage.CapDays` is per stage precisely because the plate
/// shows seven where D-03 assumes five.
///
/// ── ONE RELEASE, THREE MEANINGS ──────────────────────────────────────────
/// The desk that holds the file releases it. Whether that ADVANCES the route,
/// CERTIFIES the certificate or DISBURSES it is this file's answer, not the
/// caller's — which is what keeps `Payment.Status` from ever disagreeing with
/// the desks beneath it. The status stays a stored column because eight
/// endpoints read it, but it is only ever written from <see cref="Release"/>.
///
/// No clock (D-06). Every function takes the data date as an argument.
/// </summary>
public static class AuditRoute
{
    /// <param name="Key">→ `Lookup` group `audit-stage`.</param>
    /// <param name="CapDays">السقف — the desk's own cap, not a global SLA.</param>
    public record Desk(string Key, string PartyAr, string PartyEn, int CapDays);

    /// <summary>
    /// الشكل 17's route. Data, not a switch: the fixture seeds it, `EP-FIN-02`
    /// opens it, and an instruction that moves a cap changes one number here.
    /// </summary>
    public static readonly IReadOnlyList<Desk> Shape =
    [
        new("resident-engineer", "المهندس المقيم", "Resident engineer", 7),
        new("finance", "الدائرة المالية", "Finance department", 7),
        new("disbursement", "قسم الحسابات", "Accounts section", 5),
    ];

    /// <summary>
    /// The desk that CERTIFIES. المسار 8 step 5 — «تدقيق المهندس المقيم» — is
    /// the audit of the works themselves, and `Payment.CertifiedDate` is «when
    /// the works were certified». So releasing this desk is what moves a
    /// certificate from `pending` to `certified`, which is also what makes it
    /// «السلفة الجارية»: certified and not yet paid (P-99).
    /// </summary>
    public const string CertifyingKey = "resident-engineer";

    /// <summary>
    /// The desk that PAYS. Everything before it audits; releasing this one is
    /// المسار 8 step 9, «تحديث المصروف السنوي والتراكمي ونسبة الصرف», and the
    /// only moment money moves.
    /// </summary>
    public const string DisbursementKey = "disbursement";

    /// <summary>
    /// One desk's row as this file reads it. A record rather than the entity so
    /// a test can state a route in three lines and reach no table.
    /// </summary>
    public record Stage(int No, string Key, DateOnly? StartedAt, DateOnly? FinishedAt, int CapDays);

    public const string Done = "done";
    public const string Current = "current";
    public const string Overdue = "overdue";
    public const string Waiting = "waiting";

    /// <summary>
    /// BR-12 against the DATA DATE. A finished desk is measured to its own
    /// finish; the one holding the file is measured to today-as-the-project-
    /// knows-it. A desk that has not received the file has no elapsed time at
    /// all — a zero there would report a wait that has not begun.
    /// </summary>
    public record State(int No, string Key, string Status, int? ElapsedDays);

    public static IReadOnlyList<State> States(IEnumerable<Stage> stages, DateOnly asOf) =>
        stages.OrderBy(s => s.No).Select(s => new State(
            s.No,
            s.Key,
            s.FinishedAt is not null ? Done
                : s.StartedAt is null ? Waiting
                : SlaLeadTime.For(asOf, s.StartedAt.Value, s.CapDays).Overdue ? Overdue
                : Current,
            s.StartedAt is null ? null : (s.FinishedAt ?? asOf).DayNumber - s.StartedAt.Value.DayNumber))
        .ToList();

    /// <summary>The desk that holds the file, or null when the route is finished.</summary>
    public static State? CurrentDesk(IEnumerable<Stage> stages, DateOnly asOf)
        => States(stages, asOf).FirstOrDefault(x => x.Status is Current or Overdue);

    /// <summary>
    /// المسار 8 step 6 — «هل تجاوزت المرحلة سقفها الزمني؟ → تصعيد تلقائي إلى
    /// المستوى الإداري الأعلى». Derived, never stored and never an action: a
    /// desk past its cap IS the escalation, and recording it separately would
    /// let the two disagree.
    /// </summary>
    public static bool Escalated(IEnumerable<Stage> stages, DateOnly asOf)
        => States(stages, asOf).Any(x => x.Status == Overdue);

    /// <summary>«ضمن المهلة» unless a desk has passed its own cap.</summary>
    public static string Overall(IEnumerable<Stage> stages, DateOnly asOf)
        => Escalated(stages, asOf) ? "overdue" : "within";

    /// <summary>
    /// What releasing desk <paramref name="no"/> does to the route and to the
    /// certificate above it.
    /// </summary>
    /// <param name="Released">The desk that finished, dated <c>at</c>.</param>
    /// <param name="Opened">The desk that now holds the file, or null at the end of the route.</param>
    /// <param name="Status">The certificate's resulting status — pending · certified · paid.</param>
    /// <param name="Certified">True on the release that CERTIFIES — the resident engineer's desk.</param>
    /// <param name="Disbursed">True on the release that pays — the disbursement desk.</param>
    public record Transition(int Released, int? Opened, string Status, bool Certified, bool Disbursed);

    /// <summary>
    /// Refuses anything that is not the desk holding the file: a desk already
    /// released, one that has not received it, and any number not on the route.
    /// The endpoint gates on the CAPACITY; this gates on the ROUTE, and both
    /// have to pass.
    /// </summary>
    /// <param name="wasCertified">
    /// Whether the certificate is already certified. The desks between the
    /// first and the last change no status, and a transition that reported
    /// `pending` for one of them would un-certify a certificate by advancing it.
    /// </param>
    public static Transition? Release(IEnumerable<Stage> stages, int no, DateOnly asOf, bool wasCertified = false)
    {
        var ordered = stages.OrderBy(s => s.No).ToList();
        var current = CurrentDesk(ordered, asOf);
        if (current is null || current.No != no) return null;

        var released = ordered.First(s => s.No == no);
        var next = ordered.FirstOrDefault(s => s.No > no);

        var certified = released.Key == CertifyingKey;
        var disbursed = released.Key == DisbursementKey;

        var status =
            disbursed ? PaymentCertificate.Paid :
            certified || wasCertified ? PaymentCertificate.Certified :
            PaymentCertificate.Pending;

        return new Transition(no, next?.No, status, certified, disbursed);
    }
}

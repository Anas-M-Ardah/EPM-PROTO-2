using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>
/// المسار 8 steps 5–9 · ملحق الشكل 17 — the audit route and what releasing a
/// desk does to the certificate above it.
/// </summary>
public class AuditRouteTests
{
    private static readonly DateOnly DataDate = new(2026, 8, 2);   // 06 §12 · D-06

    /// <summary>
    /// `CNT-0279`'s third certificate, exactly as `Fixture.AuditStages` seeds
    /// it: desk 1 done, desk 2 holding the file since 2026-07-14, desk 3 not
    /// started. Stated inline so a wrong fixture cannot make the test lie.
    /// </summary>
    private static List<AuditRoute.Stage> InFlight() =>
    [
        new(1, "resident-engineer", new DateOnly(2026, 7, 9), new DateOnly(2026, 7, 14), 7),
        new(2, "finance", new DateOnly(2026, 7, 14), null, 7),
        new(3, "disbursement", null, null, 5),
    ];

    /// <summary>A route as `EP-FIN-02` opens it — first desk only.</summary>
    private static List<AuditRoute.Stage> JustRegistered(DateOnly at) =>
        AuditRoute.Shape.Select((d, i) => new AuditRoute.Stage(
            i + 1, d.Key, i == 0 ? at : null, null, d.CapDays)).ToList();

    // ── the shape ───────────────────────────────────────────────────────────

    [Fact]
    public void The_route_is_three_desks_at_seven_seven_five()
    {
        // «تدقيق المهندس المقيم — سقف 7 أيام» → «تدقيق الدائرة المالية — سقف 7
        // أيام» → الصرف. D-03's uniform five is a DEFAULT the plate overrides,
        // which is exactly what P-97 recorded CapDays per stage for.
        Assert.Equal(3, AuditRoute.Shape.Count);
        Assert.Equal(["resident-engineer", "finance", "disbursement"],
            AuditRoute.Shape.Select(d => d.Key));
        Assert.Equal([7, 7, 5], AuditRoute.Shape.Select(d => d.CapDays));
    }

    // ── the state machine ───────────────────────────────────────────────────

    [Fact]
    public void A_finished_desk_is_measured_to_its_own_finish()
    {
        var s = AuditRoute.States(InFlight(), DataDate);

        Assert.Equal(AuditRoute.Done, s[0].Status);
        Assert.Equal(5, s[0].ElapsedDays);          // 7-09 → 7-14, inside its cap
    }

    [Fact]
    public void The_desk_holding_the_file_is_measured_to_the_data_date()
    {
        // 2026-07-14 → 2026-08-02 is 19 days against a 7-day cap. This is the
        // case الشكل 17 exists to surface: «موضع تعثّر المعاملة ومدة بقائها».
        var s = AuditRoute.States(InFlight(), DataDate);

        Assert.Equal(AuditRoute.Overdue, s[1].Status);
        Assert.Equal(19, s[1].ElapsedDays);
    }

    [Fact]
    public void A_desk_that_has_not_received_the_file_has_no_elapsed_time()
    {
        // Not zero. A zero there reports a wait that has not begun.
        var s = AuditRoute.States(InFlight(), DataDate);

        Assert.Equal(AuditRoute.Waiting, s[2].Status);
        Assert.Null(s[2].ElapsedDays);
    }

    [Fact]
    public void Inside_its_cap_the_holding_desk_is_current_not_overdue()
    {
        var s = AuditRoute.States(InFlight(), new DateOnly(2026, 7, 20));

        Assert.Equal(AuditRoute.Current, s[1].Status);
        Assert.Equal(6, s[1].ElapsedDays);
    }

    [Fact]
    public void Exactly_the_cap_is_not_yet_overdue()
        => Assert.Equal(AuditRoute.Current,
            AuditRoute.States(InFlight(), new DateOnly(2026, 7, 21))[1].Status);

    [Fact]
    public void One_day_past_the_cap_is()
        => Assert.Equal(AuditRoute.Overdue,
            AuditRoute.States(InFlight(), new DateOnly(2026, 7, 22))[1].Status);

    [Fact]
    public void Escalation_is_derived_from_an_overdue_desk_never_recorded()
    {
        // مسار 8 step 6 — «تصعيد تلقائي إلى المستوى الإداري الأعلى».
        Assert.True(AuditRoute.Escalated(InFlight(), DataDate));
        Assert.Equal("overdue", AuditRoute.Overall(InFlight(), DataDate));

        Assert.False(AuditRoute.Escalated(InFlight(), new DateOnly(2026, 7, 20)));
        Assert.Equal("within", AuditRoute.Overall(InFlight(), new DateOnly(2026, 7, 20)));
    }

    [Fact]
    public void The_current_desk_is_the_one_holding_the_file()
        => Assert.Equal(2, AuditRoute.CurrentDesk(InFlight(), DataDate)!.No);

    // ── releasing ───────────────────────────────────────────────────────────

    [Fact]
    public void Releasing_the_resident_engineers_desk_certifies_the_works()
    {
        // المسار 8 step 5. `Payment.CertifiedDate` is «when the works were
        // certified», and this is the desk that audits them — which is also
        // what makes the certificate «السلفة الجارية»: certified, not yet paid.
        var route = JustRegistered(new DateOnly(2026, 7, 20));
        var t = AuditRoute.Release(route, 1, DataDate);

        Assert.NotNull(t);
        Assert.Equal(2, t.Opened);
        Assert.Equal(PaymentCertificate.Certified, t.Status);
        Assert.True(t.Certified);
        Assert.False(t.Disbursed);
    }

    [Fact]
    public void Releasing_the_finance_desk_moves_no_status()
    {
        // المسار 8 step 8 — «تسجيل الدفعة واعتمادها». It authorises the
        // release; no money has moved, so المصروف does not change here.
        var t = AuditRoute.Release(InFlight(), 2, DataDate, wasCertified: true);

        Assert.Equal(PaymentCertificate.Certified, t!.Status);
        Assert.False(t.Certified);
        Assert.False(t.Disbursed);
        Assert.Equal(3, t.Opened);
    }

    [Fact]
    public void Advancing_a_certified_certificate_never_un_certifies_it()
    {
        // The desks between the first and the last change no status of their
        // own; forgetting that the certificate is already certified would move
        // it backwards by moving it forwards.
        Assert.Equal(PaymentCertificate.Pending,
            AuditRoute.Release(InFlight(), 2, DataDate, wasCertified: false)!.Status);
        Assert.Equal(PaymentCertificate.Certified,
            AuditRoute.Release(InFlight(), 2, DataDate, wasCertified: true)!.Status);
    }

    [Fact]
    public void Releasing_the_disbursement_desk_pays()
    {
        List<AuditRoute.Stage> certified =
        [
            new(1, "resident-engineer", new DateOnly(2026, 7, 9), new DateOnly(2026, 7, 14), 7),
            new(2, "finance", new DateOnly(2026, 7, 14), new DateOnly(2026, 7, 30), 7),
            new(3, "disbursement", new DateOnly(2026, 7, 30), null, 5),
        ];

        var t = AuditRoute.Release(certified, 3, DataDate, wasCertified: true);

        Assert.Equal(PaymentCertificate.Paid, t!.Status);
        Assert.True(t.Disbursed);
        Assert.False(t.Certified);
        Assert.Null(t.Opened);
    }

    [Fact]
    public void A_desk_that_does_not_hold_the_file_cannot_release_it()
    {
        // Desk 1 has already let go and desk 3 has not received it. The
        // endpoint gates on the CAPACITY; this gates on the ROUTE, and both
        // have to pass.
        Assert.Null(AuditRoute.Release(InFlight(), 1, DataDate));
        Assert.Null(AuditRoute.Release(InFlight(), 3, DataDate));
        Assert.Null(AuditRoute.Release(InFlight(), 9, DataDate));
    }

    [Fact]
    public void A_finished_route_releases_nothing()
    {
        List<AuditRoute.Stage> paid =
        [
            new(1, "resident-engineer", new DateOnly(2026, 7, 9), new DateOnly(2026, 7, 14), 7),
            new(2, "finance", new DateOnly(2026, 7, 14), new DateOnly(2026, 7, 30), 7),
            new(3, "disbursement", new DateOnly(2026, 7, 30), new DateOnly(2026, 8, 1), 5),
        ];

        Assert.Null(AuditRoute.CurrentDesk(paid, DataDate));
        Assert.Null(AuditRoute.Release(paid, 3, DataDate));
    }

    [Fact]
    public void An_overdue_desk_can_still_release()
    {
        // Escalation raises the transaction; it does not freeze it. The file at
        // desk 2 is 19 days old and letting it go is exactly what is wanted.
        Assert.NotNull(AuditRoute.Release(InFlight(), 2, DataDate));
    }
}

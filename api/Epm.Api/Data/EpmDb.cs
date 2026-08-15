using Epm.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Data;

/// <summary>
/// THE ONE DbContext. An endpoint injects EpmDb and queries it directly —
/// no repository, no unit-of-work, no second context.
///
/// ── THIS LIST IS APPEND-ONLY ──────────────────────────────────────────────
/// A table appears here only when a real page reads it. Data/Entities/ holds
/// documented starting points for tables we have not built a page for yet;
/// they are deliberately NOT registered, so the database never contains a
/// table nobody uses. When you build a page: add its DbSet below, adjust the
/// entity's columns to what the page actually shows, then POST /api/dev/reset.
///
/// ── NO RELATIONSHIPS ──────────────────────────────────────────────────────
/// No navigation properties, no foreign keys, no cascade rules, no indexes.
/// Tables are joined by plain ID columns in the endpoint:
///     db.Contracts.Where(c => c.ProjectId == id)
/// That query IS the relationship, and you can read it. Invariants that matter
/// (contract scoping, no duplicate distribution pair) are checked in the
/// endpoint where they are visible — not hidden in schema configuration.
///
/// ── NO MIGRATIONS ─────────────────────────────────────────────────────────
/// EnsureCreated() on boot creates the database if it is absent and does
/// nothing if it exists. To change the schema: edit the entity, then
/// POST /api/dev/reset (drops and recreates, empty). See DECISIONS.md.
///
/// MONEY IS decimal(18,2); quantities and percentages decimal(18,4).
/// Never float — the 20%-rule splits and largest-remainder rounding must be
/// exact (D-11).
/// </summary>
public class EpmDb(DbContextOptions<EpmDb> options) : DbContext(options)
{
    // ── PAGE-01 Projects list ────────────────────────────────────────────
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Contract> Contracts => Set<Contract>();
    public DbSet<Workspace> Workspaces => Set<Workspace>();

    // ── المسار 1 — تعريف المشروع وربطه بالجامعة ──────────────────────────
    // سجل النشاط: who created the definition and who has edited it since
    // (الشكل 5's second tab). Not a workflow — there is none.
    public DbSet<ProjectActivityEvent> ProjectActivityEvents => Set<ProjectActivityEvent>();

    // ── المسار 2 — إنشاء العقود وربطها بالمشروع ──────────────────────────
    // سجل النشاط, الشكل 7's fifth contract tab.
    public DbSet<ContractActivityEvent> ContractActivityEvents => Set<ContractActivityEvent>();

    // ── المسار 3 · الشكل 13 — استيراد جدول الكميات ───────────────────────
    // A SUBMITTED version, never the live bill. «يُقدَّم للاعتماد ولا يُستبدل
    // الجدول السابق — يُحفَظ كإصدار»: no screen that reads the register reads
    // these two tables, which is what keeps an unapproved import out of every
    // weight, link and earned-value figure derived from BoqItems.
    public DbSet<BoqImportVersion> BoqImportVersions => Set<BoqImportVersion>();
    public DbSet<BoqImportVersionItem> BoqImportVersionItems => Set<BoqImportVersionItem>();

    // ── الشكل 17 — مهل التدقيق ────────────────────────────────────────────
    // One row per DESK a certificate sits at. The route is data, not columns:
    // a ministry that adds a stage adds rows (P-97).
    public DbSet<PaymentAuditStage> PaymentAuditStages => Set<PaymentAuditStage>();

    // ── الشكل 15 — التخصيص السنوي ─────────────────────────────────────────
    // What the ministry released for a fiscal year. NOT the approved cost and
    // NOT the contracted commitment — the third figure, and the one that can
    // stop a payment in October (P-92).
    public DbSet<ProjectAllocation> ProjectAllocations => Set<ProjectAllocation>();

    // ── SCR-W9 سجل المخاطر (ملحق الشكل 43) ───────────────────────────────
    // Severity is NOT here: the screen prints «الخطورة = الاحتمالية × التأثير»
    // beside its own title, so it is derived by Domain/RiskSeverity (01 §3).
    public DbSet<Risk> Risks => Set<Risk>();

    // ── PHASE 1.1 Lookups — every enum label in the app (06 §1–§11) ──────
    public DbSet<Lookup> Lookups => Set<Lookup>();

    // ── PAGE-02 Contracts list (SCR-E3) ──────────────────────────────────
    // Amendments are what make a contract's EFFECTIVE value derivable (BR-09).
    // Only rows with AppliedAt != null move the effective figures; approved-
    // but-unapplied rows are a projection and are never folded in (02 §9).
    public DbSet<ContractAmendment> ContractAmendments => Set<ContractAmendment>();

    // ── PAGE-05 Alerts Center (SCR-E6) ───────────────────────────────────
    // The one table in the system a screen WRITES to so far: acknowledging an
    // alert is a real state change (EP-ALR-02), not a client-side toggle.
    public DbSet<Alert> Alerts => Set<Alert>();

    // ── PHASE 3 Project workspace — SCR-W1 Overview ──────────────────────
    // Projects.BeneficiaryCodes is a CSV of these codes (01 §2.1). The overview
    // resolves it to names; nothing else reads the table yet, so its columns
    // are pruned to what that list shows plus the tree link that gives a
    // faculty its university.
    public DbSet<Beneficiary> Beneficiaries => Set<Beneficiary>();

    // ── PHASE 4.1 Contract tab — SCR-W3 ──────────────────────────────────
    // What has actually been paid against a contract. Nothing in the system
    // could answer that until now, which is why SCR-E1's financial tiles and
    // four rows of the SCR-E7 catalog were unavailable.
    public DbSet<Payment> Payments => Set<Payment>();

    /// <summary>الشكل 9's «المرفقات» — the letter and the measurement sheet behind one payment.</summary>
    public DbSet<PaymentAttachment> PaymentAttachments => Set<PaymentAttachment>();

    // ── PHASE 4.2 BOQ tab — SCR-W4 ───────────────────────────────────────
    // The densest screen in the system, and the first one where five tables
    // have to agree. BoqItems carries the contracted line; BoqRateBands is the
    // 20%-rule's answer to "a line legitimately has more than one rate" and
    // stays empty until Phase 5 applies one; BoqDistributions splits a quantity
    // across beneficiaries (never a column on the line — 01 §1); and
    // BoqActivityLinks is the many-to-many that lets BR-03 turn an activity's
    // weight into a share and BR-04 turn its progress into a BOQ progress.
    //
    // Activities lands here rather than in Phase 4.3 for exactly that reason:
    // the allocation share and the executed % are both READ OFF the activity,
    // so the BOQ tab cannot be built without it. 4.3 restores the schedule
    // columns this phase pruned.
    public DbSet<BoqItem> BoqItems => Set<BoqItem>();
    public DbSet<BoqRateBand> BoqRateBands => Set<BoqRateBand>();
    public DbSet<BoqDistribution> BoqDistributions => Set<BoqDistribution>();
    public DbSet<BoqActivityLink> BoqActivityLinks => Set<BoqActivityLink>();
    public DbSet<Activity> Activities => Set<Activity>();

    // ── SCR-W8 the change-order register (Phase 5.1) ─────────────────────
    // ChangeOrderStage and ChangeOrderAttachment are registered HERE, not in
    // 5.4, for the reason 4.2 registered Activity ahead of 4.3: `03 §10` puts
    // "current stage · current owner" and the attachment count in the
    // register's own row spec, and BR-14 resolves the viewer relation off the
    // stage chain. The register cannot be built without either. 5.4 adds the
    // columns and the two tables this phase does not need.
    public DbSet<ChangeOrder> ChangeOrders => Set<ChangeOrder>();
    public DbSet<ChangeOrderLine> ChangeOrderLines => Set<ChangeOrderLine>();
    public DbSet<ChangeOrderActivity> ChangeOrderActivities => Set<ChangeOrderActivity>();
    public DbSet<ChangeOrderStage> ChangeOrderStages => Set<ChangeOrderStage>();
    public DbSet<ChangeOrderAttachment> ChangeOrderAttachments => Set<ChangeOrderAttachment>();

    // ── SCR-W8 the change-order RECORD (Phase 5.2 · ملحق الأشكال 30–34) ───
    // The three tables 5.4 was to own, registered here for the reason 5.1
    // registered the stages: the plates read them.
    //   ApplySteps      — الشكل 30's «حالة تطبيق الأمر التغييري», nine rows.
    //   ExternalParties — الشكل 33's «أطراف خارجية 1/1» inside stage 4 and 5.
    //                     They are STATUSES IN A STAGE, never stages (03 §3),
    //                     which is exactly why they are their own table hanging
    //                     off ChangeOrderStageId rather than more stage rows.
    //   AuditEntries    — tab 6 السجل: one row per CHANGED FIELD, previous
    //                     value → new value.
    // 5.4 writes them; 5.2 reads what the fixture puts there.
    public DbSet<ChangeOrderApplyStep> ChangeOrderApplySteps => Set<ChangeOrderApplyStep>();
    public DbSet<ChangeOrderExternalParty> ChangeOrderExternalParties => Set<ChangeOrderExternalParty>();
    public DbSet<ChangeOrderAuditEntry> ChangeOrderAuditEntries => Set<ChangeOrderAuditEntry>();

    // ── next pages append their DbSets here ──────────────────────────────

    protected override void OnModelCreating(ModelBuilder b)
    {
        // Natural string keys — readable in SQL and in URLs.
        b.Entity<Project>().HasKey(x => x.Id);
        b.Entity<Contract>().HasKey(x => x.Id);
        b.Entity<Workspace>().HasKey(x => x.Code);

        // Lookup is the one table with a surrogate key: (Kind, Code) is the
        // real identity but it is compared in the endpoint, not enforced here
        // (P-01 — invariants live where they can be read).
        b.Entity<Lookup>().HasKey(x => x.Id);
        b.Entity<ContractAmendment>().HasKey(x => x.Id);

        // Alert has no natural key — an alert is an event, not a named thing.
        b.Entity<Alert>().HasKey(x => x.Id);

        // Same reason: an activity event is something that HAPPENED, so it has
        // no natural name. Ordered by Id, which is the order it occurred in.
        b.Entity<ProjectActivityEvent>().HasKey(x => x.Id);
        b.Entity<ContractActivityEvent>().HasKey(x => x.Id);

        // The code IS the identity — it is what Projects.BeneficiaryCodes stores.
        b.Entity<Beneficiary>().HasKey(x => x.Code);

        // (ContractId, No) is the real identity and is checked in the endpoint,
        // not here (P-01 — invariants live where they can be read).
        b.Entity<Payment>().HasKey(x => x.Id);
        b.Entity<PaymentAttachment>().HasKey(x => x.Id);

        // The five BOQ tables all carry surrogate keys. Their real identities —
        // (ContractId, Code) on an item, (BoqItemId, BeneficiaryCode) on a
        // distribution row, (BoqItemId, ActivityId) on a link, (ContractId,
        // ActivityId) on an activity — are compared in BoqEndpoints, where the
        // rule can be read next to the message it produces (P-01).
        b.Entity<BoqItem>().HasKey(x => x.Id);
        b.Entity<BoqRateBand>().HasKey(x => x.Id);
        b.Entity<BoqDistribution>().HasKey(x => x.Id);
        b.Entity<BoqActivityLink>().HasKey(x => x.Id);
        b.Entity<Activity>().HasKey(x => x.Id);

        // Money vs quantity/percentage precision. Applied to every registered
        // entity automatically so no page has to remember it.
        foreach (var prop in b.Model.GetEntityTypes()
                     .SelectMany(t => t.GetProperties())
                     .Where(p => p.ClrType == typeof(decimal) || p.ClrType == typeof(decimal?)))
        {
            var n = prop.Name;
            var needsScale = n.Contains("Qty", StringComparison.Ordinal)
                             || n.Contains("Pct", StringComparison.Ordinal)
                             || n.Contains("Share", StringComparison.Ordinal)
                             || n.Contains("Float", StringComparison.Ordinal);
            prop.SetColumnType(needsScale ? "decimal(18,4)" : "decimal(18,2)");
        }
    }
}

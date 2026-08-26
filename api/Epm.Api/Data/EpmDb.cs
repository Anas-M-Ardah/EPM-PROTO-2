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

    // ── الشكل 24 · المسار 4 — استيراد الجدول الزمني ───────────────────────
    // The same shape, and for a stronger reason: `Activities.Baseline*` is what
    // every slip, float and planned percentage in the system measures from, so
    // an import writes a VERSION here and touches `Activities` not at all until
    // it is approved.
    public DbSet<ScheduleImportVersion> ScheduleImportVersions => Set<ScheduleImportVersion>();
    public DbSet<ScheduleImportVersionItem> ScheduleImportVersionItems => Set<ScheduleImportVersionItem>();

    // ── الشكل 17 — مهل التدقيق ────────────────────────────────────────────
    // One row per DESK a certificate sits at. The route is data, not columns:
    // a ministry that adds a stage adds rows (P-97).
    public DbSet<PaymentAuditStage> PaymentAuditStages => Set<PaymentAuditStage>();

    // ── الشكل 15 — التخصيص السنوي ─────────────────────────────────────────
    // What the ministry released for a fiscal year. NOT the approved cost and
    // NOT the contracted commitment — the third figure, and the one that can
    // stop a payment in October (P-92).
    public DbSet<ProjectAllocation> ProjectAllocations => Set<ProjectAllocation>();

    // ── الشكل 19 — سجل التغييرات المالية ──────────────────────────────────
    // The «قبل ← بعد» pair. The other three event kinds on that timeline are
    // derived from records that already exist; a cost or allocation edit had
    // nowhere to leave its previous value, so it has a table (P-179).
    public DbSet<FinancialEdit> FinancialEdits => Set<FinancialEdit>();

    // ── SCR-W9 سجل المخاطر (ملحق الشكل 43) ───────────────────────────────
    // Severity is NOT here: the screen prints «الخطورة = الاحتمالية × التأثير»
    // beside its own title, so it is derived by Domain/RiskSeverity (01 §3).
    public DbSet<Risk> Risks => Set<Risk>();

    // ── SCR-W11 محاضر الاجتماعات وسجل الإجراءات (ملحق الشكل 45) ──────────
    // «متأخر» is NOT a column: it is a due date measured against the project's
    // data date at projection time (D-06).
    public DbSet<Meeting> Meetings => Set<Meeting>();
    public DbSet<MeetingAction> MeetingActions => Set<MeetingAction>();

    // ── SCR-W12 الوثائق والمخططات (ملحق الشكل 46) ────────────────────────
    // TWO tables, because «المراجعات لا تُحذف»: the document is the identity
    // and the revision is the file, so a new issue is an INSERT and the
    // superseded one keeps its date, its transmittal and its file.
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<DocumentRevision> DocumentRevisions => Set<DocumentRevision>();

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

    // ── SCR-W13 project alerts · الشكل 47 ────────────────────────────────
    // The rule the alert came from. Disabling it withdraws the alert.
    public DbSet<AlertRule> AlertRules => Set<AlertRule>();

    // ── SCR-W10 3D model · الشكل 44 ──────────────────────────────────────
    // The tab is kept and the VIEWER is stubbed (07 §8). These two tables back
    // the tree, the element panel and the version selector — the parts that
    // carry data. No geometry is stored.
    public DbSet<ModelElement> ModelElements => Set<ModelElement>();
    public DbSet<ModelVersion> ModelVersions => Set<ModelVersion>();

    // ── PHASE 3 Project workspace — SCR-W1 Overview ──────────────────────
    // There is NO separate beneficiaries table (P-174). A beneficiary IS a
    // workspace: `Projects.BeneficiaryCodes` is a CSV of `Workspaces.Code`, and
    // every screen that resolves a beneficiary code to a name reads the
    // `Workspaces` set declared above.

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

    // The SUPPLY sub-type of a bill line (D-14). Registered beside the base it
    // extends, not instead of it: a supply bill IS a BoqItems bill, with one
    // extra row per line carrying the device facts a works line has no use for.
    public DbSet<SupplyItemDetail> SupplyItemDetails => Set<SupplyItemDetail>();

    // ── المسار 11 · الأشكال 52–55 — الاستلامات ────────────────────────────
    // One row per MOVEMENT, of two kinds that do not net against each other.
    // `SupplyItemDetail.ReceivedQty` used to be a stored column; it is Σ these
    // rows now, derived at projection time (01 §3).
    public DbSet<SupplyReceipt> SupplyReceipts => Set<SupplyReceipt>();
    public DbSet<SupplyReceiptAttachment> SupplyReceiptAttachments => Set<SupplyReceiptAttachment>();

    // «العروض» — the register's saved views (الشكل 12). The one table here that
    // holds no ministry data: it is a person's own toolbar state, owned by the
    // X-Epm-User persona and scoped to nothing else. Persisted rather than left
    // in localStorage where the reference keeps it — see BoqSavedView.
    public DbSet<BoqSavedView> BoqSavedViews => Set<BoqSavedView>();

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
    // الشكل 58 — many transfers per line, which is why it is a table and not
    // three columns on ChangeOrderLine. See the entity's own header.
    public DbSet<ChangeOrderRedistribution> ChangeOrderRedistributions => Set<ChangeOrderRedistribution>();
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

        // (ContractId, No) is the real identity and is checked in the endpoint,
        // not here (P-01 — invariants live where they can be read).
        b.Entity<Payment>().HasKey(x => x.Id);
        b.Entity<PaymentAttachment>().HasKey(x => x.Id);

        // Append-only, and one row per changed field — so there is no natural
        // identity beyond the order the edits happened in.
        b.Entity<FinancialEdit>().HasKey(x => x.Id);

        // The five BOQ tables all carry surrogate keys. Their real identities —
        // (ContractId, Code) on an item, (BoqItemId, BeneficiaryCode) on a
        // distribution row, (BoqItemId, ActivityId) on a link, (ContractId,
        // ActivityId) on an activity — are compared in BoqEndpoints, where the
        // rule can be read next to the message it produces (P-01).
        b.Entity<BoqItem>().HasKey(x => x.Id);
        b.Entity<BoqRateBand>().HasKey(x => x.Id);
        b.Entity<BoqDistribution>().HasKey(x => x.Id);
        b.Entity<BoqActivityLink>().HasKey(x => x.Id);
        // Its real identity is BoqItemId — one detail row per line. Compared in
        // BoqEndpoints where the rule sits next to its message, like the rest.
        b.Entity<SupplyItemDetail>().HasKey(x => x.Id);
        b.Entity<SupplyReceipt>().HasKey(x => x.Id);
        b.Entity<SupplyReceiptAttachment>().HasKey(x => x.Id);
        b.Entity<ChangeOrderRedistribution>().HasKey(x => x.Id);
        b.Entity<Activity>().HasKey(x => x.Id);
        b.Entity<ScheduleImportVersion>().HasKey(x => x.Id);
        b.Entity<ScheduleImportVersionItem>().HasKey(x => x.Id);

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

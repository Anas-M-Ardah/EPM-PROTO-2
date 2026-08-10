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

using Epm.Api.Data;
using Epm.Api.Data.Entities;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace Epm.Domain.Tests;

public class ChangeOrderAuditPersistenceTests
{
    [Fact]
    public void Audit_rows_are_append_only()
    {
        using var connection = new SqliteConnection("Data Source=:memory:");
        connection.Open();
        var options = new DbContextOptionsBuilder<EpmDb>().UseSqlite(connection).Options;
        using var db = new EpmDb(options);
        db.Database.EnsureCreated();

        var row = new ChangeOrderAuditEntry { ChangeOrderId = 42, UserId = "system", Action = "create" };
        db.ChangeOrderAuditEntries.Add(row);
        db.SaveChanges();

        row.Action = "rewritten";
        Assert.Throws<InvalidOperationException>(() => db.SaveChanges());

        db.Entry(row).State = EntityState.Unchanged;
        db.ChangeOrderAuditEntries.Remove(row);
        Assert.Throws<InvalidOperationException>(() => db.SaveChanges());
    }

    [Fact]
    public void Audit_versions_continue_after_same_save_and_legacy_rows()
    {
        using var connection = new SqliteConnection("Data Source=:memory:");
        connection.Open();
        var options = new DbContextOptionsBuilder<EpmDb>().UseSqlite(connection).Options;

        using (var db = new EpmDb(options))
        {
            db.Database.EnsureCreated();
            db.ChangeOrderAuditEntries.AddRange(
                new ChangeOrderAuditEntry
                {
                    ChangeOrderId = 42, UserId = "user.re-dept", ActorRole = "دائرة المهندس المقيم",
                    Action = "edit", Field = "Justification", AfterSnapshot = "{\"value\":\"one\"}",
                },
                new ChangeOrderAuditEntry
                {
                    ChangeOrderId = 42, UserId = "user.re-dept", ActorRole = "دائرة المهندس المقيم",
                    Action = "edit", Field = "IncomingNo", AfterSnapshot = "{\"value\":\"two\"}",
                });
            db.SaveChanges();

            var saved = db.ChangeOrderAuditEntries.OrderBy(a => a.Version).ToList();
            Assert.Equal([1, 2], saved.Select(a => a.Version));
            Assert.All(saved, a => Assert.Equal("دائرة المهندس المقيم", a.ActorRole));
            Assert.Contains("one", saved[0].AfterSnapshot);

            // Simulate a database created before the centralized version rule.
            db.Database.ExecuteSqlRaw("UPDATE ChangeOrderAuditEntries SET Version = 7 WHERE ChangeOrderId = 42 AND Version = 2");
        }

        using (var db = new EpmDb(options))
        {
            db.ChangeOrderAuditEntries.Add(new ChangeOrderAuditEntry
            {
                ChangeOrderId = 42, UserId = "system", ActorRole = "system", Action = "apply",
                BeforeSnapshot = "{\"value\":\"before\"}",
                AfterSnapshot = "{\"value\":\"after\"}",
            });
            db.SaveChanges();

            var latest = db.ChangeOrderAuditEntries.OrderByDescending(a => a.Version).First();
            Assert.Equal(8, latest.Version);
            Assert.Equal("system", latest.ActorRole);
            Assert.Contains("before", latest.BeforeSnapshot);
            Assert.Contains("after", latest.AfterSnapshot);
        }
    }
}

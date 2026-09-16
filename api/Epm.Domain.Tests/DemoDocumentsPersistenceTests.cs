using Epm.Api.Data;
using Epm.Api.Data.Entities;
using Epm.Api.Features.Dev;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace Epm.Domain.Tests;

// Persistence checks of development tooling, not database-backed domain rules.
public class DemoDocumentsPersistenceTests
{
    [Fact]
    public async Task Preparation_is_scoped_and_rerunning_preserves_decisions_and_history()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        await using var db = new EpmDb(new DbContextOptionsBuilder<EpmDb>().UseSqlite(connection).Options);
        await db.Database.EnsureCreatedAsync();
        db.Projects.AddRange(new Project { Id = "NEW", WorkspaceCode = "ub", PlannedCost = 1000000 },
            new Project { Id = "OTHER", WorkspaceCode = "sp" });
        await db.SaveChangesAsync();
        Assert.Equal(2, await DemoDocuments.AddMissingAsync(db, "NEW"));
        var structural = await db.Documents.SingleAsync(d => d.Code == "ST-DR-001");
        var r1 = await db.DocumentRevisions.SingleAsync(r => r.DocumentId == structural.Id);
        Assert.Equal("TR-2412", r1.TransmittalNo);
        r1.Status = "approved";
        r1.DecisionNote = "Keep this decision";
        db.DocumentRevisions.Add(new DocumentRevision { DocumentId = structural.Id, No = 2, Status = "rejected" });
        await db.SaveChangesAsync();
        Assert.Equal(0, await DemoDocuments.AddMissingAsync(db, "NEW"));
        Assert.Equal(2, await db.Projects.CountAsync());
        Assert.Equal(1000000m, (await db.Projects.SingleAsync(p => p.Id == "NEW")).PlannedCost);
        Assert.Empty(await db.Documents.Where(d => d.ProjectId == "OTHER").ToListAsync());
        Assert.Equal(3, await db.DocumentRevisions.CountAsync());
        Assert.Equal("approved", r1.Status);
        Assert.Equal("Keep this decision", r1.DecisionNote);
    }

    [Fact]
    public async Task Missing_project_creates_no_orphan_documents()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        await using var db = new EpmDb(new DbContextOptionsBuilder<EpmDb>().UseSqlite(connection).Options);
        await db.Database.EnsureCreatedAsync();
        await Assert.ThrowsAsync<ArgumentException>(() => DemoDocuments.AddMissingAsync(db, "MISSING"));
        Assert.Equal(0, await db.Documents.CountAsync());
        Assert.Equal(0, await db.DocumentRevisions.CountAsync());
    }
}

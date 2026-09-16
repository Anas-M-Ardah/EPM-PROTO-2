using Epm.Api.Data;
using Epm.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Dev;

/// <summary>Track 12's two illustrative prerequisites, copied from Fixture.Documents.
/// Adds missing codes only; never resets a database or changes existing history.</summary>
public static class DemoDocuments
{
    public static async Task<int> AddMissingAsync(EpmDb db, string projectId)
    {
        if (!await db.Projects.AnyAsync(p => p.Id == projectId))
            throw new ArgumentException("The target project does not exist.", nameof(projectId));

        var seeds = new[]
        {
            (Code: "ST-DR-001", Ar: "مخطط الأساسات", En: "Foundation plan",
                Discipline: "structural", Issuer: "قسم التصميم — الجامعة",
                Date: new DateOnly(2026, 5, 16), Transmittal: "TR-2412"),
            (Code: "ME-DR-002", Ar: "مخطط التمديدات الصحية", En: "Plumbing layout",
                Discipline: "mechanical", Issuer: "المقاول المنفّذ",
                Date: new DateOnly(2026, 4, 18), Transmittal: "TR-2436")
        };
        await using var transaction = await db.Database.BeginTransactionAsync();
        var added = 0;
        foreach (var seed in seeds)
        {
            if (await db.Documents.AnyAsync(d => d.ProjectId == projectId && d.Code == seed.Code))
                continue;
            var document = new Document
            {
                ProjectId = projectId, Code = seed.Code, TitleAr = seed.Ar, TitleEn = seed.En,
                Discipline = seed.Discipline, Issuer = seed.Issuer
            };
            db.Documents.Add(document);
            await db.SaveChangesAsync();
            db.DocumentRevisions.Add(new DocumentRevision
            {
                DocumentId = document.Id, No = 1, IssuedOn = seed.Date, Issuer = seed.Issuer,
                DescriptionAr = "الإصدار الأولي", DescriptionEn = "Initial issue",
                TransmittalNo = seed.Transmittal, FileName = $"{seed.Code}-R1.pdf", Status = "draft"
            });
            await db.SaveChangesAsync();
            added++;
        }
        await transaction.CommitAsync();
        return added;
    }
}

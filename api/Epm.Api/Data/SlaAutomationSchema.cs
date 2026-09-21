using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Data;

/// <summary>
/// Compatibility schema for the append-only SLA automation evidence tables.
/// This prototype intentionally has no EF migrations; EnsureCreated cannot add
/// a table to an already-running database. The guarded DDL makes the new
/// scheduler safe on both an existing demo database and a freshly reset one.
/// </summary>
public static class SlaAutomationSchema
{
    public static Task EnsureAsync(EpmDb db) => db.Database.ExecuteSqlRawAsync("""
        IF COL_LENGTH(N'[Contracts]', N'PenaltyRatePct') IS NULL
        BEGIN
            ALTER TABLE [Contracts]
                ADD [PenaltyRatePct] decimal(18,2) NOT NULL
                    CONSTRAINT [DF_Contracts_PenaltyRatePct] DEFAULT 0.10;
        END;
        IF OBJECT_ID(N'[AlertDeliveries]', N'U') IS NULL
        BEGIN
            CREATE TABLE [AlertDeliveries] (
                [Id] int NOT NULL IDENTITY,
                [AlertId] int NOT NULL,
                [Channel] nvarchar(max) NOT NULL,
                [Recipient] nvarchar(max) NOT NULL,
                [Status] nvarchar(max) NOT NULL,
                [AttemptedAt] datetime2 NOT NULL,
                [Detail] nvarchar(max) NOT NULL,
                CONSTRAINT [PK_AlertDeliveries] PRIMARY KEY ([Id])
            );
        END;
        IF OBJECT_ID(N'[AlertEscalations]', N'U') IS NULL
        BEGIN
            CREATE TABLE [AlertEscalations] (
                [Id] int NOT NULL IDENTITY,
                [AlertId] int NOT NULL,
                [Level] int NOT NULL,
                [RecipientRole] nvarchar(max) NOT NULL,
                [EscalatedAt] datetime2 NOT NULL,
                [Reason] nvarchar(max) NOT NULL,
                CONSTRAINT [PK_AlertEscalations] PRIMARY KEY ([Id])
            );
        END;
        """);
}

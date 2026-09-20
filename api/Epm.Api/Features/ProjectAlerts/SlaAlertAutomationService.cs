using Epm.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.ProjectAlerts;

/// <summary>
/// Evaluates project SLA rules without requiring a page visit or a demo button.
/// The worker is idempotent: alert, delivery and escalation records are keyed
/// by their target/channel/level, so the minute cadence does not duplicate them.
/// </summary>
public sealed class SlaAlertAutomationService(
    IServiceScopeFactory scopeFactory,
    ILogger<SlaAlertAutomationService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await ProcessAllAsync(stoppingToken);

        using var timer = new PeriodicTimer(Interval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
            await ProcessAllAsync(stoppingToken);
    }

    private async Task ProcessAllAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<EpmDb>();
            var projects = await db.Projects
                .Where(p => p.DataDate != null)
                .ToListAsync(cancellationToken);

            foreach (var project in projects)
            {
                try
                {
                    await ProjectAlertsEndpoints.ProcessSlaAlertsAsync(db, project);
                }
                catch (Exception ex)
                {
                    // Keep checking the other projects even if one project's
                    // unrelated fixture/data defect cannot be evaluated.
                    logger.LogError(ex, "SLA alert automation failed for project {ProjectId}.", project.Id);
                }
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Normal shutdown.
        }
        catch (Exception ex)
        {
            // A broken project must not stop the service from checking again on
            // the next interval. Operational monitoring owns the log sink.
            logger.LogError(ex, "SLA alert automation pass failed.");
        }
    }
}

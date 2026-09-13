namespace Epm.Api.Domain;

/// <summary>
/// Runtime-only impact calculation. It deliberately returns projections and
/// contains no persistence concerns or derived-total fields on an entity.
/// </summary>
public static class ChangeOrderImpactCalculator
{
    public record Result(
        decimal? ValueImpact,
        int? RequestedDays,
        ChangeOrderRecord.Column Column,
        ChangeOrderRecord.WeightImpact? Weights,
        ChangeOrderRecord.TimeImpact? Time);

    public static Result Line(ChangeOrderRecord.Line line, ChangeOrderRecord.Party party)
        => new(ChangeOrderRecord.For(line, party).Impact, null,
            ChangeOrderRecord.For(line, party), null, null);

    public static Result Contract(
        IReadOnlyList<ChangeOrderRecord.Amount> lines,
        ISet<string> affected,
        int requestedDays,
        int? analysisDays,
        int? approvedDays,
        DateOnly? finishBefore)
    {
        var weights = ChangeOrderRecord.Weights(lines, affected);
        var time = ChangeOrderRecord.Time(requestedDays, analysisDays, approvedDays, finishBefore);
        return new(null, requestedDays, new(null, null, null, null, 0m, 0m, 0m, false), weights, time);
    }
}

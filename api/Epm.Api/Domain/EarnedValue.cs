namespace Epm.Api.Domain;

/// <summary>
/// BR-11 · 02 §11 — earned value.
///
/// rule: PV = budget × plannedProgress; EV = budget × actualProgress;
///       AC = actual cost; CPI = EV/AC; SPI = EV/PV; EAC = budget/CPI;
///       VAC = budget − EAC.
/// example: budget 100,000,000, planned 0.60, actual 0.52, AC 55,000,000
///          → CPI ≈ 0.945, SPI ≈ 0.867.
///
/// DIAGNOSTICS, never headline figures (02 §11, 05 §7.9). Render at 13px in
/// --on-surface-variant and NEVER colour by threshold — `cpi < 1 ? error :
/// success` is a design defect. Reserve --error for genuine exceptions.
///
/// Progress is a FRACTION here (0.52), matching the prototype's domain.js.
/// Nulls where undefined: CPI before any cost, SPI before any plan. P-09 —
/// return null and render an em dash, never a zero that asserts failure.
/// </summary>
public static class EarnedValue
{
    public record Result(decimal Pv, decimal Ev, decimal Ac, decimal? Cpi, decimal? Spi, decimal? Eac, decimal? Vac);

    public static Result For(decimal budget, decimal planned, decimal actual, decimal ac)
    {
        var pv = budget * planned;
        var ev = budget * actual;

        decimal? cpi = ac > 0m ? ev / ac : null;
        decimal? spi = pv > 0m ? ev / pv : null;
        decimal? eac = cpi > 0m ? budget / cpi : null;
        decimal? vac = eac is null ? null : budget - eac;

        return new Result(pv, ev, ac, cpi, spi, eac, vac);
    }
}

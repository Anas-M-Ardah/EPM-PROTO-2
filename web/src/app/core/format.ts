/**
 * Display formatting only. NO BUSINESS ARITHMETIC HERE — if a number needs
 * computing, the API computed it in api/Epm.Api/Domain/. This file turns a
 * number into a string and nothing more.
 *
 * ── BIDI IS NOT OPTIONAL (05 §5.2) ────────────────────────────────────────
 * Every number, percentage, date, duration, currency amount, ID and reference
 * string must be bidi-isolated when rendered inside Arabic text. Unisolated
 * values are a DEFECT even when they happen to look right today — "0.92 / 1.05"
 * renders with the slash leading the line without isolation.
 *
 * In templates always wrap the output:  <bdi class="mono">{{ fmt.money(v) }}</bdi>
 * `.mono` gives tabular numerals so columns align in both directions.
 */

/** Latin digits, grouped. IQD is displayed as an integer (D-11). */
export function money(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return Math.round(v).toLocaleString('en-US');
}

/** Two decimals — the precision BOQ weights are stated in (02 §1). */
export function pct(v: number | null | undefined, dp = 2): string {
  if (v === null || v === undefined) return '—';
  return v.toFixed(dp) + '%';
}

/** Quantities carry up to three decimals; trailing zeros are dropped. */
export function qty(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return parseFloat(v.toFixed(3)).toLocaleString('en-US');
}

/** ISO date → yyyy-MM-dd. Deliberately not localised: it is a record, not prose. */
export function date(v: string | null | undefined): string {
  if (!v) return '—';
  return v.length >= 10 ? v.slice(0, 10) : v;
}

export function days(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return String(v);
}

/** Signed delta, e.g. "+717" / "−240". Uses U+2212 so it aligns with digits. */
export function delta(v: number | null | undefined): string {
  if (v === null || v === undefined || v === 0) return '—';
  return (v > 0 ? '+' : '−') + Math.abs(Math.round(v)).toLocaleString('en-US');
}

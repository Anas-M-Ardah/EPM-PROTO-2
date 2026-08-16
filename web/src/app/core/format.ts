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

/**
 * الشكل 5's «إحداثيات الموقع» — `"33.33,44.33"` → `33.33°N, 44.33°E`.
 *
 * ONE STORED COLUMN, `Projects.Coordinates`, in the "lat,lon" form the entity
 * documents. The hemisphere letters are a DISPLAY decision, not a second
 * representation: they come from the sign, so nothing new is stored and the
 * value round-trips through the form unchanged.
 *
 * Anything that is not a numeric pair passes through as typed — a half-entered
 * coordinate is data the specialist can still see and correct, and silently
 * blanking it would hide the mistake.
 */
/**
 * «03-2025», then «04», «05» … and «01-2026» where the year turns — a chart
 * period's own month, for an axis tick.
 *
 * ── WHY NOT «ش8» ─────────────────────────────────────────────────────────
 * An ordinal numbers the boxes and names none of them. A reader could not say
 * WHEN the actual line went flat, or line a curve up against a payment date,
 * without counting boxes from the left.
 *
 * ── WHY DIGITS AND NOT «تشرين الثاني» ────────────────────────────────────
 * An axis tick has about 28px on an eighteen-month curve. A month NAME does
 * not fit in that at any of the eight sizes 05 §6 allows, and digits read the
 * same in both languages — an axis is a number line, not a sentence.
 *
 * ── WHY THE YEAR ONLY WHERE IT TURNS ─────────────────────────────────────
 * «03-2025» is 27px wide in a 28px slot: legible, but touching its neighbour
 * the whole way across. Repeating a year that has not changed is the part of
 * the tick carrying no information, so it is dropped — and where it DOES
 * change, the tick says so, which is also where a reader most needs telling.
 */
export function month(v: string | null | undefined, prev?: string | null): string {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';

  const mm = String(d.getMonth() + 1).padStart(2, '0');
  if (!prev) return mm + '-' + d.getFullYear();

  const p = new Date(prev);
  if (Number.isNaN(p.getTime()) || p.getFullYear() !== d.getFullYear()) {
    return mm + '-' + d.getFullYear();
  }
  return mm;
}

export function coords(v: string | null | undefined): string {
  if (!v) return '—';
  const parts = v.split(',').map(s => s.trim());
  if (parts.length !== 2) return v;
  const [lat, lon] = parts.map(Number);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return v;
  return `${Math.abs(lat)}°${lat < 0 ? 'S' : 'N'}, ${Math.abs(lon)}°${lon < 0 ? 'W' : 'E'}`;
}

export function days(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return String(v);
}

/**
 * A performance INDEX — SPI, CPI (BR-11). A ratio around 1, never a percentage:
 * `02 §11` prints 0.945 and 0.867, and rendering 0.87 as "87%" would invite it
 * to be read as a completion figure, which is exactly what an index is not.
 *
 * Null is an em dash, never 0 — a 0 here would assert a total failure the data
 * does not support (P-09).
 */
export function index(v: number | null | undefined, dp = 2): string {
  if (v === null || v === undefined) return '—';
  return v.toFixed(dp);
}

/** Signed delta, e.g. "+717" / "−240". Uses U+2212 so it aligns with digits. */
export function delta(v: number | null | undefined): string {
  if (v === null || v === undefined || v === 0) return '—';
  return (v > 0 ? '+' : '−') + Math.abs(Math.round(v)).toLocaleString('en-US');
}

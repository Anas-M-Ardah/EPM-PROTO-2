/**
 * The rules reference · `EP-DOCS-01`.
 *
 * Member names are IDENTICAL to api/Epm.Api/Domain/RuleCatalog.cs's `Rule`
 * (CLAUDE.md §2).
 */

export interface RuleRow {
  /** BOQ-WEIGHT · TIER-20 … — the catalogue's own id, never renumbered. */
  id: string;
  /** BR-01 … BR-15 — what `02-BUSINESS-RULES.md` calls it. */
  br: string;
  /** 02.5 · 03.2 · 07 §24 — where the spec text lives. */
  section: string;
  title: string;
  spec: string;
  /** The worked example's INPUT, shaped by the rule. Rendered as JSON. */
  example: unknown;
  /** What the spec says the answer is — prose, from the document. */
  expect: string;
  /** The Domain file that computed the result below. */
  source: string;
  /**
   * What the REAL function returned, executed on this request. Not cached: a
   * stale result would be worse than no page at all.
   */
  result: unknown;
}

export interface RulesResponse {
  rules: RuleRow[];
}

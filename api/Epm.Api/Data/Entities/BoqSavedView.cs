namespace Epm.Api.Data.Entities;

/// <summary>
/// «العروض» — a named set of BOQ register controls a user can restore
/// (boq-register.jsx:575, الشكل 12's toolbar).
///
/// ── THIS IS A RECORD, NOT A BROWSER PREFERENCE ───────────────────────────
/// The reference keeps its views in `usePersistedState('boq.views', [])`, i.e.
/// localStorage — correct for a clickable prototype, wrong here. A view kept in
/// the browser is lost on a new machine, invisible to the person who saved it
/// when they sign in elsewhere, and owned by nobody. Persisting it makes the
/// view survive the session and gives it an OWNER, which is the same call P-29
/// made about acknowledging an alert.
///
/// ── OWNED BY A PERSONA, AND SCOPED TO NOTHING ELSE ───────────────────────
/// `UserId` is the `X-Epm-User` persona (P-05) — a view is MINE, and one user's
/// views never appear in another's menu. It is deliberately NOT scoped to a
/// contract or a project: nothing a view stores is contract-specific (a search
/// string, a coverage chip and a set of column toggles), and the reference keys
/// its whole store on the single string `boq.views` with no scope at all. A
/// per-contract view would also be unreachable the moment you switched
/// contract, which is the opposite of what the control is for.
///
/// NO WORKSPACE GUARD (BR-15). A row holds no project data — no code, no
/// figure, no name of anything the ministry owns — so there is nothing here to
/// scope. The endpoints filter by `UserId` and that is the whole rule.
/// </summary>
public class BoqSavedView
{
    public int Id { get; set; }

    /// <summary>→ the `X-Epm-User` persona id. The view's owner, and its only scope.</summary>
    public string UserId { get; set; } = "";

    /// <summary>
    /// The view's own name, and its identity WITHIN one user's set. Saving over
    /// an existing name replaces it, exactly as the reference's `saveView` does
    /// (`vs.filter(x => x.name !== name)` then append). There is no unique
    /// index — the rule is checked in the endpoint where its message lives (P-01).
    /// </summary>
    public string Name { get; set; } = "";

    // ── what a view restores ─────────────────────────────────────────────

    /// <summary>The search box. Empty is a legitimate saved value, not "unset".</summary>
    public string Query { get; set; } = "";

    /// <summary>The `06 §11` coverage chip. Empty string means «الكل».</summary>
    public string Coverage { get; set; } = "";

    /// <summary>
    /// CSV of the column keys that are SHOWN — the same shape
    /// `Projects.BeneficiaryCodes` and `Activities.Predecessors` already use, and
    /// chosen over a bool-per-column for the reason those were: adding a column
    /// to the grid must not be a schema change. Storing the SHOWN set rather
    /// than the hidden one means a column that did not exist when the view was
    /// saved stays hidden on restore, which is the safer default — a view cannot
    /// silently start showing something its author never chose.
    /// </summary>
    public string VisibleColumns { get; set; } = "";

    /// <summary>
    /// The sorted column's key, or empty for the bill's own order — code within
    /// division, which is how a bill of quantities is written and the state the
    /// register opens in.
    ///
    /// The reference stores this as `sort: { k, d }` and this splits it in two
    /// for the same reason `VisibleColumns` is a CSV: a flat column reads in a
    /// query without a JSON parse.
    /// </summary>
    public string SortKey { get; set; } = "";

    /// <summary>`asc` · `desc`. Ignored when <see cref="SortKey"/> is empty.</summary>
    public string SortDir { get; set; } = "asc";

    public DateTime CreatedAt { get; set; }
}

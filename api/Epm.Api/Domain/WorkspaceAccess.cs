namespace Epm.Api.Domain;

/// <summary>
/// BR-15 — WHICH WORKSPACES A USER MAY SEE AND ENTER.
///
/// `العرض الفني §7` states it as a ضابط أساسي:
///   «نطاق رؤية المستخدم هو اتحاد تكليفاته حسب دوره ونطاقه؛ ولا يرى بيانات خارج تشكيله»
/// and `§24` makes assignment an explicit object — a user (or group) assigned to
/// a role within a scope, where the scope is a workspace or a project. The
/// screens addendum repeats it as the benefit of Figure 1:
///   «لا يرى المستخدم إلا المساحات المسندة إليه»
///
/// ── THE RULE IS A UNION, NOT A HIERARCHY ──────────────────────────────────
/// A user's scope is the UNION of their assignments. There is no inheritance
/// and no wildcard match on a code prefix: `Assigned` is the whole answer,
/// except for a ministry-level user, whose assignment IS the whole portfolio
/// (`§7` grants المركز "اطلاع شامل"). That is the one exception and it is
/// explicit — `all: true` — never inferred from an empty list. An empty list
/// with `all: false` means the user is assigned to nothing and sees nothing,
/// which is a real state, not a bug.
///
/// ── PURE, SO IT CAN BE THE SAME ANSWER EVERYWHERE ─────────────────────────
/// Takes and returns plain strings. The workspace register, the sidebar
/// switcher and every `?workspace=` guard call THIS — one concept of "the
/// workspaces available to me", so no two screens can disagree.
/// </summary>
public static class WorkspaceAccess
{
    /// <summary>
    /// The workspace codes this user may see, in the order <paramref name="all"/>
    /// supplies them. Ministry-level users get the whole list.
    /// </summary>
    public static IReadOnlyList<string> Visible(
        IEnumerable<string> all,
        IReadOnlyList<string> assigned,
        bool ministryWide)
    {
        var codes = all.ToList();
        if (ministryWide) return codes;

        var mine = assigned.ToHashSet(StringComparer.OrdinalIgnoreCase);
        return codes.Where(mine.Contains).ToList();
    }

    /// <summary>
    /// May this user operate in <paramref name="code"/>?
    ///
    /// A null/empty code is the ENTERPRISE scope — "all the workspaces I am
    /// assigned to", which every user may ask for. It is not a bypass: the
    /// caller still filters the result set to <see cref="Visible"/>.
    /// </summary>
    public static bool Allowed(
        string? code,
        IReadOnlyList<string> assigned,
        bool ministryWide)
    {
        if (string.IsNullOrWhiteSpace(code)) return true;
        if (ministryWide) return true;
        return assigned.Contains(code, StringComparer.OrdinalIgnoreCase);
    }
}

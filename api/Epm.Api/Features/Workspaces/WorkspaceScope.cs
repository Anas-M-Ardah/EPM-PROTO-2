using Epm.Api.Domain;
using Epm.Api.Features.Dev;

namespace Epm.Api.Features.Workspaces;

/// <summary>
/// THE ONE PLACE `?workspace=` IS TURNED INTO A DECISION.
///
/// ── `Features/Workspaces/` IS THE ENTERPRISE WORKSPACE ────────────────────
/// Plural. The universities and ministry units the ministry's portfolio is
/// divided into (`العرض الفني §7`). NOT to be confused with the Angular
/// `features/workspace/` (singular), which is the PROJECT workspace shell —
/// the module rail inside one project. Two different things, and the plural
/// is the one that owns scope.
///
/// ── WHY A GUARD AND NOT A FILTER ──────────────────────────────────────────
/// Every enterprise endpoint already NARROWS by `?workspace=`. Narrowing is not
/// access control: the caller picks the value, so before this file existed
/// `GET /api/projects?workspace=nu` returned Mosul's portfolio to anyone who
/// typed it. `§7`'s «لا يرى بيانات خارج تشكيله» is a rule about the USER, so it
/// has to be checked against the user — which is what `Deny` does, in one line,
/// at the top of each endpoint where it can be read (P-01).
///
/// The identity is still the X-Epm-User header and still trivially spoofable
/// (P-05) — that is deliberate and unchanged. What is enforced here is the
/// BUSINESS rule, so that switching persona visibly changes what the API will
/// serve. Making the identity itself trustworthy is a production concern.
/// </summary>
public static class WorkspaceScope
{
    /// <summary>The persona the middleware resolved for this request.</summary>
    public static Persona User(HttpContext ctx) => (Persona)ctx.Items["user"]!;

    /// <summary>
    /// 403 when this user may not operate in <paramref name="code"/>, null when
    /// they may. Written as `if (Deny(ctx, code) is { } denied) return denied;`
    /// so the guard reads as one line at the top of an endpoint.
    ///
    /// An empty code is the enterprise scope and is always allowed — the caller
    /// then filters to <see cref="Visible"/>.
    /// </summary>
    public static IResult? Deny(HttpContext ctx, string? code)
    {
        var user = User(ctx);
        if (WorkspaceAccess.Allowed(code, user.Workspaces, user.MinistryWide)) return null;

        // Bilingual because every other message this system produces is, and
        // this one is read by the person who hit the wall.
        return Results.Json(new
        {
            code,
            messageAr = "لا تملك صلاحية الوصول إلى مساحة العمل هذه.",
            messageEn = $"You are not assigned to workspace '{code}'.",
        }, statusCode: StatusCodes.Status403Forbidden);
    }

    /// <summary>
    /// The workspace codes this user may see. Used by the register, the switcher
    /// and by every endpoint that has to bound an ENTERPRISE-scoped query to the
    /// user's own workspaces rather than the whole ministry.
    /// </summary>
    public static IReadOnlyList<string> Visible(HttpContext ctx, IEnumerable<string> allCodes)
    {
        var user = User(ctx);
        return WorkspaceAccess.Visible(allCodes, user.Workspaces, user.MinistryWide);
    }

    /// <summary>
    /// The codes a query should be limited to, given an optional explicit
    /// `?workspace=`. Call `Deny` FIRST — this assumes access is already
    /// verified and only resolves "one workspace" vs "all the ones I can see".
    /// </summary>
    public static HashSet<string> Effective(HttpContext ctx, IEnumerable<string> allCodes, string? code) =>
        string.IsNullOrWhiteSpace(code)
            ? Visible(ctx, allCodes).ToHashSet(StringComparer.OrdinalIgnoreCase)
            : new HashSet<string>([code], StringComparer.OrdinalIgnoreCase);
}

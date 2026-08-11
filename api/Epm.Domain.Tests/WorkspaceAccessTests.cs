using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>
/// BR-15 · العرض الفني §7, §24 · ملحق الشاشات الشكل 1 — a user sees only the
/// workspaces assigned to them, and their scope is the UNION of assignments.
/// </summary>
public class WorkspaceAccessTests
{
    private static readonly string[] All = ["ub", "nu", "tu", "spd", "cu"];

    // ── Visible ───────────────────────────────────────────────────────────

    [Fact]
    public void Visible_is_the_union_of_assignments()
    {
        var seen = WorkspaceAccess.Visible(All, ["ub", "tu"], false);

        Assert.Equal(["ub", "tu"], seen);
    }

    [Fact]
    public void Visible_keeps_the_order_of_the_source_list_not_the_assignment_order()
    {
        var seen = WorkspaceAccess.Visible(All, ["tu", "ub"], false);

        Assert.Equal(["ub", "tu"], seen);
    }

    [Fact]
    public void Ministry_wide_sees_every_workspace()
    {
        var seen = WorkspaceAccess.Visible(All, [], true);

        Assert.Equal(All, seen);
    }

    [Fact]
    public void Assigned_to_nothing_sees_nothing()
    {
        // A real state — an unassigned account — not a bug to be defaulted away.
        Assert.Empty(WorkspaceAccess.Visible(All, [], false));
    }

    [Fact]
    public void An_assignment_to_a_workspace_that_does_not_exist_adds_nothing()
    {
        var seen = WorkspaceAccess.Visible(All, ["ub", "gone"], false);

        Assert.Equal(["ub"], seen);
    }

    // ── Allowed ───────────────────────────────────────────────────────────

    [Fact]
    public void An_assigned_workspace_is_allowed()
    {
        Assert.True(WorkspaceAccess.Allowed("ub", ["ub", "nu"], false));
    }

    [Fact]
    public void An_unassigned_workspace_is_rejected()
    {
        Assert.False(WorkspaceAccess.Allowed("tu", ["ub", "nu"], false));
    }

    [Fact]
    public void Ministry_wide_may_enter_any_workspace()
    {
        Assert.True(WorkspaceAccess.Allowed("tu", [], true));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void No_code_is_the_enterprise_scope_and_is_always_allowed(string? code)
    {
        // Asking for "everything I can see" is not a bypass — the caller still
        // narrows the result set to Visible().
        Assert.True(WorkspaceAccess.Allowed(code, ["ub"], false));
    }

    [Fact]
    public void Codes_compare_case_insensitively()
    {
        Assert.True(WorkspaceAccess.Allowed("UB", ["ub"], false));
    }
}

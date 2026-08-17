using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>
/// D-14 — the bill's shape follows the project type (06 §3).
/// No database: the map is the rule, and a fixture cannot make it lie (P-04).
/// </summary>
public class BoqKindTests
{
    [Theory]
    [InlineData("construction", BoqKind.Works)]
    [InlineData("equipment", BoqKind.Supply)]
    [InlineData("design-studies", BoqKind.None)]
    public void Maps_each_project_type_to_its_bill_shape(string projectType, string expected) =>
        Assert.Equal(expected, BoqKind.ForProjectType(projectType));

    /// <summary>
    /// An unrecognised type must NOT fall through to works. A stale code — say
    /// `new-build` from the list the three replaced (D-13) — would otherwise get
    /// a bill silently built on the wrong shape.
    /// </summary>
    [Theory]
    [InlineData("new-build")]
    [InlineData("")]
    [InlineData("rehabilitation")]
    public void Unknown_type_is_none_not_works(string projectType)
    {
        Assert.Equal(BoqKind.None, BoqKind.ForProjectType(projectType));
        Assert.False(BoqKind.Accepts(projectType));
    }

    [Fact]
    public void Only_construction_and_equipment_accept_a_bill()
    {
        Assert.True(BoqKind.Accepts("construction"));
        Assert.True(BoqKind.Accepts("equipment"));
        Assert.False(BoqKind.Accepts("design-studies"));
    }

    /// <summary>Every refusal on this system is bilingual (05 §5).</summary>
    [Fact]
    public void Unsupported_explains_itself_in_both_languages()
    {
        var (ar, en) = BoqKind.Unsupported("design-studies");
        Assert.NotEmpty(ar);
        Assert.NotEmpty(en);
        Assert.NotEqual(ar, en);
    }
}

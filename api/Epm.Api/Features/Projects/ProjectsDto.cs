namespace Epm.Api.Features.Projects;

/// <summary>
/// Wire shapes for the Projects list (SCR-E2).
///
/// THE COLUMN SET IS THE REFERENCE PROTOTYPE'S, not an invention. Ported from
/// DProjectsAll in docs/spec/reference/app/enterprise-areas.jsx:112 —
///   Project (name + id beneath) · Workspace · Branch · Status · Physical % ·
///   Cost · Updated
/// Do not add or drop a column without a spec or client reason.
///
/// MEMBER NAMES MUST MATCH web/src/app/features/projects/projects.types.ts
/// exactly. That is what lets one grep cross the language boundary.
/// </summary>
public record ProjectRow(
    string Id,
    string NameAr,
    string NameEn,
    string WorkspaceCode,
    string WorkspaceNameAr,
    string WorkspaceNameEn,
    string Branch,
    string Status,
    /// <summary>
    /// الإنجاز — physical completion. NULL until the BOQ page exists: it is the
    /// weight-rolled BOQ progress (BR-04) and must never be stored or guessed
    /// (01 §3). The register renders "—" rather than a misleading 0% bar.
    /// </summary>
    decimal? PhysicalPct,
    /// <summary>الكلفة — DERIVED: Σ contract values. See Domain/ProjectValue.cs.</summary>
    decimal Cost,
    /// <summary>آخر تحديث — ISO date, or null.</summary>
    string? UpdatedAt,
    /// <summary>
    /// D-13's three — construction · equipment · design-studies. Carried on the
    /// register row because the workspace RAIL reads it: `modulesFor` swaps the
    /// BOQ module for «الفقرات التجهيزية» and drops the 3D model on an
    /// `equipment` project, and the rail is drawn from this list.
    /// </summary>
    string Type
);

/// <summary>The list plus the counts the filter chips need, in one response.</summary>
public record ProjectsResponse(
    IReadOnlyList<ProjectRow> Rows,
    int Total,
    IReadOnlyDictionary<string, int> CountByStatus
);

// ─────────────────────────────────────────────────────────────────────────
// المسار 1 — تعريف المشروع وربطه بالجامعة
//
// The definition card of الشكل 5 and the workflow around it. MEMBER NAMES
// MATCH web/src/app/features/projects/projects.types.ts exactly.
// ─────────────────────────────────────────────────────────────────────────

/// <summary>
/// What the specialist enters — الشكل 5's six sections, in its order:
/// هوية المشروع · الموقع · التمويل والموازنة · الوصف · الجهة · الاستشاري.
///
/// Members are nullable AT THIS LAYER so that a missing field arrives as null
/// and is reported by Domain/ProjectDefinition with a message the user can act
/// on — rather than being rejected by the JSON binder with one that says
/// nothing. Completeness is a business rule, checked in one place.
/// </summary>
public record ProjectDefinitionInput(
    // هوية المشروع
    string? NameAr,
    string? NameEn,
    string? Code,
    string? Type,
    int? RegistrationYear,
    string? ExecutionStage,
    string? Status,
    // الموقع
    string? Coordinates,
    string? Region,
    // التمويل والموازنة
    string? FundingType,
    string? Priority,
    string? ExpenditureCategory,
    string? BudgetApprovalNumber,
    decimal? PlannedCost,
    // الوصف
    string? Description,
    // الجهة
    string? Formation,
    string? BeneficiaryCodes,
    string? OrgStructure,
    string? Branch,
    // الاستشاري
    string? ConsultantParty,
    string? DesignerParty,
    string? Executor
);

/// <summary>
/// POST /api/projects. The workspace is a SEPARATE member from the definition
/// because it is not a field the specialist types — it is the context they are
/// standing in (الشكل 3 is «مساحة العمل › المشاريع»), and المسار 1 validates
/// «انتماء المشروع إلى تشكيل واحد» against it.
/// </summary>
public record CreateProjectRequest(string? WorkspaceCode, ProjectDefinitionInput Definition);

/// <summary>
/// One violation from Domain/ProjectDefinition, on the wire. `Field` matches the
/// input member name so the form can put the message on the control that caused it.
/// </summary>
public record ProjectViolation(string Field, string MessageAr, string MessageEn);

/// <summary>
/// A value the system SUGGESTED rather than one the user typed — الشكل 5's
/// «مقترح» tag. The card renders the tag from this list, which is what makes
/// «تفصل بين ما هو مُدخَل معتمد وما هو مقترح من النظام» true on screen.
/// </summary>
public record ProjectSuggestion(string Field, string Value);

/// <summary>سجل النشاط — one row of الشكل 5's second tab. An EDIT, not a workflow step.</summary>
public record ProjectEvent(
    int Id,
    string Action,
    string ActorName,
    string ActorRole,
    string ActorParty,
    string At
);

/// <summary>
/// GET /api/projects/{id}/definition — the whole card, its activity log, and
/// what the CURRENT persona may do with it.
/// </summary>
public record ProjectDefinitionResponse(
    string Id,
    string WorkspaceCode,
    string WorkspaceNameAr,
    string WorkspaceNameEn,
    ProjectDefinitionInput Definition,
    IReadOnlyList<ProjectSuggestion> Suggestions,
    IReadOnlyList<ProjectEvent> Events,
    /// <summary>
    /// Resolved SERVER-SIDE from the persona. The UI renders actions from this
    /// rather than deciding for itself, so the button and the endpoint cannot
    /// disagree about who may edit.
    /// </summary>
    ProjectPermissions Can
);

/// <param name="Edit">
/// «المستخدم المختص» — §23 gives project definition to the specialist. The only
/// capacity left now that the review step is gone.
/// </param>
public record ProjectPermissions(bool Edit);

// ── EP-PRJ-05 / 06 · «الجهات المستفيدة» (ملحق الشكل 12) ───────────────────

/// <summary>
/// One row of the master beneficiary list, with this project's use of it.
///
/// `Assigned` is the tick. `Active` is the ministry's own state for the
/// beneficiary and is INDEPENDENT of it: an inactive beneficiary may still be
/// assigned (it can hold quantity distributed before it was stood down), which
/// is why the drawer disables the checkbox rather than hiding the row.
///
/// The parent's NAME travels beside its code so the drawer can print «الجهة
/// الأم» without a second request — the reference reads it off one in-memory
/// master list and this is the same list, resolved server-side.
/// </summary>
public record ProjectBeneficiaryRow(
    string Code,
    string NameAr,
    string NameEn,
    string Type,
    string? ParentCode,
    string? ParentNameAr,
    string? ParentNameEn,
    bool Active,
    bool Assigned);

/// <summary>
/// The ticked set, whole. A PUT of the complete list rather than a per-row
/// toggle: the drawer's subject is which beneficiaries this project uses, and
/// sending the answer avoids a half-applied state if one toggle of several
/// fails.
/// </summary>
public record ProjectBeneficiariesInput(IReadOnlyList<string?>? Codes);

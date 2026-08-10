namespace Epm.Api.Features.Alerts;

/// <summary>
/// Member names are IDENTICAL to web/src/app/features/alerts/alerts.types.ts,
/// so one grep crosses both stacks (CLAUDE.md §2).
///
/// Column set ported from DAlertsCenter — the v1.1 branch,
/// ../epm@design/system-revamp app/enterprise-areas.jsx:106.
/// </summary>
/// <param name="Severity">critical · warning · info — lookup kind `alert-severity`.</param>
/// <param name="Kind">The Source column — lookup kind `alert-kind`.</param>
/// <param name="Status">
/// DERIVED from Acknowledged: open · acknowledged. Lookup kind `alert-status`.
/// Sent as a code rather than a bool so the pill resolves its label through the
/// same path as every other enum in the app.
/// </param>
/// <param name="ProjectNameAr">
/// Resolved here, not in the client: an alert may be enterprise-wide
/// (ProjectId null), in which case both names are null and the column shows the
/// portfolio scope rather than a blank.
/// </param>
/// <param name="RaisedAt">yyyy-MM-dd, at the data date it was raised (D-06).</param>
public record AlertRow(
    int Id,
    string? ProjectId,
    string? ProjectNameAr,
    string? ProjectNameEn,
    string Severity,
    string Kind,
    string TitleAr,
    string TitleEn,
    string? TargetRef,
    string RaisedAt,
    string Status,
    string? AcknowledgedByUserId);

/// <summary>
/// The four severity cards. Counts come from the feed BEFORE the severity and
/// status filters, so the numbers stay put while a card is selected — the same
/// contract the Contracts chips honour.
/// </summary>
/// <param name="Total">Every alert in scope. The denominator of each card's share.</param>
/// <param name="OpenBySeverity">
/// severity code → how many of that severity are still open. The card's foot
/// line states this: a count of 9 critical means little if 8 are acknowledged.
/// </param>
public record AlertCounts(
    int Total,
    int Open,
    int Acknowledged,
    Dictionary<string, int> BySeverity,
    Dictionary<string, int> OpenBySeverity);

public record AlertsResponse(
    IReadOnlyList<AlertRow> Rows,
    int Total,
    AlertCounts Counts);

/// <summary>Body of EP-ALR-02. A toggle, so the caller states the target state.</summary>
public record AcknowledgeRequest(bool Acknowledged);

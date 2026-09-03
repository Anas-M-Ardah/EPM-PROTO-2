namespace Epm.Api.Features.Schedule;

/// <summary>
/// المسار 4 · الشكل 24 — «استيراد الجدول الزمني».
///
/// One activity as the WIZARD parsed it. Parsing an XER, a P6 XML or a workbook
/// is not business logic and belongs to the client, exactly as `04 §4`'s bill
/// import splits it; every JUDGEMENT below is the server's.
/// </summary>
/// <param name="Row">1-based row IN THE FILE, so a violation can be pointed at.</param>
public record ScheduleImportRow(
    int Row,
    string? ActivityId,
    string? Name,
    string? WbsPath,
    string? WbsNames,
    string? BaselineStart,
    string? BaselineFinish,
    decimal BudgetedCost,
    decimal? BudgetedManHours,
    bool IsMilestone,
    string? Predecessors);

/// <param name="Format">xer · p6xml · excel.</param>
/// <param name="Basis">
/// cost · manhours — BR-02's weight basis. `02 §2` puts the choice at import
/// and this build had nowhere to record it (P-48); this is that place.
/// </param>
public record ScheduleImportPreviewRequest(
    string? Format,
    string? Basis,
    string? FileName,
    long FileSizeBytes,
    IReadOnlyList<ScheduleImportRow>? Rows);

public record ScheduleImportViolationDto(int Row, string Field, string MessageAr, string MessageEn);

/// <param name="Kind">added · removed · moved.</param>
public record ScheduleImportChangeDto(
    string ActivityId,
    string Name,
    string Kind,
    string? BeforeFinish,
    string? AfterFinish,
    int SlipDays);

/// <param name="ContractFinishDelta">
/// The incoming programme's last baseline finish minus the one in force,
/// SIGNED. A revised programme that ends later is a claim on the contract's own
/// dates, and `03` gives that to a change order and never to an import — so the
/// wizard STATES it and acts on nothing.
/// </param>
public record ScheduleImportImpactDto(
    int Added,
    int Removed,
    int Moved,
    int Unchanged,
    string? FinishBefore,
    string? FinishAfter,
    int ContractFinishDelta,
    IReadOnlyList<ScheduleImportChangeDto> Changes);

/// <param name="CanSubmit">
/// The SERVER's answer, not the wizard's. False whenever there is a violation,
/// so a client that forgot to check cannot submit a broken file.
/// </param>
public record ScheduleImportPreviewResponse(
    string ContractId,
    string Format,
    string Basis,
    int ActivityCount,
    decimal TotalCost,
    decimal TotalManHours,
    bool ManHoursComplete,
    IReadOnlyList<ScheduleImportViolationDto> Violations,
    ScheduleImportImpactDto Impact,
    bool CanSubmit);

/// <summary>
/// One submitted version, as the register beneath the wizard lists them.
/// </summary>
/// <param name="State">
/// submitted · approved · superseded · lapsed. At most one row in the list is
/// `submitted`, which is what lets `schedule.page.ts` draw one pending bar —
/// see `ScheduleImportVersion.State`.
/// </param>
public record ScheduleImportVersionDto(
    int Id,
    int No,
    string State,
    string Format,
    string Basis,
    string FileName,
    long FileSizeBytes,
    int ActivityCount,
    decimal TotalCost,
    string? FinishBefore,
    string? FinishAfter,
    int ContractFinishDelta,
    int Added,
    int Removed,
    int Moved,
    string At,
    string ActorName,
    string ActorParty,
    string? ApprovedAt,
    string ApproverName,
    string ApproverParty);

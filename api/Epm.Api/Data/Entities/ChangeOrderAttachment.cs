namespace Epm.Api.Data.Entities;

/// <summary>
/// Spec 03 §8 step 4, 03 §9 tab 5.
///
/// VERSIONS ACCUMULATE — files are NEVER replaced (03 §9). Each row records the
/// stage it originated from, so the attachments tab can show provenance.
///
/// No real file storage in the prototype: FileName + SizeBytes are recorded,
/// the bytes are not kept.
/// </summary>
public class ChangeOrderAttachment
{
    public int Id { get; set; }

    public int ChangeOrderId { get; set; }

    public string FileName { get; set; } = "";

    /// <summary>Lookup "attachment-category": كتاب رسمي · مخطط · كشف كميات · تحليل مالي أو زمني · صور موقع · مستند داعم (06 §7).</summary>
    public string Category { get; set; } = "";

    public long SizeBytes { get; set; }

    /// <summary>Versions accumulate; 1, 2, 3… for the same logical document.</summary>
    public int Version { get; set; } = 1;

    /// <summary>Which of the six stages this file arrived at.</summary>
    public int? OriginStageNo { get; set; }

    public string UploadedByUserId { get; set; } = "";
    public DateTime UploadedAt { get; set; }
}

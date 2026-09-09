namespace Epm.Api.Domain;

/// <summary>
/// المسار 6 — «تحديث الإنجاز واعتماده». The gate a proposed reading has to pass
/// before it may be submitted, and the transitions a submitted one may make.
///
/// Here rather than in `ProgressEndpoints` because CLAUDE.md §3.1 puts every
/// lifecycle transition in Domain/, and because the track's step 4 —
/// «تحقق: النسبة ضمن 0–100 ولا تقل عن القراءة السابقة» — is a rule with a
/// worked example, not a null check.
///
/// ── THE THREE CHECKS ARE THE TRACK'S OWN THREE ───────────────────────────
/// «ما يتحقق منه النظام: حدود النسبة · عدم التراجع عن القراءة السابقة · وجود
/// ربط بالأنشطة قبل الاحتساب». The first two are refusals and live here. The
/// third is NOT a refusal and deliberately so — an activity linked to no BOQ
/// line is real work that earns nothing, and refusing to record it would lose
/// the fact rather than report it. `ProgressActivityDto.BoqCodes` carries it to
/// the screen, which names the lines a row feeds BEFORE it is touched and warns
/// when there are none. Recorded in DECISIONS.
///
/// ── WHY «لا تقل عن القراءة السابقة» IS A REFUSAL AND NOT A WARNING ───────
/// A percentage that can go down is a percentage that can be quietly walked
/// back after a payment has been certified against it: BR-04 turns it into an
/// executed value, `PaymentCertificate` turns that into money, and nothing in
/// the certificate would show that the work it was measured against had since
/// been un-done. The track puts the check in the SUBMISSION step for that
/// reason, and a correction that genuinely needs to lower a reading is a
/// decision with a name on it — which is what the review stage is for.
/// </summary>
public static class ProgressReview
{
    /// <summary>
    /// The states of `ProgressReading.State`, matching lookup
    /// `progress-reading-state`.
    /// </summary>
    public const string Submitted = "submitted";
    public const string Approved = "approved";
    public const string Returned = "returned";
    public const string Lapsed = "lapsed";

    /// <summary>
    /// Why a reading may not be submitted, or null when it may.
    ///
    /// Returns the pair of messages this codebase sends on a refusal — Arabic
    /// is the primary label (06 preamble) and English travels beside it.
    /// </summary>
    /// <param name="proposed">The percentage being submitted.</param>
    /// <param name="inForce">
    /// `Activity.ProgressPct` — the reading currently in force, which is the
    /// floor the new one may not fall below.
    /// </param>
    /// <param name="isMilestone">
    /// A milestone is reached or it is not (02 §2): zero basis, zero duration,
    /// excluded from every denominator, so 45% on one would be a number that
    /// earns nothing and means nothing.
    /// </param>
    public static (string Ar, string En)? Refuse(decimal proposed, decimal inForce, bool isMilestone)
    {
        // REFUSED, NOT CLAMPED. Silently turning 140 into 100 would record a
        // number nobody typed against a person's name (04 §9).
        if (proposed < 0m || proposed > 100m)
            return ("نسبة الإنجاز يجب أن تكون بين صفر ومئة.",
                    "Progress must be between 0 and 100.");

        if (isMilestone && proposed is not (0m or 100m))
            return ("الحَدَث الفارق إمّا متحقق (100) أو غير متحقق (0).",
                    "A milestone is either reached (100) or not (0).");

        // المسار 6 step 4 — «ولا تقل عن القراءة السابقة».
        if (proposed < inForce)
            return ($"القراءة {proposed:0.#}% أقل من القراءة السابقة {inForce:0.#}% — "
                    + "لا يُسجَّل تراجع في الإنجاز.",
                    $"A reading of {proposed:0.#}% is below the reading in force {inForce:0.#}% — "
                    + "progress may not be walked back.");

        // A submission that changes nothing is not a reading; it would put a
        // decision in front of a reviewer with nothing to decide.
        if (proposed == inForce)
            return ($"القراءة تساوي القراءة السابقة {inForce:0.#}% — لا جديد لإرساله.",
                    $"The reading equals the one in force ({inForce:0.#}%) — there is nothing to submit.");

        return null;
    }

    /// <summary>
    /// Whether a reading in <paramref name="state"/> is still awaiting a
    /// decision. `approved`, `returned` and `lapsed` are all terminal — a
    /// decided reading is a record, and the way to change it is another reading.
    /// </summary>
    public static bool IsPending(string state) => state == Submitted;
}

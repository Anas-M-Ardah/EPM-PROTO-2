namespace Epm.Api.Data.Entities;

/// <summary>
/// A delivery attempt made for an alert.  The demo deliberately records an
/// outbox-style result instead of pretending that an e-mail or SMS gateway is
/// present.  A production channel adapter can replace the demo dispatcher
/// without changing the alert, its acknowledgement, or its escalation trail.
/// </summary>
public class AlertDelivery
{
    public int Id { get; set; }
    public int AlertId { get; set; }
    public string Channel { get; set; } = "in-app"; // in-app · email · sms
    public string Recipient { get; set; } = "";
    public string Status { get; set; } = "simulated"; // simulated · sent · failed
    public DateTime AttemptedAt { get; set; }
    public string? Detail { get; set; }
}

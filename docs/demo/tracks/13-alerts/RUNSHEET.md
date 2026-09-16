# المسار 13 — إصدار التنبيهات والتصعيد

**Start (proposal):** an alert rule's condition is met at the data date.
**End (proposal):** an alert acknowledged and closed, or escalated to the higher level.
**Target length:** 3 minutes. **Needs:** the demo project from tracks 1–9 (a line left unassigned in track 5 or a
pending change order produces alerts). Record it right after track 9, or leave D-03 unassigned for this take.

## Take 1

| # | Proposal step | Capacity | Action | Must appear | Hold on camera |
|---|---|---|---|---|---|
| 1 | تقييم القواعد عند تاريخ البيانات | مهندس مقيم | demo project → «التنبيهات» | «قواعد التنبيه»: **14 مفعلة من 14** — a new project now receives the rule set (P-268) | the rule count |
| 2 | هل تحقق شرط الإطلاق؟ | same | the inbox | alerts raised at the data date, e.g. R13 «D-03 غير مخصَّص على أنشطة» (warning) or R8 «الأمر التغييري VO-… بانتظار القرار» | the rule code on each row |
| 3 | إصدار التنبيه بدرجة خطورته وقنواته | same | open a rule in «قواعد التنبيه» | severity, channels (داخل النظام / بريد / رسالة), recurrence, «التصعيد بعد … ساعة» | the rule row |
| 4 | إشعار الجهة وبيان الإجراء المطلوب | same | inbox groups «متأخر · اليوم · هذا الأسبوع · لاحقاً» | the bucket and «يحتاج إجراءً» count | the buckets |
| 5 | هل اتُّخذ الإجراء خلال المهلة؟ | — | — | **Not in this build** — nothing measures the escalation deadline | — |
| ٥أ | تصعيد تلقائي | — | — | **Not in this build** | — |
| 6 | معالجة السبب وإقرار التنبيه | same | «إقرار» on the alert | status «مُقَرّ» | the status change |
| 7 | إقفال التنبيه مع بقائه في السجل | الإدارة العليا | side bar «مركز التنبيهات» | the acknowledged alert still listed with «مُقَرّة» counted in the header | the header counts |

## Take 2 — a rule switched off (optional)

On the demo project's «قواعد التنبيه», switch R13 off → its alerts leave the inbox and the header count
drops; switch it on again → they return. This is «إيقاف التنبيهات فور تعطيل قاعدتها».

## Validation takes

| # | Capacity | Action | Must appear |
|---|---|---|---|
| V1 | مهندس مقيم (assigned جامعة بغداد only) | «مركز التنبيهات» | only alerts of projects in جامعة بغداد; alerts of الجامعة المستنصرية are not listed. The server also refuses acknowledging them by id (fixed 2026-09-14, P-267) — not reachable from the screen, so do not stage it |

## Not in this build — do not claim on camera

- **Escalation** (steps 5 and ٥أ) and delivery by e-mail or SMS — the rule's channels and escalation ceiling
  are shown, not executed.
- Alerts are evaluated when a project's «التنبيهات» page is opened; the enterprise «مركز التنبيهات» lists
  what has already been raised.
- Rules R10 and R11 (extension claims) have no computable condition yet.

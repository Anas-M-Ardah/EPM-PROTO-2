# المسار 13 — إصدار التنبيهات والتصعيد

**Start:** a business action leaves a payment certificate at an audit desk, or
another computable rule condition is true at the project data date.
**End:** the alert is acknowledged, with simulated delivery and any due
escalation steps retained as its audit trail.
**Target length:** 4 minutes. **Needs:** the demo project from tracks 1–9 and,
for the primary SLA take, a payment certificate left at an audit desk past its
cap. Record it after track 8 (payment certificate) or track 9 (change order).

## Take 1

| # | Proposal step | Capacity | Action | Must appear | Hold on camera |
|---|---|---|---|---|---|
| 1 | تقييم القواعد عند تاريخ البيانات | مهندس مقيم | demo project → «التنبيهات» | «قواعد التنبيه»: **14 مفعلة من 14** — a new project now receives the rule set (P-268) | the rule count |
| 2 | هل تحقق شرط الإطلاق؟ | same | the inbox | alerts raised at the data date, e.g. R13 «D-03 غير مخصَّص على أنشطة» (warning) or R8 «الأمر التغييري VO-… بانتظار القرار» | the rule code on each row |
| 3 | إصدار التنبيه بدرجة خطورته وقنواته | same | open a rule in «قواعد التنبيه» | severity, channels (داخل النظام / بريد / رسالة), recurrence, «التصعيد بعد … ساعة» | the rule row |
| 4 | إشعار الجهة وبيان الإجراء المطلوب | same | inbox groups «متأخر · اليوم · هذا الأسبوع · لاحقاً» | the bucket and «يحتاج إجراءً» count | the buckets |
| 5 | تشغيل أتمتة العرض | same | select «تشغيل أتمتة العرض» | the recorded simulated delivery and escalation totals; the notice says that no real email or SMS is sent | the delivery / escalation strip |
| ٥أ | تصعيد تلقائي عند استمرار عدم المعالجة | same | run automation against an open alert whose rule ceiling has elapsed | escalation trail advances: مدير المشروع → مدير القسم → الوكيل الفني | the escalation count and latest recipient role |
| 6 | معالجة السبب وإقرار التنبيه | same | «إقرار» on the alert | status «مُقَرّ» | the status change |
| 7 | إقفال التنبيه مع بقائه في السجل | الإدارة العليا | side bar «مركز التنبيهات» | the acknowledged alert still listed with «مُقَرّة» counted in the header | the header counts |

## Take 1A — the primary SLA story: payment audit desk

This is the preferred proof that the alert is the outcome of a real business
deadline, not a manually authored feed row. It follows track 8: register a
payment certificate, release it to an audit desk, and leave the desk open.

| # | Cause → effect | Capacity | Action | Must appear | Hold on camera |
|---|---|---|---|---|---|
| 1 | A certificate enters an accountable desk | مهندس مقيم | register a payment, then open «مهل التدقيق» | the current desk, its received date and its SLA cap | the route card |
| 2 | The desk exceeds its cap | same | use the fixture's already overdue audit stage, or advance the controlled project data date past the cap | elapsed days greater than cap; the desk state is overdue | elapsed vs cap |
| 3 | R12 evaluates the breach | same | project → «التنبيهات» | R12 «تجاوز مهلة تدقيق المعاملة» / Payment audit desk SLA breached, due now and needing action | R12 code and bucket |
| 4 | The rule determines delivery | same | «القواعد» → R12, then «تشغيل أتمتة العرض» | critical severity, configured in-app/email/SMS channels, 48-hour ceiling, and simulated delivery entries | R12 rule then automation strip |
| 5 | A missed notification escalates | same | keep the alert open and run automation after its ceiling | escalation recipients in order: project manager, department manager, technical deputy | escalation count |
| 6 | A human accepts responsibility | same | return to inbox → «إقرار» | acknowledgement attributed to the acting persona; no further escalation is created for that alert | acknowledged status |

## Take 2 — a rule switched off (optional)

On the demo project's «قواعد التنبيه», switch R13 off → its alerts leave the inbox and the header count
drops; switch it on again → they return. This is «إيقاف التنبيهات فور تعطيل قاعدتها».

## Validation takes

| # | Capacity | Action | Must appear |
|---|---|---|---|
| V1 | مهندس مقيم (assigned جامعة بغداد only) | «مركز التنبيهات» | only alerts of projects in جامعة بغداد; alerts of الجامعة المستنصرية are not listed. The server also refuses acknowledging them by id (fixed 2026-09-14, P-267) — not reachable from the screen, so do not stage it |

## Demo boundary — say this on camera

- Delivery entries are **simulated and persisted**. The demo does not send a
  real e-mail or SMS and has no external gateway credentials.
- Automation is run explicitly from the project Alerts tab for a controlled
  demonstration; it is not yet a background scheduler.
- Rules R10 and R11 (extension claims) have no computable condition yet.

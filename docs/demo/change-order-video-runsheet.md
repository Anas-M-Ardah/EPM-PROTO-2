# Change-order video runsheet

Recording plan for an Arabic walkthrough of the change-order feature. This is a **shot list**, not a QA sign-off. Rehearse each take in the running app before recording; screen labels and figures take precedence over this sheet if a fixture changes.

## The story

**Audience promise:** an order can be proposed, reviewed, approved, and applied without confusing a proposal with an effective contract change. The same workflow also handles supply orders, but names the appropriate parties.

**Target length:** 6-8 minutes for the main cut. Use the optional creation and application takes only after a rehearsal and reset.

**Recording language:** Arabic UI and Arabic narration. Keep IDs, quantities, and dates visible long enough to read. Do not translate English browser or operating-system controls on camera.

## Preflight, off camera

1. Start the API on `http://localhost:5080` and the web app on `http://localhost:4300`. Use a 1440 x 900 or larger browser window at 100% zoom; keep the app full width and close developer tools, notifications, and unrelated tabs.
2. Use demo data only. The fixture's project data date is **2026-08-02**; it is not today's date. Figures are illustrative, not ministry data.
3. Reset to a known fixture **before filming** if it is safe to discard local demo changes: `POST /api/dev/reset`, then `POST /api/dev/load-fixture`. Never reset a workspace containing data you need to keep. A reset removes orders created during the rehearsal.
4. Confirm `PRJ-0279` shows the seeded works orders, including `VO-01`, `VO-02`, and approved-but-unapplied `VO-05`; confirm `PRJ-0439` has supply order `VO-08`. If these anchors differ, stop and update the shot list rather than improvising numeric claims.
5. Set the persona to **المستخدم المختص في الجامعة** for the opening. Prepare the personas **مهندس مقيم**, **عضو لجنة تثبيت الأسعار**, and **مقرّر لجنة أوامر الغيار** in the switcher. Rehearse the record tabs and browser back path once.
6. For any take that creates or applies an order, capture a clean fixture first and reset again before the next take. Do not run the works-side from-scratch scenario in `docs/demo/runsheet.html` and the fixture scenario in the same reset cycle.

## Main cut: read-only story

| Time | Picture and click path | Arabic narration cue | Hold on screen / cut note |
| --- | --- | --- | --- |
| 0:00-0:35 | `المشاريع` → `PRJ-0279` (مجمع الكليات الطبية) → `الأوامر التغييرية`. Show the register, status, value/time columns, filters, and new-order action. | «هذه شاشة الأوامر التغييرية. نرى حالة كل أمر، أثره المالي والزمني، ومن تقع عليه الخطوة التالية، دون فتح كل سجل.» | Hold the full register for 3 seconds. Do not claim every value is already effective. |
| 0:35-1:10 | Use `العرض بصفة`: university specialist, then **مهندس مقيم**. Show the scope banner and `بانتظار إجرائي` change. | «الصلاحيات تأتي من الصفة ومساحة العمل. عندما نغيّر الصفة، تتغير الأوامر التي تنتظر إجراءنا؛ القرار يُحسم في الخادم وليس بإخفاء زر فقط.» | On the seeded fixture, RE is expected to have `VO-03`, `VO-04`, and `VO-05` awaiting action. If the count differs, narrate the visible result instead of quoting a number. |
| 1:10-2:00 | Open `VO-05` → `الملخص`. Frame the contractor, RE department, and approved comparison, plus the pending amendment. | «هنا ثلاثة أرقام مختلفة: مقترح المقاول، ومقترح دائرة المهندس المقيم، ثم القيمة التي اعتمدتها لجنة التسعير. الاعتماد لا يغيّر العقد بعد.» | Seeded example: 3,738,000 / 3,375,000 / **3,000,000 IQD** and approved **12 days**. Hold the approved-versus-proposed labels. |
| 2:00-2:35 | On `VO-05`, show the projected contract value, then open `العقود` → `CNT-0279` and its effective value. Return to `VO-05`. | «قيمة العقد النافذة ما زالت 250 مليون دينار. الزيادة المعتمدة، 3 ملايين، معلقة حتى يُطبَّق الأمر؛ العرض التقديري ليس ملحقاً نافذاً.» | Expected before apply: **250,000,000 IQD** effective, **253,000,000 IQD** projected. If not visible, cut this comparison rather than substitute a screenshot. |
| 2:35-3:15 | Open `VO-01` → `الكميات والكلفة`; find `BQ-006` and frame the original quantity and the three proposal/approval columns. | «حد العشرين بالمئة يُقاس من الكمية الأصلية للبند، لا من كل مقترح على حدة. في هذا المثال الأصل 1,400 متر مكعب، وحد الزيادة 280؛ الكمية الزائدة وحدها تأخذ سعرها المثبّت.» | Hold **1,400**, **280**, and the distinct contractor/RE/approved excess quantities. Avoid narrating hand-calculated totals. |
| 3:15-3:55 | Open `VO-02` as **مقرّر لجنة أوامر الغيار**; show the read-only explanation. Switch to **عضو لجنة تثبيت الأسعار** and show the permitted decision panel. Do not submit a decision. | «المقرر يستطيع تسجيل مراسلات الجهات الخارجية، لكنه لا يعتمد مرحلة لجنة التسعير نيابة عنها. عندما ندخل بصفة اللجنة المالكة للمرحلة تظهر قراراتها.» | Cut immediately after showing the different actions. A delegate records an external outcome through its separate control. |
| 3:55-4:30 | Open `VO-05` → `المسار` and `السجل`. Show the six-stage chain, skipped stages with reasons, then actor/time/before/after entries. | «كل مرحلة لها مالك، وكل إجراء يبقى في السجل مع الفاعل والوقت والقيمة قبل التغيير وبعده. المرحلة غير المنطبقة تظهر بسببها؛ لا تختفي من المسار.» | Do not claim the audit's new version/snapshot persistence has passed QA until its test-project dependency is resolved. Show only what the UI actually renders. |
| 4:30-5:10 | Switch to `PRJ-0439` → `الأوامر التغييرية` → `VO-08`. Show `المسار`, then `الكميات والكلفة` and the beneficiary transfer. | «الأمر التجهيزي يستخدم المسار نفسه، لكن الجهة المالكة لدراسة الطلب والتنفيذ هي لجنة الفحص والاستلام. وهذه الحالة تنقل عشر وحدات بين جهتين مستفيدتين دون تغيير قيمة العقد.» | Seeded `VO-08`: `ITM-006`, ten servers transferred from جامعة بغداد to الجامعة التكنولوجية. Do **not** generalize this record's skipped pricing stage: new orders use the current pricing rule. |
| 5:10-5:25 | Return to a calm register or record summary. | «المحصلة: المقترحات تبقى منفصلة، الموافقة لا تعني التطبيق، والصلاحيات والتتبع يرافقان الأمر حتى أثره على العقد.» | End before switching personas again. |

## Optional take A: creation wizard, after a fresh reset

Use this as a second clip or insert, not in the middle of the read-only sequence. Start on `PRJ-0439/changeorders` so the supply fork is visible. **Save a draft, do not submit a new order for approval unless the complete role sequence has been rehearsed.** The generated order number is dynamic; never script it as `VO-09`.

| Shot | Operator action | Narration / expected evidence |
| --- | --- | --- |
| A1 | Click `أمر تغييري جديد`. On step 1, click Next with required fields blank. | «التحقق يحدد الحقل الناقص وينقلنا إليه.» Show focus/scroll and inline messages; do not linger on an error banner alone. |
| A2 | Choose `CNT-0439`, select the available supply type, enter a short justification and an illustrative incoming letter number/date. | «العقد يحدد البنود والأنشطة المتاحة، ولا يمكن تغييره بصمت بعد اختيار بنود.» Do not use a real letter number or personal information. |
| A3 | Step 2: open the item **drawer**, search for `ITM-007`, add it, close the drawer, choose a change type, and enter both proposal figures. | «المقترحان منفصلان، والحساب المعروض يأتي من المعاينة الخادمية.» Use values rehearsed against the current fixture; do not promise a specific amount before preview loads. |
| A4 | Step 3: wait for the server preview and point at the net, threshold note, and any blocking issue. | «المعاينة لا تصدر موافقة ولا تعدل العقد.» If the preview blocks submission, keep that as an honest validation example; do not edit around it on camera. |
| A5 | Step 4: demonstrate the Arabic upload zone with a harmless demo file, or skip attaching a file. Step 5: show review and choose **حفظ كمسودة**. | «المرفقات تصنَّف، ثم نراجع الأمر كاملاً قبل الإرسال.» Do not suggest file bytes are stored if the UI says only name/category/size are recorded. |

## Optional take B: applying an already approved order, last and isolated

Only film this after a fresh fixture reset and after rehearsing the confirmation. As **مهندس مقيم**, open `PRJ-0279/changeorders/VO-05`. Capture the pending amendment and **250,000,000 IQD** effective contract value first. Then use `تطبيق الأمر` and confirm once. Hold the nine application steps, return to `CNT-0279`, and capture **253,000,000 IQD** effective value and the applied amendment. This take mutates the fixture; reset before another recording. If the apply action is unavailable or fails, stop the take and record the failure for follow-up rather than claiming a successful application.

## Cases covered and guardrails

| Case | Where it appears | What must not be implied |
| --- | --- | --- |
| Persona and workspace gating | Register + `VO-02` | A recorder is not a stage approver. |
| Proposal vs approved figures | `VO-05` | The RE or contractor proposal is not the committee-approved value. |
| Approved vs effective | `VO-05` + `CNT-0279` | Approval alone does not amend the contract. |
| Original-quantity 20% threshold | `VO-01` / `BQ-006` | The 20% basis does not reset for each proposal. |
| Six stages, external parties, audit | `VO-05` | An external party is a status inside a stage, not a seventh stage. |
| Supply variant and redistribution | `VO-08` | One seeded skipped stage is not a general rule for all supply orders. |
| Field validation, picker drawer, preview, attachments | Optional take A | A preview is not an approval or application. |
| Apply and contract effect | Optional take B | Never demonstrate this on data that cannot be reset. |

## Recording notes

- Capture each section as a separate take. Keep the cursor still during narration and pause 2-3 seconds on each key comparison before clicking.
- If a seeded figure, label, or permission differs, narrate the visible state and mark the planned claim for revision. Do not force the app to match a dated script.
- Do not show real credentials, request headers, developer tools, raw database records, or a personal browser profile.
- Keep this runsheet beside, not instead of, [`change-orders-runsheet.html`](change-orders-runsheet.html). That older page is a test ledger and contains historical claims that should not be read verbatim in the video. The general setup plan is [`runsheet.html`](runsheet.html).

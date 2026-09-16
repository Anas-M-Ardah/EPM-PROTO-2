# المسار 12 — إدارة الوثائق والمخططات

**Start (proposal):** the document or drawing becomes available.
**End (proposal):** an approved revision saved in the record without replacing what preceded it.
**Target length:** 4 minutes. **Uses the fixture:** `PRJ-0279` «مجمع الكليات الطبية» · document
**`ST-DR-001`** «مخطط الأساسات» (R1, draft) for approval, and **`ME-DR-002`** «مخطط التمديدات الصحية» (R1, draft)
for rejection · the file [`ST-DR-001-R2.pdf`](ST-DR-001-R2.pdf).

## Take 1 — issue, approve

| # | Proposal step | Capacity | Action | Must appear | Hold on camera |
|---|---|---|---|---|---|
| 1 | رفع الوثيقة وتصنيفها حسب التخصص | المستخدم المختص في الجامعة | `PRJ-0279` → «الوثائق و المخططات» → folder «إنشائي» → `ST-DR-001` → «رفع مراجعة» | the upload form | the discipline folder |
| 2 | ربطها بالمشروع | same | جهة الإصدار `قسم التصميم — الجامعة` · رقم التحويل `TR-DEMO-01` · الوصف `تعديل أبعاد القواعد` · الملف `ST-DR-001-R2.pdf` → «رفع» | toast «أُضيفت المراجعة R2 — المراجعة السابقة محفوظة ومعلَّمة كملغاة» | the toast |
| 3 | تحقق: لا تكرار في الاسم والإصدار | same | (validation V1) | — | — |
| 4 | إنشاء مراجعة جديدة وتعليم السابقة «ملغاة» | same | tab «المراجعات» | R2 «الحالية · مسوّدة» above R1 «ملغاة»; register «R2 · TR-DEMO-01 · مسوّدة» | both revisions |
| 5 | قرار الاعتماد | **مهندس مقيم** | switch capacity; open `ST-DR-001` | on R2 only: «رفض المراجعة» and «اعتماد المراجعة» (new, P-267); nothing on R1 | the two buttons |
| 6 | اعتماد المراجعة | مهندس مقيم | «اعتماد المراجعة» | toast «اعتُمدت المراجعة R2»; pill «معتمد»; status chip counts «معتمد» +1, «مسوّدة» −1 | the chip counts |
| 7 | إتاحة الوثيقة للبحث بتاريخها الكامل | same | toggle «آخر مراجعة فقط» off; search `ST-DR-001` | both R1 and R2 rows with their dates and transmittals | the full history |

## Take 2 — reject with a reason (٥أ)

| # | Capacity | Action | Must appear |
|---|---|---|---|
| ٥أ | مهندس مقيم | `ME-DR-002` → R1 → «رفض المراجعة» → leave the reason empty | «تأكيد الرفض» stays disabled |
| ٥أ | مهندس مقيم | reason `المخطط لا يطابق مسار الأنابيب المنفّذ` → «تأكيد الرفض» | toast «رُفضت المراجعة R1»; pill «مرفوض»; «سبب القرار: …» under the revision; chip «مرفوض 1» |

## Validation takes

| # | Capacity | Action | Must appear |
|---|---|---|---|
| V1 | المستخدم المختص في الجامعة | «رفع مراجعة» on `ST-DR-001` again with رقم التحويل `TR-DEMO-01` | «مراجعة بنفس رقم التحويل «TR-DEMO-01» أو اسم الملف … مسجَّلة لهذه الوثيقة — لا تكرار» |
| V2 | المستخدم المختص في الجامعة | open R2 before step 5 | no approve / reject buttons — the decision belongs to دائرة المهندس المقيم or مدير المشروع |
| V3 | مهندس مقيم | after step 6, open R2 again | no buttons — a decided revision is a record |

## Not in this build

- Registering a brand-new document code (only new revisions of existing documents), file-format
  checks, preview and markups.
- Linking a document to a contract, change order or supply item (step 2 links to the project).

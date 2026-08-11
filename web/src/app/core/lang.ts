import { Injectable, signal, effect } from '@angular/core';

export type Lang = 'ar' | 'en';

/**
 * ARABIC IS PRIMARY, not a translation layer (05 §5.1, handoff non-negotiable #7).
 * `ar` is the default and the document starts in RTL.
 *
 * Strings live here as { ar, en } pairs — the same shape as STR in the reference
 * prototype's data.jsx, so a label can be copied across verbatim.
 *
 * Enum and lookup labels do NOT belong here — those come from the Lookups table
 * with NameAr/NameEn columns (06), because business people maintain them.
 * This map is UI chrome only.
 */
const STR = {
  app_name:        { ar: 'EPM',                            en: 'EPM' },
  app_title:       { ar: 'نظام إدارة المشاريع الهندسية',   en: 'Engineering Projects Management' },
  ministry:        { ar: 'وزارة التعليم العالي و البحث العلمي', en: 'Ministry of Higher Education & Scientific Research' },
  /** Breadcrumb root (v1.1 Z2). The full ministry name is too long for a crumb. */
  ministry_short:  { ar: 'الوزارة',                          en: 'Ministry' },
  dept:            { ar: 'دائرة الإعمار و المشاريع',        en: 'Reconstruction & Projects Dept.' },

  // navigation
  nav_portfolio:   { ar: 'النظرة العامة',                  en: 'Portfolio' },
  nav_projects:    { ar: 'المشاريع',                       en: 'Projects' },
  /** Enterprise scope (no workspace selected). Verbatim from data.jsx:245. */
  nav_projects_all:{ ar: 'كل المشاريع',                    en: 'Projects' },
  /** The WORKSPACE contract tab (SCR-W3) — a project's contracts and their addendums. */
  nav_contracts:   { ar: 'العقود و الملاحق',               en: 'Contracts & Addendums' },
  /** Enterprise scope (SCR-E3), the cross-portfolio list. Verbatim from data.jsx.
   *  Same split as nav_projects / nav_projects_all — the enterprise screen has
   *  its own shorter label and `DContractsAll` uses it for the title, the
   *  breadcrumb AND the nav item (desktop-shell.jsx:166). */
  nav_contracts_all:{ ar: 'العقود',                        en: 'Contracts' },
  /** Verbatim from data.jsx:235 — was 'ضبط الجدولة', which is not the
   *  reference's wording. */
  nav_schedule:    { ar: 'ضبط الجداول الزمنية',            en: 'Schedule Control' },
  nav_alerts:      { ar: 'مركز التنبيهات',                 en: 'Alerts Center' },
  nav_reports:     { ar: 'التقارير و التحليلات',           en: 'Reports & Analytics' },
  nav_group_ops:   { ar: 'العمليات',                       en: 'Operations' },
  nav_group_gov:   { ar: 'الحوكمة',                        en: 'Governance' },

  // projects list — labels ported from DProjectsAll (enterprise-areas.jsx:112)
  projects_sub:    { ar: 'كل المشاريع عبر التشكيلات والجامعات', en: 'All projects across entities & universities' },
  search_projects: { ar: 'بحث في المشاريع…',               en: 'Search projects…' },
  col_project:     { ar: 'المشروع',                        en: 'Project' },
  col_workspace:   { ar: 'مساحة العمل',                    en: 'Workspace' },
  col_branch:      { ar: 'الفرع',                          en: 'Branch' },
  col_status:      { ar: 'الحالة',                         en: 'Status' },
  col_physical:    { ar: 'الإنجاز',                        en: 'Physical' },
  col_cost:        { ar: 'الكلفة',                         en: 'Cost' },
  col_updated:     { ar: 'آخر تحديث',                      en: 'Updated' },
  all:             { ar: 'الكل',                           en: 'All' },
  showing:         { ar: 'مشروع',                          en: 'projects' },

  // contracts list — ported from DContractsAll (v1.1, enterprise-areas.jsx:299)
  contracts_sub:   { ar: 'كل العقود عبر المحفظة',          en: 'All contracts across the portfolio' },
  search_contracts:{ ar: 'بحث في العقود…',                 en: 'Search contracts…' },
  col_code:        { ar: 'الرمز',                          en: 'Code' },
  col_contract:    { ar: 'العقد',                          en: 'Contract' },
  col_contractor:  { ar: 'المقاول',                        en: 'Contractor' },
  col_start:       { ar: 'المباشرة',                       en: 'Start' },
  col_finish:      { ar: 'الإنجاز',                        en: 'Finish' },
  col_financial:   { ar: 'الإنجاز المالي',                 en: 'Financial' },
  col_value:       { ar: 'قيمة العقد (د.ع)',               en: 'Value (IQD)' },
  /** Prefix for the superseded contractual finish — never a strikethrough (04 §6). */
  was:             { ar: 'كان',                            en: 'was' },
  /** Signed delta of the APPLIED amendments against the awarded value. */
  amended:         { ar: 'ملاحق مطبَّقة',                   en: 'amended' },
  /** 02 §9 — approved but NOT applied. A projection, never part of the value. */
  pending_apply:   { ar: 'بانتظار التطبيق',                en: 'awaiting application' },
  empty_contracts_t:{ ar: 'لا توجد عقود بعد',              en: 'No contracts yet' },
  empty_contracts_b:{ ar: 'حمّل بيانات العرض من شاشة المشاريع.', en: 'Load the demo fixture from the Projects screen.' },

  // entities list — ported from DSpaces (v1.1, desktop-views.jsx:375).
  // `adm_ws` / `ws_sub` / `ws_showing` in the reference; renamed to the
  // screen's own name here since 04 §2 calls it Entities.
  nav_entities:    { ar: 'مساحات العمل',                   en: 'Workspaces' },
  entities_sub:    { ar: 'الجامعات و التشكيلات التي تملك المشاريع', en: 'The universities and units that own the projects' },
  search_entities: { ar: 'ابحث بالاسم أو الرمز…',          en: 'Search by name or code…' },
  entities_showing:{ ar: 'مساحة عمل',                      en: 'workspaces' },
  col_entity:      { ar: 'مساحة العمل',                    en: 'Workspace' },
  col_type:        { ar: 'النوع',                          en: 'Type' },
  col_active:      { ar: 'النشطة',                         en: 'Active' },
  col_completion:  { ar: 'نسبة الإنجاز',                   en: 'Completion' },
  empty_entities_t:{ ar: 'لا توجد مساحات عمل بعد',         en: 'No workspaces yet' },
  empty_entities_b:{ ar: 'حمّل بيانات العرض من شاشة المشاريع.', en: 'Load the demo fixture from the Projects screen.' },

  // executive portfolio — ported from DDashboard (v1.1, desktop-views.jsx:45)
  portfolio_sub:   { ar: 'الوضع التعاقدي عبر المحفظة',      en: 'The contractual position across the portfolio' },
  kpi_projects:    { ar: 'المشاريع',                        en: 'Projects' },
  kpi_active_suffix:{ ar: 'قيد التنفيذ',                    en: 'running' },
  kpi_contracts:   { ar: 'العقود',                          en: 'Contracts' },
  kpi_effective_value:{ ar: 'القيمة النافذة (د.ع)',         en: 'Effective value (IQD)' },
  kpi_effective_foot:{ ar: 'الأصلية + الملاحق المطبَّقة',    en: 'original + applied amendments' },
  kpi_delayed:     { ar: 'المتأخرة',                        en: 'Delayed' },
  kpi_applied_amd: { ar: 'ملاحق مطبَّقة',                    en: 'Applied amendments' },
  portfolio_by_status:{ ar: 'المشاريع حسب الحالة',          en: 'Projects by status' },
  portfolio_by_entity:{ ar: 'القيمة النافذة حسب مساحة العمل', en: 'Effective value by workspace' },
  /** 02 §9 — stated as a projection, never folded into any figure. */
  portfolio_pending_note:{ ar: 'معتمد بانتظار التطبيق — غير مضاف إلى القيمة النافذة:', en: 'Approved and awaiting application — NOT included in the effective value:' },
  portfolio_unavailable:{ ar: 'مؤشرات غير متوفرة بعد',      en: 'Indicators not available yet' },
  unavailable:     { ar: 'غير متوفر',                       en: 'Unavailable' },
  kpi_physical:    { ar: 'الإنجاز المادي',                  en: 'Physical progress' },
  kpi_financial:   { ar: 'الإنجاز المالي',                  en: 'Financial progress' },
  kpi_spi:         { ar: 'مؤشر أداء الجدول (SPI)',          en: 'Schedule performance (SPI)' },
  kpi_cpi:         { ar: 'مؤشر أداء الكلفة (CPI)',          en: 'Cost performance (CPI)' },
  empty_portfolio_t:{ ar: 'لا توجد بيانات بعد',             en: 'No data yet' },
  empty_portfolio_b:{ ar: 'حمّل بيانات العرض من شاشة المشاريع.', en: 'Load the demo fixture from the Projects screen.' },

  // alerts center — ported from DAlertsCenter (v1.1, enterprise-areas.jsx:106).
  // The severity, kind and status LABELS are not here: they are stored codes and
  // come from the Lookups addendum (P-26), like every other enum in the app.
  alerts_sub:      { ar: 'التنبيهات والتصعيد عبر المحفظة',  en: 'Portfolio-wide alerts & escalation' },
  search_alerts:   { ar: 'بحث في التنبيهات…',               en: 'Search alerts…' },
  col_alert:       { ar: 'التنبيه',                         en: 'Alert' },
  col_source:      { ar: 'المصدر',                          en: 'Source' },
  col_severity:    { ar: 'الخطورة',                         en: 'Severity' },
  col_raised:      { ar: 'التاريخ',                         en: 'Raised' },
  /** Screen-reader name for the row-action column; the reference leaves it blank. */
  col_action:      { ar: 'إجراء',                           en: 'Action' },
  /**
   * Severity as a GROUP heading — the cards and the filter chips. Feminine
   * plural, agreeing with «تنبيهات». One alert's severity is the masculine
   * singular (حرِج) and comes from the `alert-severity` lookup instead; the
   * reference makes exactly this split (ALERT_SEV vs the inline card array).
   */
  sev_critical:    { ar: 'حرِجة',                           en: 'High' },
  sev_warning:     { ar: 'متوسطة',                          en: 'Medium' },
  sev_info:        { ar: 'منخفضة',                          en: 'Low' },
  sev_open:        { ar: 'مفتوحة',                          en: 'Open' },
  /** The CARD spells the top severity out; the chip stays short so the chip row
   *  does not wrap. Only the top one differs, and only in English — verbatim
   *  from the reference, which makes exactly this one exception. */
  sev_critical_card:{ ar: 'حرِجة',                          en: 'High severity' },
  alerts_unack:    { ar: 'غير مُقَرّة',                      en: 'Unacknowledged' },
  alerts_ack:      { ar: 'مُقَرّة',                          en: 'Acknowledged' },
  alerts_do_ack:   { ar: 'إقرار',                           en: 'Ack' },
  alerts_reopen:   { ar: 'إعادة فتح',                       en: 'Reopen' },
  /** An alert with no project belongs to the portfolio, not to nothing. */
  scope_enterprise:{ ar: 'على مستوى الوزارة',               en: 'Ministry-wide' },
  empty_alerts_t:  { ar: 'لا توجد تنبيهات',                 en: 'No alerts' },
  empty_alerts_b:  { ar: 'حمّل بيانات العرض من شاشة المشاريع.', en: 'Load the demo fixture from the Projects screen.' },

  // schedule control — ported from DScheduleControl (v1.1, enterprise-areas.jsx:8).
  // The sc_* keys are verbatim from the reference's own STR map (data.jsx:237).
  schedule_sub:    { ar: 'صحة الجداول الزمنية عبر المحفظة', en: 'Portfolio-wide schedule health' },
  sc_avg_delay:    { ar: 'متوسط التأخر',                    en: 'Avg. delay' },
  sc_delayed:      { ar: 'مشاريع متأخرة',                   en: 'Delayed projects' },
  sc_critical:     { ar: 'أنشطة حرجة',                      en: 'Critical activities' },
  sc_ontrack:      { ar: 'ضمن الجدول',                      en: 'On track' },
  sc_import_status:{ ar: 'حالة الاستيراد',                  en: 'Import status' },
  /** Neither delayed nor on track — no contract, or no forecast recorded. */
  sc_no_schedule:  { ar: 'بلا موقف زمني',                   en: 'No schedule position' },
  sc_no_schedule_note:{ ar: 'مشاريع بلا موقف زمني — غير محسوبة ضمن المتأخرة ولا ضمن ما هو ضمن الجدول:', en: 'Projects with no schedule position — counted in neither delayed nor on track:' },
  /** Fallback only; the real reason ships from the server beside the rule. */
  sc_critical_needs:{ ar: 'يتطلب جدول الأنشطة وعلاقات التتابع.', en: 'Needs the activity schedule and its dependencies.' },
  col_baseline_finish:{ ar: 'إنجاز مخطط',                   en: 'Baseline finish' },
  col_forecast_finish:{ ar: 'إنجاز متوقع',                  en: 'Forecast' },
  empty_schedule_t:{ ar: 'لا توجد مشاريع بعد',              en: 'No projects yet' },
  empty_schedule_b:{ ar: 'حمّل بيانات العرض من شاشة المشاريع.', en: 'Load the demo fixture from the Projects screen.' },

  // reports & analytics — ported from DReports (v1.1, desktop-reports.jsx:58).
  // The report TITLES, descriptions, categories, scopes and frequencies are NOT
  // here: they are the catalog's own definition and ship with the row from
  // Features/Reports/ReportCatalog.cs. Only the chrome around them is here.
  rpt_scheduled:   { ar: 'المجدولة',                        en: 'Scheduled' },
  rpt_custom:      { ar: 'تقرير مخصّص',                     en: 'Custom report' },
  search_reports:  { ar: 'بحث في التقارير…',                en: 'Search reports…' },
  rpt_all_projects:{ ar: 'كل المشاريع',                     en: 'All projects' },
  /** The empty-database state of the scope dropdown — stated, not a blank list. */
  rpt_no_projects: { ar: 'لا مشاريع بعد',                   en: 'No projects yet' },
  rpt_scope_to:    { ar: 'تحديد نطاق المشروع',              en: 'Scope to project' },
  rpt_scoped_to:   { ar: 'النطاق:',                         en: 'Scoped to:' },
  rpt_scoped_note: { ar: 'تُعرض التقارير القابلة للتشغيل على مستوى المشروع.', en: 'showing reports that run at project level.' },
  rpt_run:         { ar: 'تشغيل',                           en: 'Run' },
  /** The row-action cell of a report the system cannot produce yet. The reason
   *  itself ships from the server beside the catalog that owns it. */
  rpt_unavailable: { ar: 'غير متاح',                        en: 'Unavailable' },
  col_report:      { ar: 'التقرير',                         en: 'Report' },
  col_category:    { ar: 'التصنيف',                         en: 'Category' },
  col_scope:       { ar: 'النطاق',                          en: 'Scope' },
  col_format:      { ar: 'الصيغة',                          en: 'Format' },
  col_frequency:   { ar: 'الدورية',                         en: 'Frequency' },
  col_last_run:    { ar: 'آخر تشغيل',                       en: 'Last run' },
  empty_reports_t: { ar: 'لا تقارير مطابقة',                en: 'No matching reports' },
  empty_reports_b: { ar: 'جرّب تصنيفاً أو كلمة بحث أخرى.',   en: 'Try another category or search term.' },

  // ── PHASE 3 · the project workspace ────────────────────────────────────
  // Module rail labels and groups — ported from PROJECT_MODULES + MOD_GROUPS,
  // ../epm@design/system-revamp app/data.jsx:445, app/desktop-workspace.jsx:112.
  mod_overview:    { ar: 'نظرة عامة',                      en: 'Overview' },
  mod_information: { ar: 'معلومات المشروع',                en: 'Project Information' },
  mod_contract:    { ar: 'العقود و الملاحق',               en: 'Contracts & Addendums' },
  mod_boq:         { ar: 'جدول الكميات',                   en: 'BOQ' },
  mod_financials:  { ar: 'الموقف المالي',                  en: 'Financials' },
  mod_schedule:    { ar: 'الجدول الزمني',                  en: 'Schedule' },
  mod_progress:    { ar: 'الإنجاز',                        en: 'Progress' },
  mod_changeorders:{ ar: 'الأوامر التغييرية',              en: 'Change Orders' },
  mod_risk:        { ar: 'المخاطر',                        en: 'Risk' },
  mod_model:       { ar: 'المجسم ثلاثي الأبعاد',           en: '3D Model' },
  mod_meetings:    { ar: 'الاجتماعات و الإجراءات',         en: 'Meetings & Actions' },
  mod_documents:   { ar: 'الوثائق و المخططات',             en: 'Documents & Drawings' },
  mod_alerts:      { ar: 'التنبيهات',                      en: 'Alerts' },
  mod_reports:     { ar: 'التقارير',                       en: 'Reports' },
  mod_audit:       { ar: 'سجل التدقيق',                    en: 'Audit History' },
  mod_group_definition: { ar: 'التعريف',                   en: 'Definition' },
  mod_group_execution:  { ar: 'التنفيذ و المتابعة',        en: 'Execution' },
  mod_group_records:    { ar: 'السجلات و الوثائق',         en: 'Records' },
  mod_group_oversight:  { ar: 'الرقابة',                   en: 'Oversight' },
  select_project:  { ar: 'اختر مشروعاً',                   en: 'Select a project' },

  // SCR-W1 Overview — ported from DModOverview (project-modules.jsx:2512)
  ovw_contracts:   { ar: 'عقود المشروع',                   en: 'Project contracts' },
  ovw_contracts_sub:{ ar: 'قيمة المشروع هي مجموع القيم النافذة لعقوده', en: 'Project value is the sum of its contracts\' effective values' },
  /** SCR-E3's `col_value` is the awarded figure; this column is the one in
   *  force (BR-09), and calling them the same thing would hide the difference
   *  this screen exists to show. */
  col_effective_value:{ ar: 'القيمة النافذة',              en: 'Effective value' },
  col_delay:       { ar: 'التأخر',                         en: 'Delay' },
  /** The awarded figure, shown BESIDE the effective one — never struck through. */
  ovw_awarded:     { ar: 'المحالة',                        en: 'awarded' },
  ovw_was:         { ar: 'كانت',                           en: 'was' },
  ovw_pending:     { ar: 'ملاحق معتمدة غير مطبَّقة:',       en: 'approved, not applied:' },
  ovw_projection:  { ar: 'إسقاط القيمة عند التطبيق:',       en: 'Value if applied:' },
  ovw_projection_note:{ ar: 'ملاحق معتمدة لم تُطبَّق بعد — غير مضافة إلى القيمة النافذة', en: 'approved amendments not yet applied — not included in the effective value' },
  ovw_no_contracts_t:{ ar: 'لا يوجد عقد لهذا المشروع',      en: 'This project has no contract' },
  ovw_no_contracts_b:{ ar: 'يُسجَّل المشروع قبل الإحالة؛ لا قيمة تعاقدية له حتى ذلك الحين.', en: 'A project is registered before it is awarded; until then it has no contractual value.' },
  ovw_beneficiaries:{ ar: 'الجهات المستفيدة',              en: 'Beneficiaries' },
  ovw_beneficiaries_sub:{ ar: 'الجهات المخوّلة باستلام الكميات', en: 'The bodies entitled to receive quantity' },
  ovw_no_beneficiaries_t:{ ar: 'لا جهات مستفيدة مسجَّلة',   en: 'No beneficiaries recorded' },
  ovw_no_beneficiaries_b:{ ar: 'لا يمكن توزيع الكميات حتى تُسجَّل جهة مستفيدة واحدة على الأقل.', en: 'Quantity cannot be distributed until at least one is recorded.' },
  ovw_inactive:    { ar: 'غير نشطة',                       en: 'Inactive' },
  ovw_alerts:      { ar: 'التنبيهات المفتوحة',             en: 'Open alerts' },
  ovw_alerts_sub:  { ar: 'التنبيهات غير المُقَرّة لهذا المشروع', en: 'Unacknowledged alerts on this project' },
  ovw_no_alerts:   { ar: 'لا توجد تنبيهات مفتوحة.',        en: 'No open alerts.' },

  // SCR-W2 Information — field labels. The GROUPING is the endpoint's; only
  // the labels are here, because a label is chrome (see information.page.ts).
  inf_group_identity: { ar: 'هوية المشروع',                en: 'Project identity' },
  inf_group_location: { ar: 'الموقع',                      en: 'Location' },
  inf_group_funding:  { ar: 'التمويل و الأولوية',          en: 'Funding & priority' },
  inf_group_parties:  { ar: 'الأطراف',                     en: 'Parties' },
  inf_id:          { ar: 'رقم المشروع',                    en: 'Project number' },
  inf_nameAr:      { ar: 'الاسم بالعربية',                 en: 'Name (Arabic)' },
  inf_nameEn:      { ar: 'الاسم بالإنجليزية',              en: 'Name (English)' },
  inf_type:        { ar: 'نوع المشروع',                    en: 'Project type' },
  inf_status:      { ar: 'الحالة',                         en: 'Status' },
  inf_executionStage:{ ar: 'مرحلة التنفيذ',                en: 'Execution stage' },
  inf_updatedAt:   { ar: 'آخر تحديث',                      en: 'Last updated' },
  inf_workspaceCode:{ ar: 'مساحة العمل',                   en: 'Workspace' },
  inf_region:      { ar: 'المنطقة',                        en: 'Region' },
  inf_branch:      { ar: 'الفرع',                          en: 'Branch' },
  inf_fundingType: { ar: 'نوع التمويل',                    en: 'Funding type' },
  inf_priority:    { ar: 'الأولوية',                       en: 'Priority' },
  /** D-06 — the project's own "now". Every date on its screens is measured
   *  against it, and this is the only screen that states what it is. */
  inf_dataDate:    { ar: 'تاريخ البيانات',                 en: 'Data date' },
  inf_executor:    { ar: 'الجهة المنفّذة',                 en: 'Executor' },
  inf_designerParty:{ ar: 'الجهة المصمِّمة',               en: 'Designer' },
  inf_consultantParty:{ ar: 'المكتب الاستشاري',            en: 'Consultant' },

  // SCR-W3 Contract — ported from DModContractNew + DContractAmendments.
  // The amendment STATE labels are not here: they are stored codes and come
  // from the `amendment-state` lookup, like every other enum (06 §8).
  con_register:    { ar: 'سجل عقود المشروع',                en: 'Project contract register' },
  con_add:         { ar: 'إضافة عقد',                       en: 'Add contract' },
  con_original_value:{ ar: 'القيمة الأصلية',                en: 'Original value' },
  con_addenda_impact:{ ar: 'أثر الملاحق',                   en: 'Addenda impact' },
  con_effective_value:{ ar: 'القيمة النافذة',               en: 'Effective value' },
  con_addenda:     { ar: 'ملاحق مطبَّقة',                    en: 'applied addenda' },
  con_pending_short:{ ar: 'بانتظار التطبيق',                en: 'awaiting application' },
  con_position:    { ar: 'الموقف المالي',                   en: 'Financial position' },
  con_position_sub:{ ar: 'المصروف فعلياً مقابل ما صودق عليه', en: 'Actually disbursed against what has been certified' },
  /** PAID only — a certified certificate with no money released is not spend. */
  con_disbursed:   { ar: 'المصروف',                         en: 'Disbursed' },
  con_certified:   { ar: 'المصادق عليه',                    en: 'Certified' },
  con_retention:   { ar: 'الضمان المحتجز',                  en: 'Retention withheld' },
  con_advance_recovery:{ ar: 'استرداد السلفة',              en: 'Advance recovery' },
  con_remaining:   { ar: 'المتبقي من القيمة النافذة',        en: 'Remaining of effective value' },
  con_period:      { ar: 'فترة العقود',                     en: 'Contract period' },
  con_of_effective:{ ar: 'من القيمة النافذة',               en: 'of the effective value' },
  con_days:        { ar: 'يوم',                             en: 'days' },
  con_day:         { ar: 'يوم',                             en: 'day' },
  con_consultant:  { ar: 'المكتب الاستشاري',                en: 'Consultant' },
  con_incoming:    { ar: 'الكتاب الرسمي',                   en: 'Official letter' },
  con_tab_overview:{ ar: 'نظرة عامة',                       en: 'Overview' },
  con_tab_details: { ar: 'التفاصيل',                        en: 'Details' },
  con_tab_payments:{ ar: 'الدفعات',                         en: 'Payments' },
  con_tab_amend:   { ar: 'الملاحق والتعديلات',              en: 'Addenda & amendments' },
  con_identity:    { ar: 'هوية العقد',                      en: 'Contract identity' },
  con_dates:       { ar: 'التواريخ والمدة',                 en: 'Dates & duration' },
  con_dates_sub:   { ar: 'المباشرة والإنجاز والمراسلات الرسمية', en: 'Start, finish & official correspondence' },
  con_original_finish:{ ar: 'الإنجاز الأصلي',               en: 'Original finish' },
  con_cost_breakdown:{ ar: 'تفصيل كلفة العقد',              en: 'Contract cost breakdown' },
  con_cost_breakdown_sub:{ ar: 'الإحالة · الاحتياط · الإشراف', en: 'Award · reserve · supervision' },
  con_cost_award:  { ar: 'الإحالة',                         en: 'Award' },
  con_cost_reserve:{ ar: 'الاحتياط',                        en: 'Reserve' },
  con_cost_supervision:{ ar: 'الإشراف والمراقبة',           en: 'Supervision & monitoring' },
  con_pay_no:      { ar: 'الرقم',                           en: 'No.' },
  con_pay_kind:    { ar: 'النوع',                           en: 'Kind' },
  con_finance_letter:{ ar: 'كتاب التمويل',                  en: 'Finance letter' },
  con_gross:       { ar: 'المبلغ الإجمالي',                 en: 'Gross' },
  con_net:         { ar: 'الصافي',                          en: 'Net' },
  con_no_payments_t:{ ar: 'لا توجد دفعات مسجلة لهذا العقد',  en: 'No payments recorded for this contract' },
  con_no_payments_b:{ ar: 'تُسجَّل الدفعات مقابل كتاب تمويل رسمي.', en: 'Payments are recorded against an official finance letter.' },
  con_chain:       { ar: 'سلسلة إصدارات العقد',             en: 'Contract version chain' },
  con_chain_sub:   { ar: 'العقد الأصلي ثم كل ملحق مطبَّق — بالترتيب', en: 'The original contract, then each APPLIED amendment, in order' },
  con_version:     { ar: 'الإصدار',                         en: 'Version' },
  con_source:      { ar: 'الأمر التغييري',                  en: 'Change order' },
  con_delta_value: { ar: 'فرق القيمة',                      en: 'Δ value' },
  con_delta_days:  { ar: 'فرق المدة',                       en: 'Δ days' },
  con_value_after: { ar: 'القيمة بعده',                     en: 'Value after' },
  con_finish_after:{ ar: 'الإنجاز بعده',                    en: 'Finish after' },
  con_pending_title:{ ar: 'ملاحق معتمدة لم تُطبَّق',          en: 'Approved, not yet applied' },
  con_pending_sub: { ar: 'الاعتماد لا يغيّر العقد — هذه الأرقام غير مضافة إلى أي مجموع أعلاه', en: 'Approving changes nothing — these figures are in none of the totals above' },
  con_would_be:    { ar: 'القيمة لو طُبِّق',                 en: 'Value if applied' },
  con_finish_would:{ ar: 'الإنجاز لو طُبِّق',                en: 'Finish if applied' },
  con_penalty:     { ar: 'غرامة التأخير',                   en: 'Delay penalty' },
  con_penalty_sub: { ar: 'قبل الملاحق وبعدها — والفرق هو ما اشترته التمديدات', en: 'Before and after the amendments — the difference is what the extensions bought' },
  con_penalty_before:{ ar: 'قبل الملاحق',                   en: 'Before amendments' },
  con_penalty_after:{ ar: 'بعد الملاحق',                    en: 'After amendments' },
  con_penalty_waived:{ ar: 'المتنازَل عنه',                 en: 'Waived' },
  con_penalty_waived_sub:{ ar: 'ما أسقطته التمديدات المطبَّقة', en: 'dropped by the applied extensions' },
  con_penalty_rule:{ ar: 'القاعدة:',                        en: 'Rule:' },
  con_capped_at:   { ar: 'بحد أقصى',                        en: 'capped at' },
  con_penalty_na:  { ar: 'لا يوجد إنجاز متوقع مسجَّل لهذا العقد — لا يمكن قياس التأخر ولا احتساب الغرامة.', en: 'No forecast finish is recorded for this contract — lateness cannot be measured and no penalty can be computed.' },

  // states (04 §9 — every screen needs these)
  empty_projects_t:{ ar: 'لا توجد مشاريع بعد',             en: 'No projects yet' },
  empty_projects_b:{ ar: 'قاعدة البيانات فارغة. حمّل بيانات العرض للبدء.', en: 'The database is empty. Load the demo fixture to begin.' },
  empty_filter_t:  { ar: 'لا نتائج مطابقة',                en: 'No matching projects' },
  empty_filter_b:  { ar: 'جرّب مصطلحاً آخر أو امسح المرشّحات.', en: 'Try another term or clear the filters.' },
  clear_filters:   { ar: 'مسح المرشّحات',                  en: 'Clear filters' },
  load_fixture:    { ar: 'تحميل بيانات العرض',             en: 'Load demo fixture' },
  loading:         { ar: 'جارٍ التحميل…',                  en: 'Loading…' },
  error_t:         { ar: 'تعذّر تحميل البيانات',           en: 'Could not load data' },
  retry:           { ar: 'إعادة المحاولة',                 en: 'Retry' },

  // chrome
  persona:         { ar: 'العرض بصفة',                     en: 'Viewing as' },
  language:        { ar: 'English',                        en: 'العربية' },

  // shell chrome — ported from v1.1 DSidebar / DTopbar / DAppFooter.
  // Keys keep the reference's own names (data.jsx STR) so a label can be
  // copied across verbatim.
  search_ph:       { ar: 'ابحث في المشاريع، العقود، اللجان…', en: 'Search projects, contracts, committees…' },
  all_workspaces:  { ar: 'المساحة الرئيسية',               en: 'All workspaces' },
  enterprise_ctx:  { ar: 'الوزارة',                        en: 'Ministry-wide' },
  your_workspaces: { ar: 'مساحات العمل',                   en: 'Your workspaces' },
  ws_active_short: { ar: 'نشط',                            en: 'active' },
  /** 06 §? — Workspaces.Kind. Only four values exist; see EntitiesDto. */
  ws_kind_university:  { ar: 'جامعة',                      en: 'University' },
  ws_kind_institute:   { ar: 'معهد',                       en: 'Institute' },
  ws_kind_directorate: { ar: 'مديرية',                     en: 'Directorate' },
  ws_kind_other:       { ar: 'جهة أخرى',                   en: 'Other' },
  /** The app footer. The env badge is not decoration — see AppFooterComponent. */
  env_prototype:   { ar: 'بيئة تجريبية',                   en: 'PROTOTYPE' },
  support:         { ar: 'الدعم الفني',                    en: 'Support' },
  version:         { ar: 'الإصدار',                        en: 'Version' },

  // page-head actions. The reference wires each of these to a toast saying it
  // is a demo, and so do we — a button that silently does nothing is worse.
  export:          { ar: 'تصدير',                          en: 'Export' },
  new_project:     { ar: 'مشروع جديد',                     en: 'New project' },
  new_contract:    { ar: 'عقد جديد',                       en: 'New contract' },
  import_p6:       { ar: 'استيراد P6',                     en: 'Import P6' },
  alert_rules:     { ar: 'قواعد التنبيه',                  en: 'Alert rules' },
  new_workspace:   { ar: 'مساحة عمل جديدة',                en: 'New workspace' },

  // ── SCR-W4 BOQ (04 §4) — chrome only. Coverage and distribution STATE
  // labels are not here: they are 06 §10 and §11 value lists and come from
  // the Lookups table like every other enum (P-11).
  boq_gate_t:      { ar: 'اختر عقداً للبدء',               en: 'Select a contract to start' },
  boq_gate_b:      { ar: 'البنود والأنشطة تنتمي إلى عقد واحد.', en: 'Items and activities belong to one contract.' },
  boq_contract:    { ar: 'العقد',                          en: 'Contract' },
  boq_change_contract: { ar: 'تغيير العقد',                en: 'Change contract' },
  boq_tab_register:{ ar: 'السجل',                          en: 'Register' },
  boq_tab_assign:  { ar: 'الربط بالأنشطة',                 en: 'Activity assignment' },
  boq_title:       { ar: 'بنود جدول الكميات',              en: 'Bill of quantities' },
  boq_search:      { ar: 'بحث بالرمز أو الوصف…',           en: 'Search by code or description…' },
  boq_columns:     { ar: 'الأعمدة',                        en: 'Columns' },
  boq_items:       { ar: 'بند',                            en: 'items' },
  boq_totals:      { ar: 'الإجمالي',                       en: 'Totals' },
  boq_calc_note:   { ar: 'الأوزان من قيمة العقد؛ نسبة التنفيذ من الأنشطة المرتبطة.',
                     en: 'Weights from contract value; executed % from the linked activities.' },
  boq_manual:      { ar: 'يدوي',                           en: 'manual' },
  boq_banded:      { ar: 'سعر مركّب',                      en: 'blended rate' },

  // columns — the reference's own order and wording
  boq_col_code:    { ar: 'الرمز',                          en: 'Code' },
  boq_col_desc:    { ar: 'الوصف',                          en: 'Description' },
  boq_col_unit:    { ar: 'الوحدة',                         en: 'Unit' },
  boq_col_qty:     { ar: 'الكمية',                         en: 'Quantity' },
  boq_col_rate:    { ar: 'سعر الوحدة',                     en: 'Unit rate' },
  boq_col_amount:  { ar: 'القيمة',                         en: 'Amount' },
  boq_col_weight:  { ar: 'الوزن %',                        en: 'Weight %' },
  boq_col_links:   { ar: 'الأنشطة',                        en: 'Activities' },
  boq_col_assigned_wt: { ar: 'الوزن المُخصَّص',             en: 'Assigned wt' },
  boq_col_progress:{ ar: 'التنفيذ',                        en: 'Executed' },
  boq_col_distribution: { ar: 'التوزيع',                   en: 'Distribution' },
  boq_col_coverage:{ ar: 'حالة التخصيص',                   en: 'Allocation state' },
  boq_col_actions: { ar: 'إجراءات',                        en: 'Actions' },

  // row actions
  boq_edit:        { ar: 'تعديل',                          en: 'Edit' },
  boq_delete:      { ar: 'حذف',                            en: 'Delete' },
  boq_distribute:  { ar: 'توزيع الكميات',                  en: 'Distribute' },
  boq_assign_row:  { ar: 'الربط بالأنشطة',                 en: 'Assign activities' },
  boq_save:        { ar: 'حفظ',                            en: 'Save' },
  boq_cancel:      { ar: 'إلغاء',                          en: 'Cancel' },
  boq_saved:       { ar: 'حُفظ البند',                      en: 'Item saved' },
  boq_deleted:     { ar: 'حُذف البند وتوزيعه وتخصيصاته',    en: 'Item, distribution and links deleted' },
  boq_delete_q:    { ar: 'حذف هذا البند وتوزيعه وتخصيصاته المرتبطة؟',
                     en: 'Delete this item with its distribution and its links?' },

  // empty states (04 §9) — empty-because-empty and empty-because-filtered
  boq_empty_t:     { ar: 'لا بنود كميات لهذا العقد',        en: 'No BOQ for this contract' },
  boq_empty_b:     { ar: 'يُستورد كشف الكميات مع العقد. حمّل بيانات العرض للبدء.',
                     en: 'The bill of quantities arrives with the contract. Load the demo fixture to begin.' },
  boq_nofilter_t:  { ar: 'لا بنود مطابقة',                 en: 'No matching items' },
  boq_nofilter_b:  { ar: 'جرّب مصطلحاً آخر أو امسح المرشّحات.', en: 'Try another term or clear the filters.' },

  // the distribution drawer (02 §8)
  boq_dist_title:  { ar: 'توزيع الكميات على الجهات المستفيدة', en: 'Distribute quantity to beneficiaries' },
  boq_dist_ben:    { ar: 'الجهة المستفيدة',                en: 'Beneficiary' },
  boq_dist_site:   { ar: 'الموقع',                         en: 'Site' },
  boq_dist_qty:    { ar: 'الكمية',                         en: 'Quantity' },
  boq_dist_total:  { ar: 'كمية البند',                     en: 'Item quantity' },
  boq_dist_done:   { ar: 'الموزّعة',                        en: 'Distributed' },
  boq_dist_left:   { ar: 'المتبقية',                       en: 'Remaining' },
  boq_dist_over:   { ar: 'الزائدة',                        en: 'Excess' },
  boq_dist_add:    { ar: 'إضافة جهة',                      en: 'Add a beneficiary' },
  boq_dist_remove: { ar: 'إزالة الجهة',                    en: 'Remove beneficiary' },
  boq_dist_saved:  { ar: 'حُفظ التوزيع',                    en: 'Distribution saved' },
  boq_dist_capped: { ar: 'الحقل مقيَّد بالكمية المتبقية للبند.', en: 'The field is capped at the item’s remaining quantity.' },
  boq_dist_cap_note: { ar: 'كل حقل مقيَّد بما تبقّى من كمية البند بعد بقية الجهات، فلا يمكن إدخال كمية غير صحيحة.',
                     en: 'Each field is capped at what is left of the item’s quantity after the other rows, so an invalid figure cannot be entered.' },
  boq_dist_over_b: { ar: 'التوزيع يتجاوز كمية البند — عدّل الكميات قبل الحفظ.',
                     en: 'The distribution exceeds the item quantity — revise it before saving.' },
  boq_dist_none_t: { ar: 'لم توزَّع الكمية بعد',            en: 'Not yet distributed' },
  boq_dist_none_b: { ar: 'وزّع كمية البند على الجهات المستفيدة لتتبّع التسليم لكل جهة.',
                     en: 'Allocate the item’s quantity to beneficiaries to track delivery per entity.' },
  boq_dist_no_ben: { ar: 'لا جهات مستفيدة مرتبطة بهذا المشروع.', en: 'No beneficiaries are assigned to this project.' },

  // the activity-assignment view (02 §2, 02 §3)
  boq_asn_queue:   { ar: 'بنود الكميات (المصدر)',          en: 'BOQ items (source)' },
  boq_asn_target:  { ar: 'الأنشطة المرتبطة (الهدف)',       en: 'Linked activities (target)' },
  boq_asn_pick:    { ar: 'اختر بنداً من القائمة',           en: 'Pick an item from the list' },
  boq_asn_pick_b:  { ar: 'ابدأ من البنود ذات المشاكل لحلّها أولاً.', en: 'Start from the flagged items first.' },
  boq_asn_basis:   { ar: 'أساس الوزن',                     en: 'Weight basis' },
  boq_asn_cost:    { ar: 'الكلفة',                         en: 'Cost' },
  boq_asn_mh:      { ar: 'ساعات العمل',                    en: 'Man-hours' },
  boq_asn_auto:    { ar: 'توزيع تلقائي',                   en: 'Auto-distribute' },
  boq_asn_add:     { ar: 'إضافة نشاط',                     en: 'Add activity' },
  boq_asn_activity:{ ar: 'النشاط',                         en: 'Activity' },
  boq_asn_its_wt:  { ar: 'وزن النشاط',                     en: 'Activity wt' },
  boq_asn_share:   { ar: 'الحصة',                          en: 'Share' },
  boq_asn_assigned:{ ar: 'القيمة المُخصَّصة',               en: 'Assigned' },
  boq_asn_abs_wt:  { ar: 'وزن مطلق',                       en: 'abs. wt' },
  boq_asn_total:   { ar: 'المجموع',                        en: 'Total' },
  boq_asn_remaining:{ ar: 'المتبقي',                       en: 'Remaining' },
  boq_asn_none_t:  { ar: 'لا أنشطة مرتبطة',                en: 'No linked activities' },
  boq_asn_none_b:  { ar: 'أضف نشاطاً لبدء الإسناد — القيمة غير المُسنَدة لا تُكتسب أبداً.',
                     en: 'Add an activity to start — an unallocated amount is never earned.' },
  boq_asn_no_acts: { ar: 'لا أنشطة في هذا العقد بعد — يُستورد الجدول الزمني في المرحلة 4.3.',
                     en: 'This contract has no activities yet — the schedule is imported in Phase 4.3.' },
  boq_asn_method:  { ar: 'الحصة المحسوبة = وزن النشاط المطلق ÷ مجموع أوزان الأنشطة المرتبطة. كل قيمة قابلة للتجاوز يدوياً، والاستعادة تُرجع المحسوبة.',
                     en: 'The computed share is the activity’s absolute weight over the sum of the linked activities’ weights. Every value is overridable, and reset restores the computed one.' },
  boq_asn_whatif:  { ar: 'أساس ساعات العمل عرض استكشافي — لا يصبح ملزماً إلا بالتوزيع التلقائي ثم الحفظ.',
                     en: 'The man-hours basis is a what-if — it becomes binding only through auto-distribute and a save.' },
  boq_asn_manual:  { ar: 'حصص هذا البند مُدخلة يدوياً',     en: 'This item’s shares were entered by hand' },
  boq_asn_reset:   { ar: 'استعادة المحسوبة',               en: 'Restore computed' },
  boq_asn_over_b:  { ar: 'مجموع الحصص يتجاوز 100% — صحّحه قبل الحفظ.',
                     en: 'The shares total more than 100% — fix it before saving.' },
  boq_asn_dup:     { ar: 'مكرَّر',                          en: 'duplicate' },
  boq_alloc_saved: { ar: 'حُفظ التخصيص',                    en: 'Allocation saved' },
  boq_alloc_reset: { ar: 'استُعيدت الحصص المحسوبة',         en: 'Computed shares restored' },
  boq_alloc_discarded: { ar: 'أُلغيت التعديلات غير المحفوظة', en: 'Unsaved changes discarded' },
  boq_alloc_no_weight: { ar: 'لا أوزان للأنشطة المرتبطة — لا يمكن التوزيع التلقائي.',
                     en: 'The linked activities carry no weight — auto-distribute has nothing to divide.' },

  // the Z10 status bar
  boq_stat_items:  { ar: 'البنود',                         en: 'Items' },
  boq_stat_contract:{ ar: 'قيمة العقد',                    en: 'Contract value' },
  boq_stat_project:{ ar: 'قيمة المشروع',                   en: 'Project value' },
  boq_stat_acts:   { ar: 'الأنشطة',                        en: 'Activities' },
  boq_stat_balanced:{ ar: 'مطابق',                         en: 'Balanced' },
  boq_asof:        { ar: 'بيانات حتى',                     en: 'Data as of' },
  /** The unit a money column is stated in, once in its header — the reference's
   *  own `cur(lang)` (boq-register.jsx:23). D-11: IQD, always an integer. */
  cur_iqd:         { ar: 'د.ع',                            en: 'IQD' },
} as const;

export type StrKey = keyof typeof STR;

@Injectable({ providedIn: 'root' })
export class LangService {
  readonly lang = signal<Lang>((localStorage.getItem('epm_lang') as Lang) ?? 'ar');

  constructor() {
    effect(() => {
      const l = this.lang();
      localStorage.setItem('epm_lang', l);
      document.documentElement.setAttribute('lang', l);
      document.documentElement.setAttribute('dir', l === 'ar' ? 'rtl' : 'ltr');
    });
  }

  /** t('col_status') */
  t = (key: StrKey): string => STR[key][this.lang()];

  /** Picks the right side of any { ar, en } pair coming from the API. */
  pick = (ar: string, en: string): string => (this.lang() === 'ar' ? ar : en) || ar || en;

  isAr = () => this.lang() === 'ar';

  toggle() {
    this.lang.set(this.lang() === 'ar' ? 'en' : 'ar');
  }
}

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
  /** VERBATIM (data.jsx:13). The port had shortened it; `MinistryLockup` is
   *  the only thing that renders it, and it renders the reference's full one. */
  dept:            { ar: 'دائرة الإعمار و المشاريع — القسم الهندسي', en: 'Dept. of Reconstruction & Projects — Engineering Section' },

  // navigation
  /** The RAIL's first item. VERBATIM (data.jsx:115 `nav_home`) — the reference
   *  calls it «الرئيسية», not «النظرة العامة». `nav_portfolio` below is the
   *  PAGE's own title, which is a different string doing a different job: the
   *  reference's dashboard heads itself with a greeting, so there is nothing
   *  to copy for it and ours stays. */
  nav_home:        { ar: 'الرئيسية',                       en: 'Home' },
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
  /** VERBATIM (data.jsx:178). Was «التقارير و التحليلات», which is not the
   *  reference's wording — it says «الإحصائيات». */
  nav_reports:     { ar: 'التقارير و الإحصائيات',          en: 'Reports & analytics' },
  //
  // `nav_group_ops` / `nav_group_gov` are gone. The reference's rail is a FLAT
  // list (desktop-shell.jsx:247) — its only `.d-nav-grp` is «الحوكمة», and that
  // one heads the ADMIN entry, which this app does not have because it has no
  // admin screen. We were printing «العمليات» over the whole rail, a heading
  // the reference never shows.

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
  // Strings below are VERBATIM from the design-revamp prototype's own string
  // table (data.jsx STR). `entities_sub` in particular is the reference's
  // `ws_sub`, and it states BR-15 in the ministry's own words — which is a
  // better sentence than the one we had invented for it.
  nav_entities:    { ar: 'مساحات العمل',                   en: 'Workspaces' },
  entities_sub:    { ar: 'اختر مساحة عمل للانتقال إلى مشاريعها. وصولك هو اتحاد تكليفاتك حسب الدور و النطاق.', en: 'Choose a workspace to view its projects. Your access is the union of your role-and-scope assignments.' },
  search_entities: { ar: 'ابحث في مساحات العمل بالاسم أو الرمز…', en: 'Search workspaces by name or code…' },
  entities_showing:{ ar: 'مساحة عمل',                      en: 'workspaces' },
  col_entity:      { ar: 'مساحة العمل',                    en: 'Workspace' },
  col_type:        { ar: 'النوع',                          en: 'Type' },
  /** VERBATIM — the reference's `kpi_active` / `kpi_completion` (data.jsx:57,
   *  :60), which is what DSpaces puts in these two headers. Ours said «النشطة»
   *  and «نسبة الإنجاز». Used by this register only. */
  col_active:      { ar: 'مشاريع نشطة',                    en: 'Active projects' },
  col_completion:  { ar: 'متوسط الإنجاز',                  en: 'Avg. completion' },
  /** VERBATIM (data.jsx:74) — DSpaces' own filtered-empty title. The register
   *  used the generic `empty_filter_t` («لا نتائج مطابقة»); the reference names
   *  the thing that is missing. Its body is inline there, so it is here too. */
  ws_no_results:   { ar: 'لا توجد مساحات عمل مطابقة',      en: 'No matching workspaces' },
  ws_no_results_b: { ar: 'جرّب اسماً أو رمزاً أو نوعاً آخر', en: 'Try another name, code or type' },
  empty_entities_t:{ ar: 'لا توجد مساحات عمل بعد',         en: 'No workspaces yet' },
  empty_entities_b:{ ar: 'حمّل بيانات العرض من شاشة المشاريع.', en: 'Load the demo fixture from the Projects screen.' },
  /** BR-15 — assigned to nothing is a real state, not an empty database. */
  empty_ws_assigned_t:{ ar: 'لا توجد مساحات عمل مسندة إليك', en: 'No workspaces assigned to you' },
  empty_ws_assigned_b:{ ar: 'نطاق رؤيتك هو اتحاد تكليفاتك. راجع مدير النظام لإسنادك إلى مساحة عمل.', en: 'Your visibility is the union of your assignments. Ask an administrator to assign you a workspace.' },
  // ── EP-WSP-02 «إنشاء مساحة جديدة» (ملحق الشكل 1) ──────────────────────
  ws_create_name_ph:{ ar: 'مثال: جامعة البصرة',            en: 'e.g. University of Basrah' },
  ws_create_name_en:{ ar: 'الاسم بالإنجليزية',             en: 'Name in English' },
  ws_create_badge: { ar: 'رمز الشارة',                     en: 'Badge code' },
  ws_create_badge_hint:{ ar: 'حرفان إلى خمسة — يظهر على الشارة الملوّنة.', en: 'Two to five letters — shown on the coloured emblem.' },
  ws_create_code_hint:{ ar: 'يظهر في الرابط. أحرف لاتينية وأرقام.', en: 'Appears in the URL. Latin letters and digits.' },
  ws_create_submit:{ ar: 'إضافة مساحة العمل',              en: 'Add workspace' },
  cancel:          { ar: 'إلغاء',                          en: 'Cancel' },
  saving:          { ar: 'جارٍ الحفظ…',                    en: 'Saving…' },

  ws_enter:        { ar: 'دخول',                           en: 'Open' },
  ws_enter_full:   { ar: 'الدخول إلى مساحة العمل',         en: 'Open workspace' },
  open_project:    { ar: 'فتح المشروع',                    en: 'Open project' },
  /** Scoped register: the workspace has no projects, which is not "no data". */
  empty_ws_projects_t:{ ar: 'لا توجد مشاريع في هذه المساحة', en: 'No projects in this workspace' },
  empty_ws_projects_b:{ ar: 'اختر مساحة أخرى أو عد إلى المركز لعرض المحفظة كاملة.', en: 'Pick another workspace, or return to the ministry for the whole portfolio.' },
  empty_ws_contracts_t:{ ar: 'لا توجد عقود في هذه المساحة', en: 'No contracts in this workspace' },

  // ── SCR-E8 workspace overview — «مساحة العمل › نظرة عامة» (ملحق الشكل 2)
  ws_overview:     { ar: 'نظرة عامة',                      en: 'Overview' },
  ws_overview_sub: { ar: 'موقف مشاريع الجهة قبل النزول إلى مشروع بعينه', en: 'The entity’s position, before descending into one project' },
  ws_view_projects:{ ar: 'عرض المشاريع',                   en: 'View projects' },
  ws_view_all:     { ar: 'عرض الكل',                       en: 'View all' },
  ws_watchlist:    { ar: 'قائمة المتابعة — مشاريع خارج المسار', en: 'Watchlist — projects off track' },
  ws_watchlist_ok: { ar: 'كل المشاريع ضمن الخطة.',         en: 'Every project is on plan.' },
  ws_recent:       { ar: 'آخر ما جرى تحديثه',              en: 'Recently updated' },
  ws_by_status:    { ar: 'المشاريع حسب الحالة',            en: 'Projects by status' },
  ws_open_alerts:  { ar: 'تنبيهات مفتوحة',                 en: 'Open alerts' },
  ws_critical_short:{ ar: 'حرجة',                          en: 'critical' },
  ws_no_projects_t:{ ar: 'لا توجد مشاريع في هذه المساحة',  en: 'No projects in this workspace' },
  ws_no_projects_b:{ ar: 'مساحة العمل معرّفة ولم يُدرَج فيها مشروع بعد.', en: 'The workspace exists; no project has been added to it yet.' },
  /** The 403 the API returns when `?ws=` names a workspace outside the assignment. */
  ws_denied_t:     { ar: 'مساحة عمل غير مسندة إليك',       en: 'Workspace not assigned to you' },
  ws_denied_b:     { ar: 'لا يرى المستخدم بيانات خارج تشكيله. أُعيد النطاق إلى مساحاتك.', en: 'A user sees no data outside their own entity. The scope has been reset.' },

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

  // المسار 1 · الشكل 5 — the rest of the definition card. Same `inf_` prefix as
  // the labels above ON PURPOSE: SCR-W2 reads these fields and the project form
  // writes them, and one label set is what stops the two screens calling the
  // same column different things. Wording is الشكل 5's own.
  inf_group_description:{ ar: 'الوصف',                     en: 'Description' },
  inf_group_entity: { ar: 'الجهة',                         en: 'Entity' },
  inf_group_consultant:{ ar: 'الاستشاري',                  en: 'Consultant' },
  inf_code:        { ar: 'رمز المشروع',                    en: 'Project code' },
  inf_registrationYear:{ ar: 'سنة الإدراج',                en: 'Registration year' },
  inf_plannedCost: { ar: 'الكلفة المقررة',                 en: 'Planned cost' },
  inf_expenditureCategory:{ ar: 'الفئة الإنفاقية',         en: 'Expenditure category' },
  inf_budgetApprovalNumber:{ ar: 'رقم اعتماد الموازنة',    en: 'Budget approval no.' },
  inf_coordinates: { ar: 'إحداثيات الموقع',                en: 'Coordinates' },
  inf_formation:   { ar: 'التشكيل',                        en: 'Formation' },
  inf_beneficiaryCodes:{ ar: 'الجهة المستفيدة',            en: 'Beneficiary' },
  inf_orgStructure:{ ar: 'الهيكل التنظيمي',                en: 'Organisational structure' },
  inf_description: { ar: 'وصف المشروع',                    en: 'Project description' },

  // The project form (المسار 1). One component serves create and edit, so the
  // title is the one thing that differs between them.
  prj_new_title:   { ar: 'تعريف مشروع جديد',               en: 'Define a new project' },
  prj_edit_title:  { ar: 'تعديل تعريف المشروع',            en: 'Edit project definition' },
  prj_new_sub:     { ar: 'يُحفظ المشروع ضمن مساحة العمل الحالية.', en: 'The project is saved in the current workspace.' },
  prj_save:        { ar: 'حفظ المشروع',                    en: 'Save project' },
  prj_save_changes:{ ar: 'حفظ التعديلات',                  en: 'Save changes' },
  prj_saved:       { ar: 'حُفظ المشروع',                   en: 'Project saved' },
  prj_updated:     { ar: 'حُفظت التعديلات',                en: 'Changes saved' },
  prj_required_note:{ ar: 'الحقول المعلَّمة بنجمة إلزامية.', en: 'Fields marked with a star are required.' },
  /** الشكل 5 — «وسم مقترح على القيم التي يقترحها النظام». */
  prj_suggested:   { ar: 'مقترح',                          en: 'Suggested' },
  prj_suggested_hint:{ ar: 'قيمة اقترحها النظام — يمكن تعديلها.', en: 'Suggested by the system — you may change it.' },
  prj_fix_errors:  { ar: 'تعذّر الحفظ. راجع الحقول أدناه.', en: 'Could not save. Review the fields below.' },
  prj_no_workspace:{ ar: 'اختر مساحة عمل قبل تعريف مشروع.', en: 'Choose a workspace before defining a project.' },
  prj_edit:        { ar: 'تعديل',                          en: 'Edit' },
  /** سجل النشاط — الشكل 5's second tab. */
  prj_activity:    { ar: 'سجل النشاط',                     en: 'Activity log' },
  prj_details:     { ar: 'التفاصيل',                       en: 'Details' },
  prj_act_created: { ar: 'أنشأ التعريف',                   en: 'created the definition' },
  prj_act_updated: { ar: 'عدّل التعريف',                   en: 'updated the definition' },
  prj_no_permission_t:{ ar: 'تعريف المشاريع غير متاح بصفتك الحالية.', en: 'Defining projects is not available in your current capacity.' },
  prj_no_permission_b:{ ar: '§23 يسند تعريف المشروع إلى المستخدم المختص في الجهة. بدّل «العرض بصفة» للمتابعة.', en: '§23 assigns project definition to the university specialist. Switch «العرض بصفة» to continue.' },
  inf_coordinates_hint:{ ar: 'خط العرض ثم خط الطول، مفصولين بفاصلة.', en: 'Latitude then longitude, comma separated.' },

  // المسار 2 — the contract form. One component serves create and edit, so the
  // title and the save verb are the only things that differ between them.
  con_new_title:   { ar: 'إضافة عقد جديد',                 en: 'Add a new contract' },
  con_edit_title:  { ar: 'تعديل بيانات العقد',             en: 'Edit contract details' },
  con_save:        { ar: 'حفظ العقد',                      en: 'Save contract' },
  con_save_changes:{ ar: 'حفظ التعديلات',                  en: 'Save changes' },
  con_saved:       { ar: 'حُفظ العقد',                     en: 'Contract saved' },
  con_updated:     { ar: 'حُفظت التعديلات',                en: 'Changes saved' },
  con_fix_errors:  { ar: 'تعذّر الحفظ. راجع الحقول أدناه.', en: 'Could not save. Review the fields below.' },
  con_group_identity:{ ar: 'هوية العقد',                   en: 'Contract identity' },
  con_group_amounts:{ ar: 'المبالغ',                       en: 'Amounts' },
  con_group_dates: { ar: 'التواريخ',                       en: 'Dates' },
  con_group_parties:{ ar: 'المقاول و الأطراف',             en: 'Contractor & parties' },
  con_group_letter:{ ar: 'كتاب الإحالة',                   en: 'Award letter' },
  con_code:        { ar: 'رمز العقد',                      en: 'Contract code' },
  con_code_locked: { ar: 'الرمز هو مفتاح العقد ولا يقبل التعديل بعد الحفظ.', en: 'The code is the contract key and cannot be changed after saving.' },
  con_component:   { ar: 'المكوّن',                        en: 'Component' },
  con_component_ph:{ ar: 'المكوّن المدني',                 en: 'Civil works' },
  con_award:       { ar: 'مبلغ الإحالة',                   en: 'Award amount' },
  con_award_locked:{ ar: 'القيمة المُحالة لا تُعدَّل — يحرّكها أمر تغييري.', en: 'The awarded value is never edited — an amendment moves it.' },
  con_reserve:     { ar: 'مبلغ الاحتياط',                  en: 'Reserve amount' },
  con_supervision: { ar: 'مبلغ الإشراف',                   en: 'Supervision amount' },
  con_monitoring:  { ar: 'مبلغ المراقبة',                  en: 'Monitoring amount' },
  /** `01 §2.3` lists three expense items; المسار 2 asks for four. See Contract.cs. */
  con_monitoring_hint:{ ar: 'يطلبه المسار 1 ضمن المبالغ الأربعة.', en: 'Requested by المسار 2 as the fourth amount.' },
  con_start:       { ar: 'تاريخ المباشرة',                 en: 'Start date' },
  con_finish:      { ar: 'تاريخ الإنجاز التعاقدي',         en: 'Contractual finish' },
  con_finish_locked:{ ar: 'الإنجاز التعاقدي لا يُعدَّل — يحرّكه أمر تغييري.', en: 'The contractual finish is never edited — an amendment moves it.' },
  con_contractor:  { ar: 'اسم المقاول',                    en: 'Contractor' },
  con_executing_party:{ ar: 'الجهة المنفّذة',              en: 'Executing party' },
  con_contact:     { ar: 'بيانات التواصل',                 en: 'Contact details' },
  con_incoming_no: { ar: 'رقم الكتاب',                     en: 'Letter number' },
  con_incoming_date:{ ar: 'تاريخ الكتاب',                  en: 'Letter date' },
  /** SCR-E3's «عقد جديد» — the cross-portfolio register has no project to inherit. */
  con_pick_project_t:{ ar: 'اختر المشروع',                 en: 'Choose the project' },
  con_pick_project_go:{ ar: 'متابعة',                      en: 'Continue' },
  con_act_created: { ar: 'أضاف العقد',                     en: 'added the contract' },
  con_act_updated: { ar: 'عدّل بيانات العقد',              en: 'updated the contract' },
  con_no_permission_t:{ ar: 'إدخال العقود غير متاح بصفتك الحالية.', en: 'Entering contracts is not available in your current capacity.' },
  con_no_permission_b:{ ar: '§23 يسند إدخال العقود إلى المستخدم المختص في الجهة. بدّل «العرض بصفة» للمتابعة.', en: '§23 assigns contract entry to the university specialist. Switch «العرض بصفة» to continue.' },

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
  /** The register toolbar's own clear button is just «مسح» with a close icon
   *  in the reference (desktop-views.jsx:432) — the long form is for the
   *  empty-state button, where there is room for it. */
  clear:           { ar: 'مسح',                            en: 'Clear' },
  load_fixture:    { ar: 'تحميل بيانات العرض',             en: 'Load demo fixture' },
  loading:         { ar: 'جارٍ التحميل…',                  en: 'Loading…' },
  error_t:         { ar: 'تعذّر تحميل البيانات',           en: 'Could not load data' },
  retry:           { ar: 'إعادة المحاولة',                 en: 'Retry' },

  // ── SCR-P0 landing + SCR-P1 sign-in. Strings marked VERBATIM are the
  // reference's own (data.jsx STR); the rest are lifted from the two screens'
  // inline `lang === 'ar' ? … : …` ternaries in screens-public.jsx, which is
  // where the reference keeps most of this copy.
  /** VERBATIM (data.jsx:11 `app_full`) — the nav brand's second line. */
  app_tagline:     { ar: 'إدارة المشاريع الهندسية',        en: 'Engineering Projects Management' },
  /** The reference's own h1 on both public screens — «…System» in English,
   *  which is one word longer than the shell's `app_title`. */
  app_title_full:  { ar: 'نظام إدارة المشاريع الهندسية',   en: 'Engineering Projects Management System' },
  signin:          { ar: 'تسجيل الدخول',                   en: 'Sign in' },
  /** The landing's access panel says «الدخول إلى النظام»; the login's says
   *  «تسجيل الدخول». Two different headings in the reference, kept apart. */
  signin_access:   { ar: 'الدخول إلى النظام',              en: 'System access' },
  signin_sub:      { ar: 'هوية موحّدة على مستوى الوزارة',   en: 'Unified enterprise identity' },
  signin_portal:   { ar: 'بوابة الدخول المؤسسية',          en: 'Institutional access portal' },
  /** screens-public.jsx:199 — the SAME paragraph on the landing and the login
   *  hero. The port had shortened it, dropping the second sentence, which is
   *  the one that states the access rule. */
  signin_blurb:    { ar: 'المنصّة الموحّدة لوزارة التعليم العالي لإدارة المشاريع الهندسية عبر الجامعات و الوحدات. الدخول مخصّص للموظّفين المخوّلين وفق الأدوار و النطاقات.', en: 'The unified platform of the Ministry of Higher Education for managing engineering projects across universities and units. Access is restricted to authorized personnel, by role and scope.' },
  /** The landing's access panel — the divider and its two notes. */
  secure_access:   { ar: 'الدخول الآمن',                   en: 'Secure access' },
  note_network:    { ar: 'متاح داخل شبكة الوزارة فقط',      en: 'Available on the ministry network only' },
  note_audited:    { ar: 'كل عملية دخول تُسجّل و تُدقّق',     en: 'Every sign-in is logged and audited' },
  home:            { ar: 'الرئيسية',                       en: 'Home' },
  /** The landing footer's three claims (screens-public.jsx:221). */
  lp_integration:  { ar: 'تكامل على مستوى الوزارة',        en: 'Ministry-wide integration' },
  lp_integration_b:{ ar: 'ربط الجامعات و الوحدات و المشاريع.', en: 'Links universities, units and projects.' },
  lp_effective:    { ar: 'إدارة فعّالة و شفافة',            en: 'Effective, transparent management' },
  lp_effective_b:  { ar: 'لمتابعة المشاريع و الموارد و الميزانيات.', en: 'Tracks projects, resources and budgets.' },
  lp_secure:       { ar: 'نظام آمن و معتمد',               en: 'Secure, accredited system' },
  lp_secure_b:     { ar: 'وفق معايير الحوكمة و الأمن السيبراني.', en: 'Per governance and cybersecurity standards.' },
  username:        { ar: 'اسم المستخدم',                   en: 'Username' },
  password:        { ar: 'كلمة المرور',                    en: 'Password' },
  show_password:   { ar: 'إظهار كلمة المرور',              en: 'Show password' },
  hide_password:   { ar: 'إخفاء كلمة المرور',              en: 'Hide password' },
  remember:        { ar: 'تذكّرني',                        en: 'Remember me' },
  forgot:          { ar: 'نسيت كلمة المرور؟',              en: 'Forgot password?' },
  enter:           { ar: 'الدخول إلى النظام',              en: 'Enter the system' },
  verifying:       { ar: 'جارٍ التحقق…',                   en: 'Verifying…' },
  /** VERBATIM (data.jsx:52). */
  login_note:      { ar: 'الوصول مقيّد بشبكة الوزارة الداخلية. كل عملية دخول تُسجَّل.', en: 'Access is restricted to the ministry network. Every sign-in is logged.' },
  signout:         { ar: 'تسجيل الخروج',                   en: 'Sign out' },

  // chrome
  persona:         { ar: 'العرض بصفة',                     en: 'Viewing as' },
  language:        { ar: 'English',                        en: 'العربية' },

  // shell chrome — ported from v1.1 DSidebar / DTopbar / DAppFooter.
  // Keys keep the reference's own names (data.jsx STR) so a label can be
  // copied across verbatim.
  search_ph:       { ar: 'ابحث في المشاريع، العقود، اللجان…', en: 'Search projects, contracts, committees…' },
  all_workspaces:  { ar: 'المساحة الرئيسية',               en: 'Master space' },
  enterprise_ctx:  { ar: 'الوزارة',                        en: 'Ministry-wide' },
  your_workspaces: { ar: 'مساحات العمل المتاحة لك',        en: 'Your workspaces' },
  ws_active_short: { ar: 'نشط',                            en: 'active' },
  ws_current:      { ar: 'مساحة العمل الحالية',            en: 'Current workspace' },
  ws_back_to_ministry:{ ar: 'العودة إلى المركز',           en: 'Back to the ministry' },
  //
  // Workspace KIND labels are NOT here. They are a business-maintained value
  // list (`workspace-kind` in the Lookups table) like every other enum, and
  // this map is UI chrome only. The old ws_kind_* keys were a second, drifting
  // copy of that list and are gone.
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
  /** The page-head ACTION. VERBATIM from the live DSpaces
   *  (desktop-views.jsx:419): «مساحة عمل» / «Workspace» — the `add` icon beside
   *  it already says "new", so the word was doing the icon's job twice. */
  new_workspace:   { ar: 'مساحة عمل',                      en: 'Workspace' },
  /** The DRAWER's title, where there is no icon and the sentence has to stand
   *  on its own. The reference has no such drawer to copy. */
  ws_create_title: { ar: 'إنشاء مساحة عمل',                en: 'Create a workspace' },

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

  // ── SCR-W5 Schedule (04 §5) — chrome only. Activity STATUS labels come
  // from the `activity-status` lookup (06 §9), like every other enum.
  scd_gate_t:      { ar: 'اختر عقداً لعرض الجدول الزمني',   en: 'Select a contract to see its schedule' },
  scd_gate_b:      { ar: 'الأنشطة تنتمي إلى عقد واحد.',     en: 'Activities belong to one contract.' },
  scd_tab_gantt:   { ar: 'المخطط الزمني',                  en: 'Gantt' },
  scd_tab_table:   { ar: 'الجدول',                         en: 'Table' },
  scd_wbs_activity:{ ar: 'هيكل التجزئة / النشاط',          en: 'WBS / Activity' },
  scd_critical:    { ar: 'المسار الحرج',                   en: 'Critical path' },
  scd_level:       { ar: 'المستوى',                        en: 'Level' },
  scd_basis:       { ar: 'أساس الوزن',                     en: 'Weight basis' },
  scd_cost:        { ar: 'الكلفة',                         en: 'Cost' },
  scd_mh:          { ar: 'ساعات العمل',                    en: 'Man-hours' },
  scd_cols_all:    { ar: 'كل الأعمدة (9)',                 en: 'All columns (9)' },
  scd_cols_few:    { ar: 'أعمدة أساسية (4)',               en: 'Essential columns (4)' },
  scd_resize:      { ar: 'اسحب لتغيير عرض العمود',         en: 'Drag to resize the column' },

  // the nine info columns (04 §5), headers WRAP rather than truncate
  scd_col_dur:     { ar: 'المدة',                          en: 'Duration' },
  scd_col_bl_start:{ ar: 'بداية الأساس',                   en: 'Baseline start' },
  scd_col_bl_fin:  { ar: 'إنجاز الأساس',                   en: 'Baseline finish' },
  scd_col_act_start:{ ar: 'البداية الفعلية',               en: 'Actual start' },
  scd_col_act_fin: { ar: 'الإنجاز الفعلي',                 en: 'Actual finish' },
  scd_col_float:   { ar: 'العوم الكلي',                    en: 'Total float' },
  scd_col_pct:     { ar: 'الإنجاز',                        en: '% Complete' },
  scd_col_rel:     { ar: 'الوزن النسبي',                   en: 'Rel. weight' },
  scd_col_abs:     { ar: 'الوزن المطلق',                   en: 'Abs. weight' },
  scd_col_id:      { ar: 'المعرّف',                        en: 'Activity ID' },
  scd_col_status:  { ar: 'الحالة',                         en: 'Status' },
  scd_col_cost:    { ar: 'الكلفة',                         en: 'Cost' },
  scd_col_slip:    { ar: 'الانزياح',                       en: 'Slip' },
  scd_col_forecast:{ ar: 'الإنجاز المتوقع',                en: 'Forecast finish' },

  // the record pane
  scd_rec_calendar:{ ar: 'التقويم',                        en: 'Calendar' },
  scd_rec_preds:   { ar: 'السوابق',                        en: 'Predecessors' },
  scd_rec_dur:     { ar: 'المدة الأصلية / المتبقية',       en: 'Original / remaining duration' },
  scd_rec_wbs:     { ar: 'هيكل التجزئة',                   en: 'WBS' },
  scd_rec_close:   { ar: 'إغلاق',                          en: 'Close' },
  scd_days:        { ar: 'يوم',                            en: 'd' },
  scd_early:       { ar: 'مبكّر',                          en: 'early' },
  scd_late:        { ar: 'متأخر',                          en: 'late' },
  scd_ontime:      { ar: 'ضمن الأساس',                     en: 'on baseline' },
  scd_progress_ro: { ar: 'تحديث الإنجاز يتم من شاشة الإنجاز (المرحلة 4.4)، حيث ينعكس مباشرةً على بنود الكميات.',
                     en: 'Progress is updated on the Progress screen (Phase 4.4), where it reflects straight onto the BOQ.' },

  // the legend — every mark on the chart, named
  scd_legend_bl:   { ar: 'خط الأساس',                      en: 'Baseline' },
  scd_legend_cur:  { ar: 'الوضع الحالي (اللون = الحالة)',  en: 'Current (colour = status)' },
  scd_legend_crit: { ar: 'المسار الحرج (إطار)',            en: 'Critical path (ring)' },
  scd_legend_ms:   { ar: 'حَدَث فارق',                      en: 'Milestone' },
  scd_legend_dd:   { ar: 'تاريخ البيانات',                 en: 'Data date' },

  // states
  scd_empty_t:     { ar: 'لا جدول زمني لهذا العقد',        en: 'No schedule for this contract' },
  scd_empty_b:     { ar: 'يُستورد الجدول الزمني من Primavera P6. حمّل بيانات العرض للبدء.',
                     en: 'The schedule is imported from Primavera P6. Load the demo fixture to begin.' },
  scd_nocrit_t:    { ar: 'لا أنشطة على المسار الحرج',      en: 'No activities on the critical path' },
  scd_nocrit_b:    { ar: 'ألغِ مرشّح المسار الحرج لعرض الجدول كاملاً.',
                     en: 'Clear the critical-path filter to see the whole schedule.' },

  // summary strip — the client module spec's own five figures
  scd_stat_activities:{ ar: 'الأنشطة',                     en: 'Activities' },
  scd_stat_critical:  { ar: 'حرجة',                        en: 'Critical' },
  scd_stat_delayed:   { ar: 'متأخرة',                      en: 'Delayed' },
  scd_stat_progress:  { ar: 'متوسط الإنجاز',               en: 'Avg. progress' },
  scd_stat_milestones:{ ar: 'أحداث فارقة',                 en: 'Milestones' },
  /** Stated under the grid, because two weights with two denominators is the
   *  single thing most likely to be misread on this screen (02 §2). */
  scd_weights_note:{ ar: 'الوزن النسبي = حصة النشاط داخل بند هيكل التجزئة الذي يتبعه؛ الوزن المطلق = حصته من العقد كاملاً. المطلق هو ما يقود التخصيص والقيمة المكتسبة.',
                     en: "Relative weight is the activity's share of the WBS node it sits in; absolute weight is its share of the whole contract. Absolute is what drives allocation and earned value." },
  scd_crit_note:   { ar: 'العوم صفر — أي تأخير في هذا النشاط يؤخّر إنجاز العقد بالكامل. يُعرَض بإطار لا بلون؛ اللون محجوز للحالة.',
                     en: 'Zero float — any delay here delays the whole contract. Shown as a ring, not a colour; the colour channel belongs to status.' },

  // ── SCR-W6 Progress (Phase 4.4) ────────────────────────────────────────
  prg_asof:        { ar: 'حتى',                            en: 'as at' },
  prg_tab_summary: { ar: 'الملخص',                         en: 'Summary' },
  prg_tab_activities: { ar: 'إدخال الإنجاز',                en: 'Report progress' },
  prg_tab_boq:     { ar: 'الانعكاس على الكميات',            en: 'Reflection on the BOQ' },

  prg_physical:    { ar: 'الإنجاز المادي',                  en: 'Physical' },
  prg_planned:     { ar: 'المخطط',                          en: 'Planned' },
  prg_financial:   { ar: 'الإنجاز المالي',                  en: 'Financial' },
  prg_gap:         { ar: 'الفجوة',                          en: 'Gap' },
  prg_pts:         { ar: 'نقطة',                            en: 'pts' },
  prg_delay:       { ar: 'التأخر',                          en: 'Delay' },
  prg_budget:      { ar: 'الموازنة',                        en: 'Budget' },
  prg_executed:    { ar: 'المنجَز',                         en: 'Executed' },
  prg_activities:  { ar: 'الأنشطة',                         en: 'Activities' },
  prg_boq_lines:   { ar: 'بنود الكميات',                    en: 'BOQ lines' },
  prg_reported:    { ar: 'الإنجاز المُبلَّغ',                en: 'Reported' },
  prg_actions:     { ar: 'إجراءات',                         en: 'Actions' },

  prg_planned_note: { ar: 'ما يفرضه خط الأساس عند تاريخ البيانات',
                      en: 'what the baseline requires at the data date' },
  prg_physical_note: { ar: 'مرجّح بأوزان بنود الكميات',
                       en: 'weighted by BOQ item weights' },
  prg_gap_note:     { ar: 'موجب يعني تقدّماً على الخطة',
                      en: 'positive means ahead of plan' },

  prg_by_contract: { ar: 'الإنجاز حسب العقود',              en: 'Progress by contract' },
  prg_by_contract_sub: { ar: 'محسوب صعوداً من بنود الكميات، لا يُدخَل يدوياً',
                         en: 'rolled up from the BOQ lines, never entered by hand' },

  prg_evm:         { ar: 'مؤشرات الأداء',                   en: 'Performance indices' },
  prg_evm_sub:     { ar: 'مؤشرات تشخيصية — لا تُقرأ كعناوين',
                     en: 'diagnostics — not headline figures' },
  prg_evm_note:    { ar: 'SPI = المكتسب ÷ المخطط · CPI = المكتسب ÷ الفعلي · EAC = الموازنة ÷ CPI · VAC = الموازنة − EAC. المخطط مشتق من خط الأساس على أوزان الكلفة نفسها (P-53).',
                     en: 'SPI = earned ÷ planned · CPI = earned ÷ actual · EAC = budget ÷ CPI · VAC = budget − EAC. Planned is derived from the baseline on the same cost weights (P-53).' },
  prg_spi_behind:  { ar: 'دون الخطة',                       en: 'behind plan' },
  prg_spi_on:      { ar: 'على الخطة',                       en: 'on plan' },
  prg_cpi_over:    { ar: 'تجاوز في الكلفة',                 en: 'over cost' },
  prg_cpi_within:  { ar: 'الكلفة ضمن الحدود',               en: 'cost within limits' },

  prg_edit_t:      { ar: 'الإنجاز يُدخَل هنا، وينعكس مباشرةً على بنود الكميات',
                     en: 'Progress is entered here, and reflects straight onto the BOQ' },
  prg_edit_b:      { ar: 'كل صف يذكر البنود التي يغذّيها قبل تعديله — التفصيل في تبويب الانعكاس.',
                     en: 'Each row names the lines it feeds before you touch it — the detail is in the reflection tab.' },
  prg_feeds:       { ar: 'يغذّي البنود',                     en: 'Feeds' },
  prg_feeds_none:  { ar: 'غير مرتبط ببند',                  en: 'linked to no line' },

  prg_boq_progress: { ar: 'إنجاز البند',                    en: 'Line progress' },
  prg_achieved_qty: { ar: 'الكمية المنجَزة',                en: 'Achieved qty' },
  prg_achieved_amount: { ar: 'المبلغ المنجَز',              en: 'Achieved amount' },
  prg_remaining_value: { ar: 'القيمة المتبقية',             en: 'Remaining value' },
  prg_contribution: { ar: 'المساهمة',                       en: 'Contribution' },
  prg_no_contributors: { ar: 'لا نشاط مرتبط بهذا البند — لا يمكن كسب قيمته.',
                         en: 'No activity is linked to this line — its value can never be earned.' },
  prg_unlinked_t:  { ar: '{n} من بنود الكميات غير مرتبطة بأي نشاط',
                     en: '{n} BOQ line(s) are linked to no activity' },
  prg_unlinked_b:  { ar: 'قيمتها لا يمكن كسبها حتى تُربَط في شاشة جدول الكميات.',
                     en: 'Their value can never be earned until they are linked on the BOQ screen.' },

  prg_err_required: { ar: 'أدخل نسبة الإنجاز.',             en: 'Enter a progress percentage.' },
  prg_err_number:  { ar: 'القيمة يجب أن تكون رقماً.',        en: 'The value must be a number.' },
  prg_err_range:   { ar: 'نسبة الإنجاز بين صفر ومئة.',       en: 'Progress is between 0 and 100.' },
  prg_err_milestone: { ar: 'الحَدَث الفارق إمّا متحقق (100) أو غير متحقق (0).',
                       en: 'A milestone is either reached (100) or not (0).' },
  prg_err_save:    { ar: 'تعذّر حفظ الإنجاز.',              en: 'Could not save the progress.' },
  prg_saved_reflected: { ar: 'انعكس على {n} من بنود الكميات',
                         en: 'reflected onto {n} BOQ line(s)' },
  prg_saved_unlinked: { ar: 'حُفظ — لا بند مرتبط به',        en: 'saved — no line is linked to it' },

  // ── SCR-W7 Financials (Phase 4.4) ──────────────────────────────────────
  fin_tab_sheet:   { ar: 'جدول الكلف',                      en: 'Cost sheet' },
  fin_tab_payments: { ar: 'الدفعات',                        en: 'Payments' },
  fin_tab_evm:     { ar: 'المؤشرات',                        en: 'Indices' },

  fin_approved:    { ar: 'الكلفة المقررة',                  en: 'Approved cost' },
  fin_approved_changes: { ar: 'تغييرات معتمدة ومنفَّذة',     en: 'Applied changes' },
  fin_applied_only: { ar: 'المنفَّذة وحدها تدخل الكلفة',     en: 'applied orders only' },
  fin_revised:     { ar: 'الكلفة المعدلة',                  en: 'Revised cost' },
  fin_disbursed:   { ar: 'المصروف',                         en: 'Disbursed' },
  fin_certified_unpaid: { ar: 'مصادق ولم يُصرَف',            en: 'Certified, unpaid' },
  fin_retention:   { ar: 'الضمانات المحتجزة',               en: 'Retention held' },
  fin_advance_out: { ar: 'رصيد السلف',                      en: 'Advance outstanding' },
  fin_balance:     { ar: 'المتبقي',                         en: 'Balance' },
  fin_cost_item:   { ar: 'بند الكلفة',                      en: 'Cost item' },
  fin_total_contracts: { ar: 'إجمالي العقود',               en: 'Total — contracts' },
  fin_total_paid:  { ar: 'الإجمالي المصروف',                en: 'Total disbursed' },
  fin_positions:   { ar: 'المراكز المالية القائمة',          en: 'Outstanding positions' },
  fin_positions_note: { ar: 'الضمانات المحتجزة التزام على الوزارة، ورصيد السلف التزام على المقاول. لا يدخل أيٌّ منهما في «المتبقي»، وكلاهما يُحتسب من الدفعات المصروفة فقط.',
                        en: 'Retention held is owed BY the ministry; the advance balance is owed TO it. Neither is in the balance, and both count paid certificates only.' },

  fin_pending_t:   { ar: 'أوامر معتمدة لم تُنفَّذ بعد',       en: 'Approved orders not yet applied' },
  fin_pending_b:   { ar: 'الاعتماد لا يغيّر شيئاً — هذه القيمة ليست في أي من المجاميع أعلاه:',
                     en: 'Approving changes nothing — this figure is in none of the totals above:' },

  fin_col_no:      { ar: 'المستخلص',                        en: 'Cert.' },
  fin_col_kind:    { ar: 'النوع',                           en: 'Kind' },
  fin_col_letter:  { ar: 'كتاب التمويل',                    en: 'Finance letter' },
  fin_col_gross:   { ar: 'المصادق عليه',                    en: 'Gross' },
  fin_col_retention: { ar: 'الضمان',                        en: 'Retention' },
  fin_col_recovery: { ar: 'استرداد السلفة',                 en: 'Advance recovery' },
  fin_col_net:     { ar: 'الصافي',                          en: 'Net' },
  fin_col_certified: { ar: 'تاريخ المصادقة',                en: 'Certified' },
  fin_col_paid:    { ar: 'تاريخ الصرف',                     en: 'Paid' },
  fin_unpaid:      { ar: 'لم يُصرَف',                        en: 'not paid' },
  fin_unpaid_t:    { ar: 'مصادق عليه ولم يُصرَف',            en: 'Certified and not yet paid' },
  fin_unpaid_b:    { ar: 'المبلغ مستحق ولم يغادر الخزينة، فلا يدخل المصروف ولا يُحتسب منه ضمان ولا استرداد سلفة.',
                     en: 'The amount is owed and has not left the treasury, so it enters neither the disbursed total nor the retention and advance balances.' },
  fin_note:        { ar: 'ملاحظة',                          en: 'Note' },
  fin_net_note:    { ar: 'الصافي = المصادق عليه − الضمان − استرداد السلفة.',
                     en: 'Net = gross − retention − advance recovery.' },
  fin_evm_note:    { ar: 'الكلفة الفعلية هنا هي المصروف — المدفوع فعلاً، لا المصادق عليه.',
                     en: 'Actual cost here is the disbursed figure — what was paid, not what was certified.' },

  fin_expense_items: { ar: 'بنود الصرف التعاقدية',           en: 'Contract expense items' },
  fin_expense_items_sub: { ar: 'إلى جانب قيمة العقد، لا ضمنها',
                           en: 'beside the contract value, not inside it' },
  fin_expense_items_note: { ar: 'قيمة العقد هي مبلغ الإحالة نفسه (01 §2.3)، فالاحتياط والإشراف مخصصان إضافيان لا جزءان منها — ولذلك لا تُجمَع هذه البنود مع صف العقد. الأمر التغييري المنفَّذ يحرّك الإحالة وحدها.',
                            en: 'The contract value IS the award amount (01 §2.3), so the reserve and the supervision allowance sit beside it rather than inside it — which is why these do not add up to the contract row. An applied change order moves the award alone.' },
  // ── SCR-W8 Change orders — the register (Phase 5.1) ────────────────────
  chg_grp_all:     { ar: 'الكل',                            en: 'All' },
  chg_grp_draft:   { ar: 'مسودة',                           en: 'Draft' },
  chg_grp_pending: { ar: 'قيد الاعتماد',                    en: 'In approval' },
  chg_grp_returned: { ar: 'معاد للتعديل',                   en: 'Returned' },
  chg_grp_applying: { ar: 'معتمد — بانتظار التطبيق',        en: 'Approved — applying' },
  chg_grp_closed:  { ar: 'مطبَّق ومغلق',                     en: 'Applied & closed' },
  chg_grp_rejected: { ar: 'مرفوض',                          en: 'Rejected' },

  // BR-14's five relations (03 §7).
  chg_rel_awaiting: { ar: 'بانتظار إجرائك',                 en: 'Awaiting you' },
  chg_rel_recorder: { ar: 'تسجيل نيابة عن جهة خارجية',      en: 'Record for an external party' },
  chg_rel_acted:   { ar: 'تم إجراؤك',                       en: 'You have acted' },
  chg_rel_upcoming: { ar: 'سيصلك لاحقاً',                   en: 'Reaches you later' },
  chg_rel_none:    { ar: 'للاطلاع',                         en: 'For information' },

  chg_kpi_net:     { ar: 'صافي المعتمد',                    en: 'Net approved' },
  chg_kpi_net_foot: { ar: 'المعتمد وحده — لا المقترح',      en: 'approved only, never proposed' },
  chg_kpi_pending: { ar: 'قيد الاعتماد',                    en: 'In approval' },
  chg_kpi_needs:   { ar: 'تجاوزت السقف الزمني',             en: 'SLA exceeded' },
  chg_kpi_overdue: { ar: 'متأخرة',                          en: 'Overdue' },
  chg_kpi_cycle:   { ar: 'متوسط دورة الاعتماد',             en: 'Avg approval cycle' },

  chg_search:      { ar: 'بحث بالرقم أو السبب أو رقم الوارد…',
                     en: 'Search by number, reason or letter…' },
  chg_f_mine:      { ar: 'بانتظار إجرائي',                  en: 'Awaiting me' },
  chg_f_sla:       { ar: 'تجاوزت السقف',                    en: 'SLA exceeded' },
  chg_f_overdue:   { ar: 'متأخرة',                          en: 'Overdue' },

  chg_awaiting_t:  { ar: '{n} من الأوامر بانتظار إجرائك',    en: '{n} order(s) await your action' },
  chg_awaiting_b:  { ar: 'بصفة',                            en: 'as' },
  chg_awaiting_none_t: { ar: 'لا أوامر بانتظار إجرائك',      en: 'No orders await your action' },

  chg_col_no:      { ar: 'الرمز',                           en: 'Code' },
  chg_col_order:   { ar: 'الأمر التغييري',                  en: 'Change order' },
  chg_col_value:   { ar: 'القيمة',                          en: 'Value' },
  chg_col_days:    { ar: 'المدة',                           en: 'Time' },
  chg_col_status:  { ar: 'الحالة والمرحلة',                 en: 'Status & stage' },
  chg_col_owner:   { ar: 'الجهة المسؤولة',                  en: 'Owner' },
  chg_col_files:   { ar: 'مرفقات',                          en: 'Files' },
  chg_total:       { ar: 'الإجمالي',                        en: 'Total' },
  chg_of:          { ar: 'من',                              en: 'of' },

  chg_approved_fig: { ar: 'معتمد',                          en: 'approved' },
  chg_proposed_fig: { ar: 'مقترح',                          en: 'proposed' },
  chg_approved_note: { ar: 'صافي المعتمد يجمع الأوامر المعتمدة وحدها. الاعتماد لا يغيّر شيئاً في قيمة العقد — التطبيق هو ما ينشئ الملحق ويحرّك الأرقام (02 §9).',
                       en: 'Net approved sums approved orders only. Approving changes nothing in the contract value — applying is what creates the amendment and moves the figures (02 §9).' },

  chg_empty_t:     { ar: 'لا أوامر تغييرية على هذا المشروع',  en: 'No change orders on this project' },
  chg_empty_b:     { ar: 'يُنشأ أمر الغيار بعد ورود طلب الجهة المنفِّذة ورأي الجهة الفنية.',
                     en: 'A change order is raised once the executing party requests it and the technical party has given its opinion.' },
  chg_nomatch_t:   { ar: 'لا أوامر مطابقة للفلاتر',          en: 'No orders match the filters' },
  chg_nomatch_b:   { ar: 'غيّر الحالة أو الصفة، أو امسح الفلاتر لعرض كل الأوامر.',
                     en: 'Change the status or the relation, or clear the filters to see every order.' },

  chg_record_soon_t: { ar: 'صفحة الأمر التغييري تُبنى في المرحلة 5.2',
                       en: 'The order record is built in Phase 5.2' },
  chg_record_soon_b: { ar: 'هذا السجل للعرض والتصفية فقط في هذه المرحلة؛ القرارات والمسار والمرفقات تأتي مع صفحة الأمر ومحرّك المراحل.',
                       en: 'This register lists and filters only for now; decisions, the workflow and the attachments arrive with the record page and the stage machine.' },

  fin_alloc_t:     { ar: 'التخصيص السنوي غير متوفر',         en: 'The annual allocation is unavailable' },
  fin_sla_t:       { ar: 'مهل التدقيق غير متوفرة',           en: 'The audit SLA is unavailable' },
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
